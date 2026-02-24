import express from 'express';
import multer from 'multer';
import { body, query, validationResult } from 'express-validator';
import disasterReportingService from '../services/disasterReportingService.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import logger from '../config/logger.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
        files: 10 // Maximum 10 files
    },
    fileFilter: (req, file, cb) => {
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// @desc    Create new disaster report
// @route   POST /api/disasters
// @access  Private
router.post('/',
    protect,
    upload.array('images', 10),
    [
        body('title', 'Title is required and must be at least 10 characters').isLength({ min: 10 }),
        body('description', 'Description is required and must be at least 20 characters').isLength({ min: 20 }),
        body('type', 'Valid disaster type is required').isIn(['Earthquake', 'Flood', 'Landslide', 'Fire', 'Drought', 'Cyclone', 'Avalanche', 'Epidemic', 'Industrial Accident', 'Other']),
        body('severity', 'Valid severity level is required').isIn(['Critical', 'High', 'Medium', 'Low']),
        body('location.province', 'Province is required').notEmpty(),
        body('location.district', 'District is required').notEmpty(),
        body('location.coordinates.latitude', 'Valid latitude is required').isFloat({ min: -90, max: 90 }),
        body('location.coordinates.longitude', 'Valid longitude is required').isFloat({ min: -180, max: 180 }),
        body('affected.totalAffected', 'Total affected must be a non-negative number').isInt({ min: 0 })
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const reportData = req.body;
            const files = req.files;

            const disaster = await disasterReportingService.createDisasterReport(
                reportData,
                files,
                req.user.id
            );

            // Emit real-time update
            const io = req.app.get('io');
            if (io) {
                io.to('disaster-monitoring').emit('new-disaster', disaster);
            }

            res.status(201).json({
                success: true,
                data: disaster
            });
        } catch (error) {
            logger.error('Error creating disaster report:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to create disaster report'
            });
        }
    }
);

// @desc    Get all disaster reports with filters
// @route   GET /api/disasters
// @access  Private
router.get('/',
    protect,
    [
        query('type', 'Invalid disaster type').optional().isIn(['Earthquake', 'Flood', 'Landslide', 'Fire', 'Drought', 'Cyclone', 'Avalanche', 'Epidemic', 'Industrial Accident', 'Other']),
        query('severity', 'Invalid severity level').optional().isIn(['Critical', 'High', 'Medium', 'Low']),
        query('status', 'Invalid status').optional().isIn(['Ongoing', 'Monitoring', 'Resolved', 'Under Investigation']),
        query('isVerified', 'isVerified must be boolean').optional().isBoolean(),
        query('page', 'Page must be a positive integer').optional().isInt({ min: 1 }),
        query('limit', 'Limit must be between 1 and 100').optional().isInt({ min: 1, max: 100 }),
        query('latitude', 'Invalid latitude').optional().isFloat({ min: -90, max: 90 }),
        query('longitude', 'Invalid longitude').optional().isFloat({ min: -180, max: 180 }),
        query('radius', 'Radius must be a positive number').optional().isFloat({ min: 0 })
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const {
                type,
                severity,
                status,
                province,
                district,
                isVerified,
                dateFrom,
                dateTo,
                search,
                latitude,
                longitude,
                radius,
                page = 1,
                limit = 20,
                sortBy = 'reportedAt',
                sortOrder = 'desc'
            } = req.query;

            const filters = {
                type,
                severity,
                status,
                province,
                district,
                isVerified: isVerified ? JSON.parse(isVerified) : undefined,
                dateFrom,
                dateTo,
                search
            };

            // Add geolocation filter if coordinates provided
            if (latitude && longitude) {
                filters.nearLocation = {
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude)
                };
                if (radius) filters.radius = parseFloat(radius);
            }

            const pagination = {
                page: parseInt(page),
                limit: parseInt(limit),
                sortBy,
                sortOrder
            };

            const result = await disasterReportingService.getDisasterReports(filters, pagination);

            res.json({
                success: true,
                count: result.disasters.length,
                pagination: result.pagination,
                filters: result.filters,
                data: result.disasters
            });
        } catch (error) {
            logger.error('Error fetching disaster reports:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch disaster reports'
            });
        }
    }
);

// @desc    Get single disaster report
// @route   GET /api/disasters/:id
// @access  Private
router.get('/:id',
    protect,
    async (req, res) => {
        try {
            const disaster = await disasterReportingService.getDisasterReport(req.params.id);

            res.json({
                success: true,
                data: disaster
            });
        } catch (error) {
            logger.error('Error fetching disaster report:', error);
            const statusCode = error.message === 'Disaster report not found' ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to fetch disaster report'
            });
        }
    }
);

// @desc    Update disaster report
// @route   PUT /api/disasters/:id
// @access  Private (Creator, Admin, Coordinator)
router.put('/:id',
    protect,
    upload.array('images', 10),
    [
        body('title', 'Title must be at least 10 characters').optional().isLength({ min: 10 }),
        body('description', 'Description must be at least 20 characters').optional().isLength({ min: 20 }),
        body('type', 'Invalid disaster type').optional().isIn(['Earthquake', 'Flood', 'Landslide', 'Fire', 'Drought', 'Cyclone', 'Avalanche', 'Epidemic', 'Industrial Accident', 'Other']),
        body('severity', 'Invalid severity level').optional().isIn(['Critical', 'High', 'Medium', 'Low']),
        body('status', 'Invalid status').optional().isIn(['Ongoing', 'Monitoring', 'Resolved', 'Under Investigation']),
        body('affected.totalAffected', 'Total affected must be a non-negative number').optional().isInt({ min: 0 })
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const updateData = req.body;
            const files = req.files;

            const disaster = await disasterReportingService.updateDisasterReport(
                req.params.id,
                updateData,
                files,
                req.user.id,
                req.user.role
            );

            // Emit real-time update
            const io = req.app.get('io');
            if (io) {
                io.to('disaster-monitoring').emit('disaster-updated', disaster);
            }

            res.json({
                success: true,
                data: disaster
            });
        } catch (error) {
            logger.error('Error updating disaster report:', error);
            const statusCode = error.message.includes('not found') ? 404 :
                               error.message.includes('Unauthorized') ? 403 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to update disaster report'
            });
        }
    }
);

// @desc    Verify disaster report
// @route   POST /api/disasters/:id/verify
// @access  Private (Admin, Coordinator)
router.post('/:id/verify',
    protect,
    authorize('admin', 'coordinator'),
    [
        body('isVerified', 'Verification status is required').isBoolean(),
        body('notes', 'Verification notes are required').notEmpty()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { isVerified, notes } = req.body;
            
            const disaster = await disasterReportingService.verifyDisasterReport(
                req.params.id,
                req.user.id,
                { isVerified, notes }
            );

            // Emit real-time update
            const io = req.app.get('io');
            if (io) {
                io.to('disaster-monitoring').emit('disaster-verified', disaster);
            }

            res.json({
                success: true,
                data: disaster
            });
        } catch (error) {
            logger.error('Error verifying disaster report:', error);
            const statusCode = error.message === 'Disaster report not found' ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to verify disaster report'
            });
        }
    }
);

// @desc    Assign response teams
// @route   POST /api/disasters/:id/assign-teams
// @access  Private (Admin, Coordinator)
router.post('/:id/assign-teams',
    protect,
    authorize('admin', 'coordinator'),
    [
        body('teamMemberIds', 'Team member IDs are required').isArray({ min: 1 }),
        body('teamMemberIds.*', 'Invalid team member ID').isMongoId()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { teamMemberIds } = req.body;
            
            const disaster = await disasterReportingService.assignResponseTeams(
                req.params.id,
                teamMemberIds,
                req.user.id
            );

            // Emit real-time update
            const io = req.app.get('io');
            if (io) {
                io.to('disaster-monitoring').emit('teams-assigned', disaster);
            }

            res.json({
                success: true,
                data: disaster
            });
        } catch (error) {
            logger.error('Error assigning response teams:', error);
            const statusCode = error.message === 'Disaster report not found' ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to assign response teams'
            });
        }
    }
);

// @desc    Add update/comment to disaster report
// @route   POST /api/disasters/:id/updates
// @access  Private
router.post('/:id/updates',
    protect,
    [
        body('message', 'Update message is required').notEmpty(),
        body('priority', 'Invalid priority level').optional().isIn(['Critical', 'High', 'Medium', 'Low'])
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { message, priority } = req.body;
            
            const disaster = await disasterReportingService.addDisasterUpdate(
                req.params.id,
                { message, priority },
                req.user.id
            );

            // Emit real-time update
            const io = req.app.get('io');
            if (io) {
                io.to('disaster-monitoring').emit('disaster-update-added', disaster);
            }

            res.json({
                success: true,
                data: disaster
            });
        } catch (error) {
            logger.error('Error adding disaster update:', error);
            const statusCode = error.message === 'Disaster report not found' ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to add disaster update'
            });
        }
    }
);

// Error handling middleware for multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 5MB per file.'
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files. Maximum 10 files allowed.'
            });
        }
    }
    if (error.message === 'Only image files are allowed') {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
    next(error);
});

export default router;
