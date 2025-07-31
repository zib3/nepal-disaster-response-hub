import express from 'express';
import Alert from '../models/Alert.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/alerts
// @desc    Get all alerts
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const alerts = await Alert.find()
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            count: alerts.length,
            data: alerts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
});

// @route   POST /api/alerts
// @desc    Create a new alert
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const alertData = {
            ...req.body,
            createdBy: req.user.id
        };
        
        const alert = await Alert.create(alertData);
        
        // Emit real-time update
        const io = req.app.get('io');
        io.to('disaster-monitoring').emit('new-alert', alert);
        
        res.status(201).json({
            success: true,
            data: alert
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
});

// @route   GET /api/alerts/recent
// @desc    Get recent alerts
// @access  Private
router.get('/recent', auth, async (req, res) => {
    try {
        const alerts = await Alert.find()
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 })
            .limit(10);
        
        // Transform data to match client expectations
        const transformedAlerts = alerts.map(alert => ({
            id: alert._id,
            type: alert.type,
            location: alert.location,
            time: getTimeAgo(alert.createdAt),
            severity: alert.severity,
            affected: alert.affected,
            status: alert.status
        }));
        
        res.status(200).json({
            success: true,
            data: transformedAlerts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
});

// Helper function to get time ago
function getTimeAgo(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 60) {
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else {
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
}

export default router;
