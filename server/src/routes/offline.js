import express from 'express';
import { body, query, validationResult } from 'express-validator';
import offlineService from '../services/offlineService.js';
import { protect } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

// @desc    Queue action for offline sync
// @route   POST /api/offline/queue
// @access  Private
router.post('/queue',
    protect,
    [
        body('action', 'Action type is required').notEmpty(),
        body('data', 'Action data is required').notEmpty(),
        body('priority', 'Priority must be one of: emergency, high, medium, low')
            .optional().isIn(['emergency', 'high', 'medium', 'low'])
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

            const { action, data, priority = 'medium' } = req.body;

            const actionId = await offlineService.queueAction(
                action,
                data,
                req.user.id,
                priority
            );

            res.status(201).json({
                success: true,
                actionId,
                message: 'Action queued for sync when connectivity is restored'
            });
        } catch (error) {
            logger.error('Error queueing offline action:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to queue action for offline sync'
            });
        }
    }
);

// @desc    Process queued offline actions
// @route   POST /api/offline/sync
// @access  Private
router.post('/sync',
    protect,
    async (req, res) => {
        try {
            const result = await offlineService.processQueuedActions();

            res.json({
                success: true,
                data: result,
                message: `Sync completed: ${result.processed} processed, ${result.failed} failed`
            });
        } catch (error) {
            logger.error('Error processing offline sync:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to process offline sync'
            });
        }
    }
);

// @desc    Get essential data for offline use
// @route   GET /api/offline/essentials
// @access  Private
router.get('/essentials',
    protect,
    [
        query('province', 'Province must be a string').optional().isString(),
        query('district', 'District must be a string').optional().isString(),
        query('latitude', 'Latitude must be a valid number').optional().isFloat({ min: -90, max: 90 }),
        query('longitude', 'Longitude must be a valid number').optional().isFloat({ min: -180, max: 180 }),
        query('lastSync', 'Last sync must be a valid ISO date').optional().isISO8601()
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

            const { province, district, latitude, longitude, lastSync } = req.query;

            const userLocation = province || latitude ? {
                province,
                district,
                coordinates: latitude && longitude ? {
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude)
                } : null
            } : null;

            const essentials = await offlineService.getOfflineEssentials(
                userLocation,
                lastSync
            );

            // Set appropriate cache headers for offline data
            res.set({
                'Cache-Control': 'public, max-age=300', // 5 minutes
                'ETag': `"${essentials.syncTimestamp.getTime()}"`
            });

            res.json({
                success: true,
                data: essentials
            });
        } catch (error) {
            logger.error('Error fetching offline essentials:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch offline essentials'
            });
        }
    }
);

// @desc    Get offline/sync status
// @route   GET /api/offline/status
// @access  Private
router.get('/status',
    protect,
    async (req, res) => {
        try {
            const status = await offlineService.getOfflineStatus();

            res.json({
                success: true,
                data: status
            });
        } catch (error) {
            logger.error('Error fetching offline status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch offline status'
            });
        }
    }
);

// @desc    Clear sync history
// @route   DELETE /api/offline/history
// @access  Private
router.delete('/history',
    protect,
    async (req, res) => {
        try {
            const result = await offlineService.clearSyncHistory();

            res.json({
                success: true,
                data: result,
                message: `Cleared ${result.cleared} sync history items`
            });
        } catch (error) {
            logger.error('Error clearing sync history:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to clear sync history'
            });
        }
    }
);

// @desc    Emergency SOS (works offline)
// @route   POST /api/offline/emergency
// @access  Private
router.post('/emergency',
    protect,
    [
        body('message', 'Emergency message is required').notEmpty(),
        body('location', 'Location description is required').optional().isString(),
        body('coordinates.latitude', 'Valid latitude required').optional().isFloat({ min: -90, max: 90 }),
        body('coordinates.longitude', 'Valid longitude required').optional().isFloat({ min: -180, max: 180 })
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

            const { message, location, coordinates, province, district } = req.body;
            
            const sosData = {
                message,
                location,
                coordinates,
                province,
                district,
                originalTimestamp: new Date()
            };

            // Try to process immediately, if fails queue for offline sync
            try {
                const alert = await offlineService.syncEmergencyAlert(sosData, req.user.id);
                
                // Emit real-time SOS alert if connected
                const io = req.app.get('io');
                if (io) {
                    io.to('disaster-monitoring').emit('emergency-sos', {
                        alert,
                        user: req.user,
                        timestamp: new Date()
                    });
                }

                res.status(201).json({
                    success: true,
                    data: alert,
                    message: 'Emergency SOS sent successfully'
                });
            } catch (syncError) {
                // If immediate sync fails, queue for later
                const actionId = await offlineService.queueAction(
                    'emergency-sos',
                    sosData,
                    req.user.id,
                    'emergency'
                );

                res.status(202).json({
                    success: true,
                    actionId,
                    message: 'Emergency SOS queued - will be sent when connectivity is restored'
                });
            }
        } catch (error) {
            logger.error('Error processing emergency SOS:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to process emergency SOS'
            });
        }
    }
);

// @desc    Create offline disaster report
// @route   POST /api/offline/disaster-report
// @access  Private
router.post('/disaster-report',
    protect,
    [
        body('title', 'Title is required').notEmpty(),
        body('description', 'Description is required').notEmpty(),
        body('type', 'Disaster type is required').notEmpty(),
        body('severity', 'Severity is required').isIn(['Critical', 'High', 'Medium', 'Low']),
        body('location.province', 'Province is required').notEmpty(),
        body('location.district', 'District is required').notEmpty()
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

            const reportData = {
                ...req.body,
                originalTimestamp: new Date()
            };

            // Try to create immediately, if fails queue for offline sync
            try {
                const disaster = await offlineService.syncDisasterReport(reportData, req.user.id);

                // Emit real-time update if connected
                const io = req.app.get('io');
                if (io) {
                    io.to('disaster-monitoring').emit('new-disaster', disaster);
                }

                res.status(201).json({
                    success: true,
                    data: disaster,
                    message: 'Disaster report created successfully'
                });
            } catch (syncError) {
                // If immediate sync fails, queue for later
                const actionId = await offlineService.queueAction(
                    'create-disaster-report',
                    reportData,
                    req.user.id,
                    reportData.severity === 'Critical' ? 'emergency' : 'high'
                );

                res.status(202).json({
                    success: true,
                    actionId,
                    message: 'Disaster report queued - will be created when connectivity is restored'
                });
            }
        } catch (error) {
            logger.error('Error creating offline disaster report:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create disaster report'
            });
        }
    }
);

// @desc    PWA manifest
// @route   GET /api/offline/manifest
// @access  Public
router.get('/manifest', (req, res) => {
    const manifest = {
        name: 'Nepal Disaster Response Hub',
        short_name: 'DisasterHub',
        description: 'Emergency disaster response and management system for Nepal',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#dc2626',
        orientation: 'portrait-primary',
        icons: [
            {
                src: '/icons/icon-72x72.png',
                sizes: '72x72',
                type: 'image/png',
                purpose: 'maskable any'
            },
            {
                src: '/icons/icon-96x96.png',
                sizes: '96x96',
                type: 'image/png',
                purpose: 'maskable any'
            },
            {
                src: '/icons/icon-128x128.png',
                sizes: '128x128',
                type: 'image/png',
                purpose: 'maskable any'
            },
            {
                src: '/icons/icon-144x144.png',
                sizes: '144x144',
                type: 'image/png',
                purpose: 'maskable any'
            },
            {
                src: '/icons/icon-152x152.png',
                sizes: '152x152',
                type: 'image/png',
                purpose: 'maskable any'
            },
            {
                src: '/icons/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable any'
            },
            {
                src: '/icons/icon-384x384.png',
                sizes: '384x384',
                type: 'image/png',
                purpose: 'maskable any'
            },
            {
                src: '/icons/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable any'
            }
        ],
        categories: ['utilities', 'government', 'emergency'],
        lang: 'en',
        dir: 'ltr',
        prefer_related_applications: false
    };

    res.set('Content-Type', 'application/manifest+json');
    res.json(manifest);
});

// @desc    Service worker registration info
// @route   GET /api/offline/sw-info
// @access  Public
router.get('/sw-info', (req, res) => {
    const swInfo = {
        swUrl: '/sw.js',
        swScope: '/',
        updateInterval: 300000, // 5 minutes
        cacheVersion: 'v1',
        offlinePages: [
            '/',
            '/dashboard',
            '/disasters',
            '/alerts',
            '/resources',
            '/emergency-contacts'
        ],
        apiEndpoints: {
            essentials: '/api/offline/essentials',
            sync: '/api/offline/sync',
            status: '/api/offline/status',
            emergency: '/api/offline/emergency'
        }
    };

    res.json({
        success: true,
        data: swInfo
    });
});

export default router;
