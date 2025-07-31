import express from 'express';
import Disaster from '../models/Disaster.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/disasters
// @desc    Get all disasters
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const disasters = await Disaster.find().sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            count: disasters.length,
            data: disasters
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
});

// @route   POST /api/disasters
// @desc    Create a new disaster
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const disaster = await Disaster.create(req.body);
        
        // Emit real-time update
        const io = req.app.get('io');
        io.to('disaster-monitoring').emit('new-disaster', disaster);
        
        res.status(201).json({
            success: true,
            data: disaster
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
});

// @route   GET /api/disasters/:id
// @desc    Get single disaster
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const disaster = await Disaster.findById(req.params.id);
        
        if (!disaster) {
            return res.status(404).json({
                success: false,
                message: 'Disaster not found'
            });
        }
        
        res.status(200).json({
            success: true,
            data: disaster
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
});

export default router;
