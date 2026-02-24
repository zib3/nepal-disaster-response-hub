import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import NewsArticle from '../models/NewsArticle.js';
import ResourceRequest from '../models/ResourceRequest.js';
import EmergencyContact from '../models/EmergencyContact.js';
import Disaster from '../models/Disaster.js';
import Alert from '../models/Alert.js';

const router = express.Router();

// @desc    Health check endpoint
// @route   GET /api/health
// @access  Public
router.get('/', async (req, res) => {
    try {
        // Check database connection
        const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
        
        // Get collection counts
        const stats = {
            users: await User.countDocuments(),
            disasters: await Disaster.countDocuments(),
            alerts: await Alert.countDocuments(),
            news: await NewsArticle.countDocuments(),
            resources: await ResourceRequest.countDocuments(),
            emergencyContacts: await EmergencyContact.countDocuments()
        };

        // System info
        const systemInfo = {
            environment: process.env.NODE_ENV || 'development',
            nodeVersion: process.version,
            uptime: `${Math.floor(process.uptime())} seconds`,
            memory: {
                used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
                total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`
            }
        };

        res.status(200).json({
            success: true,
            status: 'Healthy',
            timestamp: new Date().toISOString(),
            database: {
                status: dbStatus,
                name: process.env.MONGODB_URI ? 'MongoDB' : 'Unknown'
            },
            collections: stats,
            system: systemInfo,
            endpoints: {
                auth: '/api/auth',
                news: '/api/news',
                disasters: '/api/disasters',
                alerts: '/api/alerts',
                resources: '/api/resources',
                emergencyContacts: '/api/emergency-contacts',
                stats: '/api/stats',
                users: '/api/users'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            status: 'Unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// @desc    Quick API test endpoint
// @route   GET /api/health/test
// @access  Public
router.get('/test', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Nepal Disaster Response API is working!',
        timestamp: new Date().toISOString(),
        server: 'Express.js',
        version: process.env.npm_package_version || '1.0.0'
    });
});

export default router;
