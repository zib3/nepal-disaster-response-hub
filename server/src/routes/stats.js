import express from 'express';
import { getDashboardStats, getDisastersByType } from '../controllers/statsController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/stats/dashboard
// @desc    Get dashboard statistics
// @access  Private
router.get('/dashboard', auth, getDashboardStats);

// @route   GET /api/stats/disasters-by-type
// @desc    Get disaster statistics by type
// @access  Private
router.get('/disasters-by-type', auth, getDisastersByType);

export default router;
