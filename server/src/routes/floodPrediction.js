import express from 'express';
import { body, query, validationResult } from 'express-validator';
import FloodPrediction from '../models/FloodPrediction.js';
import floodPredictionService from '../services/floodPredictionService.js';
import weatherService from '../services/weatherService.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import logger from '../config/logger.js';

const router = express.Router();

// @desc    Generate flood prediction for a location
// @route   POST /api/flood-prediction/generate
// @access  Private (Admin, Coordinator)
router.post('/generate', 
    protect,
    authorize('admin', 'coordinator'),
    [
        body('location.province', 'Province is required').notEmpty(),
        body('location.district', 'District is required').notEmpty(),
        body('location.coordinates.latitude', 'Latitude must be a valid number')
            .optional().isFloat({ min: -90, max: 90 }),
        body('location.coordinates.longitude', 'Longitude must be a valid number')
            .optional().isFloat({ min: -180, max: 180 })
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

            const { location } = req.body;

            // Get current weather data for the location
            let weatherData;
            try {
                weatherData = await weatherService.getCurrentWeather(location);
            } catch (error) {
                logger.warn('Failed to fetch live weather data, using mock data');
                weatherData = weatherService.getMockWeatherData(location);
            }

            // Generate flood prediction
            const prediction = await floodPredictionService.generatePrediction(
                location,
                weatherData,
                req.user.id
            );

            res.status(201).json({
                success: true,
                data: prediction
            });
        } catch (error) {
            logger.error('Error generating flood prediction:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate flood prediction',
                error: error.message
            });
        }
    }
);

// @desc    Generate batch predictions for all high-risk areas
// @route   POST /api/flood-prediction/batch-generate
// @access  Private (Admin only)
router.post('/batch-generate',
    protect,
    authorize('admin'),
    async (req, res) => {
        try {
            const predictions = await floodPredictionService.generateBatchPredictions(req.user.id);

            res.status(201).json({
                success: true,
                count: predictions.length,
                data: predictions
            });
        } catch (error) {
            logger.error('Error generating batch predictions:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate batch predictions',
                error: error.message
            });
        }
    }
);

// @desc    Get all flood predictions
// @route   GET /api/flood-prediction
// @access  Private
router.get('/',
    protect,
    [
        query('province', 'Province must be a string').optional().isString(),
        query('district', 'District must be a string').optional().isString(),
        query('riskLevel', 'Risk level must be one of: Minimal, Low, Medium, High, Critical')
            .optional().isIn(['Minimal', 'Low', 'Medium', 'High', 'Critical']),
        query('limit', 'Limit must be a positive integer').optional().isInt({ min: 1, max: 100 }),
        query('page', 'Page must be a positive integer').optional().isInt({ min: 1 })
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
                province,
                district,
                riskLevel,
                limit = 20,
                page = 1
            } = req.query;

            // Build filter object
            const filter = {};
            if (province) filter['location.province'] = new RegExp(province, 'i');
            if (district) filter['location.district'] = new RegExp(district, 'i');
            if (riskLevel) filter.riskLevel = riskLevel;

            // Add date filter to show only recent predictions (last 7 days)
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            filter.createdAt = { $gte: sevenDaysAgo };

            const skip = (page - 1) * limit;

            const predictions = await FloodPrediction.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('createdBy', 'name organization')
                .select('-__v');

            const total = await FloodPrediction.countDocuments(filter);

            res.json({
                success: true,
                count: predictions.length,
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit),
                data: predictions
            });
        } catch (error) {
            logger.error('Error fetching flood predictions:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch flood predictions'
            });
        }
    }
);

// @desc    Get single flood prediction
// @route   GET /api/flood-prediction/:id
// @access  Private
router.get('/:id',
    protect,
    async (req, res) => {
        try {
            const prediction = await FloodPrediction.findById(req.params.id)
                .populate('createdBy', 'name organization email phone')
                .select('-__v');

            if (!prediction) {
                return res.status(404).json({
                    success: false,
                    message: 'Flood prediction not found'
                });
            }

            res.json({
                success: true,
                data: prediction
            });
        } catch (error) {
            logger.error('Error fetching flood prediction:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch flood prediction'
            });
        }
    }
);

// @desc    Get flood predictions for specific location
// @route   GET /api/flood-prediction/location/:province/:district
// @access  Private
router.get('/location/:province/:district',
    protect,
    [
        query('limit', 'Limit must be a positive integer').optional().isInt({ min: 1, max: 50 })
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

            const { province, district } = req.params;
            const limit = parseInt(req.query.limit) || 10;

            const location = { province, district };
            const predictions = await floodPredictionService.getLocationPredictions(location, limit);

            // Get current risk statistics
            const stats = {
                total: predictions.length,
                byRiskLevel: {
                    Critical: predictions.filter(p => p.riskLevel === 'Critical').length,
                    High: predictions.filter(p => p.riskLevel === 'High').length,
                    Medium: predictions.filter(p => p.riskLevel === 'Medium').length,
                    Low: predictions.filter(p => p.riskLevel === 'Low').length,
                    Minimal: predictions.filter(p => p.riskLevel === 'Minimal').length
                }
            };

            res.json({
                success: true,
                location: { province, district },
                stats,
                count: predictions.length,
                data: predictions
            });
        } catch (error) {
            logger.error('Error fetching location predictions:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch location predictions'
            });
        }
    }
);

// @desc    Get flood prediction analytics
// @route   GET /api/flood-prediction/analytics
// @access  Private (Admin, Coordinator)
router.get('/analytics/overview',
    protect,
    authorize('admin', 'coordinator'),
    async (req, res) => {
        try {
            // Get predictions from last 30 days
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            
            const totalPredictions = await FloodPrediction.countDocuments({
                createdAt: { $gte: thirtyDaysAgo }
            });

            // Risk level distribution
            const riskDistribution = await FloodPrediction.aggregate([
                { $match: { createdAt: { $gte: thirtyDaysAgo } } },
                { $group: { _id: '$riskLevel', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]);

            // Predictions by location (top 10)
            const locationStats = await FloodPrediction.aggregate([
                { $match: { createdAt: { $gte: thirtyDaysAgo } } },
                {
                    $group: {
                        _id: { province: '$location.province', district: '$location.district' },
                        count: { $sum: 1 },
                        avgRiskScore: { $avg: '$riskScore' },
                        maxRiskScore: { $max: '$riskScore' }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]);

            // High-risk areas (predictions with score >= 0.6)
            const highRiskAreas = await FloodPrediction.find({
                createdAt: { $gte: thirtyDaysAgo },
                riskScore: { $gte: 0.6 }
            })
            .select('location riskScore riskLevel createdAt')
            .sort({ riskScore: -1 })
            .limit(10);

            // Prediction accuracy trends (simplified)
            const accuracyTrends = await FloodPrediction.aggregate([
                { $match: { createdAt: { $gte: thirtyDaysAgo } } },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' },
                            day: { $dayOfMonth: '$createdAt' }
                        },
                        avgConfidence: { $avg: '$confidence' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
            ]);

            res.json({
                success: true,
                data: {
                    summary: {
                        totalPredictions,
                        period: '30 days',
                        generatedAt: new Date()
                    },
                    riskDistribution,
                    locationStats,
                    highRiskAreas,
                    accuracyTrends
                }
            });
        } catch (error) {
            logger.error('Error fetching prediction analytics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch prediction analytics'
            });
        }
    }
);

// @desc    Delete flood prediction
// @route   DELETE /api/flood-prediction/:id
// @access  Private (Admin only)
router.delete('/:id',
    protect,
    authorize('admin'),
    async (req, res) => {
        try {
            const prediction = await FloodPrediction.findById(req.params.id);

            if (!prediction) {
                return res.status(404).json({
                    success: false,
                    message: 'Flood prediction not found'
                });
            }

            await prediction.deleteOne();

            res.json({
                success: true,
                message: 'Flood prediction deleted successfully'
            });
        } catch (error) {
            logger.error('Error deleting flood prediction:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete flood prediction'
            });
        }
    }
);

// @desc    Update flood prediction status or notes
// @route   PUT /api/flood-prediction/:id
// @access  Private (Admin, Coordinator)
router.put('/:id',
    protect,
    authorize('admin', 'coordinator'),
    [
        body('status', 'Status must be one of: Active, Verified, Invalidated')
            .optional().isIn(['Active', 'Verified', 'Invalidated']),
        body('notes', 'Notes must be a string').optional().isString(),
        body('actualOutcome', 'Actual outcome must be a string').optional().isString()
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

            const prediction = await FloodPrediction.findById(req.params.id);

            if (!prediction) {
                return res.status(404).json({
                    success: false,
                    message: 'Flood prediction not found'
                });
            }

            // Update allowed fields
            const { status, notes, actualOutcome } = req.body;
            
            if (status) prediction.status = status;
            if (notes) prediction.notes = notes;
            if (actualOutcome) prediction.actualOutcome = actualOutcome;
            
            prediction.updatedBy = req.user.id;
            prediction.updatedAt = new Date();

            await prediction.save();

            res.json({
                success: true,
                data: prediction
            });
        } catch (error) {
            logger.error('Error updating flood prediction:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update flood prediction'
            });
        }
    }
);

export default router;
