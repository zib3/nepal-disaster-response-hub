import express from 'express';
import chatbotService from '../services/chatbotService.js';
import ChatConversation from '../models/ChatConversation.js';
import auth from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import logger from '../config/logger.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// @route   POST /api/chatbot/message
// @desc    Send message to chatbot and get response
// @access  Public (for emergency access, but can be authenticated)
router.post('/message', [
    body('message').notEmpty().withMessage('Message is required'),
    body('sessionId').notEmpty().withMessage('Session ID is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { message, sessionId, location } = req.body;
        
        // Extract user info if authenticated
        const userInfo = {
            userId: req.user?._id || null,
            location: location || null
        };

        const response = await chatbotService.processMessage(sessionId, message, userInfo);
        
        // Emit real-time update if critical emergency
        if (response.urgency === 'critical' && req.app.get('io')) {
            const io = req.app.get('io');
            io.to('role-admin').emit('emergency-alert', {
                sessionId,
                message,
                response,
                timestamp: new Date()
            });
        }

        res.status(200).json({
            success: true,
            data: response
        });

    } catch (error) {
        logger.error('Error processing chatbot message:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error processing your message',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @route   GET /api/chatbot/conversation/:sessionId
// @desc    Get conversation history
// @access  Public (emergency access)
router.get('/conversation/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { limit = 50 } = req.query;
        
        const history = await chatbotService.getConversationHistory(sessionId, parseInt(limit));
        
        res.status(200).json({
            success: true,
            sessionId,
            count: history.length,
            data: history
        });
    } catch (error) {
        logger.error('Error fetching conversation history:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching conversation history',
            error: error.message
        });
    }
});

// @route   POST /api/chatbot/feedback
// @desc    Submit feedback on chatbot response
// @access  Public
router.post('/feedback', [
    body('sessionId').notEmpty().withMessage('Session ID is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { sessionId, rating, comments } = req.body;
        
        await ChatConversation.findOneAndUpdate(
            { sessionId },
            {
                'analytics.satisfactionRating': rating,
                'analytics.resolvedSuccessfully': rating >= 4,
                $push: {
                    'context.feedback': {
                        rating,
                        comments: comments || '',
                        timestamp: new Date()
                    }
                }
            }
        );
        
        res.status(200).json({
            success: true,
            message: 'Thank you for your feedback!'
        });
    } catch (error) {
        logger.error('Error submitting chatbot feedback:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error submitting feedback',
            error: error.message
        });
    }
});

// @route   GET /api/chatbot/active-emergencies
// @desc    Get active emergency conversations (Admin/Responder only)
// @access  Private
router.get('/active-emergencies', auth, authorize(['admin', 'coordinator', 'responder']), async (req, res) => {
    try {
        const { urgencyLevel, limit = 50 } = req.query;
        
        let query = {
            status: 'active',
            'context.escalatedToHuman': false
        };
        
        if (urgencyLevel) {
            query['userInfo.urgencyLevel'] = urgencyLevel;
        } else {
            query['userInfo.urgencyLevel'] = { $in: ['high', 'critical'] };
        }
        
        const emergencies = await ChatConversation.find(query)
            .select('sessionId userInfo context analytics createdAt updatedAt')
            .sort({ 'userInfo.urgencyLevel': -1, updatedAt: -1 })
            .limit(parseInt(limit));
        
        res.status(200).json({
            success: true,
            count: emergencies.length,
            data: emergencies
        });
    } catch (error) {
        logger.error('Error fetching active emergencies:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching active emergencies',
            error: error.message
        });
    }
});

// @route   PUT /api/chatbot/conversation/:sessionId/escalate
// @desc    Escalate conversation to human responder
// @access  Private (Admin/Coordinator)
router.put('/conversation/:sessionId/escalate', auth, authorize(['admin', 'coordinator']), async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { assignedTo, notes } = req.body;
        
        const conversation = await ChatConversation.findOneAndUpdate(
            { sessionId },
            {
                'context.escalatedToHuman': true,
                'context.assignedTo': assignedTo || req.user._id,
                'context.escalationNotes': notes || '',
                'context.escalatedAt': new Date(),
                'context.escalatedBy': req.user._id,
                status: 'escalated'
            },
            { new: true }
        );
        
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found'
            });
        }
        
        // Emit real-time notification
        if (req.app.get('io')) {
            const io = req.app.get('io');
            io.to(`user-${assignedTo || req.user._id}`).emit('conversation-escalated', {
                sessionId,
                escalatedBy: req.user.name,
                urgency: conversation.userInfo.urgencyLevel,
                timestamp: new Date()
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Conversation escalated successfully',
            data: conversation
        });
    } catch (error) {
        logger.error('Error escalating conversation:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error escalating conversation',
            error: error.message
        });
    }
});

// @route   GET /api/chatbot/analytics
// @desc    Get chatbot usage analytics
// @access  Private (Admin only)
router.get('/analytics', auth, authorize(['admin']), async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));
        
        const totalConversations = await ChatConversation.countDocuments({
            createdAt: { $gte: startDate }
        });
        
        const completedConversations = await ChatConversation.countDocuments({
            createdAt: { $gte: startDate },
            status: 'completed'
        });
        
        const escalatedConversations = await ChatConversation.countDocuments({
            createdAt: { $gte: startDate },
            'context.escalatedToHuman': true
        });
        
        const urgencyDistribution = await ChatConversation.aggregate([
            {
                $match: { createdAt: { $gte: startDate } }
            },
            {
                $group: {
                    _id: '$userInfo.urgencyLevel',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        const averageMessages = await ChatConversation.aggregate([
            {
                $match: { createdAt: { $gte: startDate } }
            },
            {
                $group: {
                    _id: null,
                    avgMessages: { $avg: '$analytics.totalMessages' },
                    avgResponseTime: { $avg: '$analytics.averageResponseTime' }
                }
            }
        ]);
        
        const satisfactionRatings = await ChatConversation.aggregate([
            {
                $match: { 
                    createdAt: { $gte: startDate },
                    'analytics.satisfactionRating': { $exists: true }
                }
            },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: '$analytics.satisfactionRating' },
                    totalRatings: { $sum: 1 }
                }
            }
        ]);
        
        const analytics = {
            totalConversations,
            completedConversations,
            escalatedConversations,
            completionRate: totalConversations > 0 ? (completedConversations / totalConversations * 100).toFixed(2) : 0,
            escalationRate: totalConversations > 0 ? (escalatedConversations / totalConversations * 100).toFixed(2) : 0,
            urgencyDistribution: urgencyDistribution.reduce((acc, item) => {
                acc[item._id || 'unknown'] = item.count;
                return acc;
            }, {}),
            averageMessages: averageMessages[0]?.avgMessages || 0,
            averageResponseTime: averageMessages[0]?.avgResponseTime || 0,
            satisfaction: {
                averageRating: satisfactionRatings[0]?.avgRating || 0,
                totalRatings: satisfactionRatings[0]?.totalRatings || 0
            },
            period: `${days} days`
        };
        
        res.status(200).json({
            success: true,
            data: analytics
        });
    } catch (error) {
        logger.error('Error fetching chatbot analytics:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching analytics',
            error: error.message
        });
    }
});

// @route   POST /api/chatbot/session/start
// @desc    Start a new chatbot session
// @access  Public
router.post('/session/start', async (req, res) => {
    try {
        const { userAgent, location } = req.body;
        
        // Generate unique session ID
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create initial conversation
        const conversation = await chatbotService.getOrCreateConversation(sessionId, {
            location,
            userAgent,
            startedAt: new Date()
        });
        
        // Send welcome message
        const welcomeMessage = "Hello! I'm your emergency response assistant. I'm here to help during disasters and emergencies. How can I assist you today?";
        
        res.status(201).json({
            success: true,
            sessionId,
            message: 'Session started successfully',
            welcomeMessage,
            quickReplies: [
                { text: 'I need emergency help', intent: 'emergency' },
                { text: 'Find shelter', intent: 'shelter' },
                { text: 'Safety information', intent: 'information' },
                { text: 'Emergency contacts', intent: 'contacts' }
            ]
        });
    } catch (error) {
        logger.error('Error starting chatbot session:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error starting session',
            error: error.message
        });
    }
});

export default router;
