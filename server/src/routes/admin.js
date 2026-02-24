import express from 'express';
import auth from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validateRequest } from '../middleware/validate.js';
import { 
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getSystemStats,
  updateSystemConfig,
  backupDatabase,
  clearCache,
  getActivityLogs,
  broadcastMessage,
  broadcastAlert,
  getBroadcastHistory
} from '../controllers/adminController.js';
import { body } from 'express-validator';

const router = express.Router();

// User Management
router.get('/users', 
  auth, 
  authorize(['admin']), 
  getUsers
);

router.post('/users',
  auth,
  authorize(['admin']),
  [
    body('name').notEmpty().trim(),
    body('email').isEmail(),
    body('role').isIn(['admin', 'coordinator', 'responder', 'viewer']),
    body('department').optional(),
    body('password').isLength({ min: 6 }),
  ],
  validateRequest,
  createUser
);

router.put('/users/:id',
  auth,
  authorize(['admin']),
  [
    body('name').optional().trim(),
    body('email').optional().isEmail(),
    body('role').optional().isIn(['admin', 'coordinator', 'responder', 'viewer']),
    body('department').optional(),
    body('status').optional().isIn(['active', 'disabled']),
  ],
  validateRequest,
  updateUser
);

router.delete('/users/:id',
  auth,
  authorize(['admin']),
  deleteUser
);

// System Statistics
router.get('/stats',
  auth,
  authorize(['admin']),
  getSystemStats
);

// System Configuration
router.put('/config',
  auth,
  authorize(['admin']),
  [
    body('autoApprovePublicRegistrations').optional().isBoolean(),
    body('dataRetentionDays').optional().isInt({ min: 1 }),
    body('emailNotifications').optional().isBoolean(),
  ],
  validateRequest,
  updateSystemConfig
);

// Database Management
router.post('/database/backup',
  auth,
  authorize(['admin']),
  backupDatabase
);

router.post('/cache/clear',
  auth,
  authorize(['admin']),
  clearCache
);

// Activity Logs
router.get('/logs',
  auth,
  authorize(['admin']),
  getActivityLogs
);

// Broadcasting
router.post('/broadcast/message',
  auth,
  authorize(['admin', 'coordinator']),
  [
    body('message').notEmpty().trim(),
    body('title').optional().trim(),
    body('targetRoles').optional().isArray(),
    body('targetLocations').optional().isArray(),
    body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
    body('expiresAt').optional().isISO8601(),
  ],
  validateRequest,
  broadcastMessage
);

router.post('/broadcast/alert',
  auth,
  authorize(['admin', 'coordinator']),
  [
    body('title').notEmpty().trim(),
    body('message').notEmpty().trim(),
    body('type').isIn(['emergency', 'warning', 'info', 'success']),
    body('severity').isIn(['low', 'medium', 'high', 'critical']),
    body('targetRoles').optional().isArray(),
    body('targetLocations').optional().isArray(),
    body('actionRequired').optional().isBoolean(),
    body('expiresAt').optional().isISO8601(),
  ],
  validateRequest,
  broadcastAlert
);

router.get('/broadcast/history',
  auth,
  authorize(['admin', 'coordinator']),
  getBroadcastHistory
);

export default router;
