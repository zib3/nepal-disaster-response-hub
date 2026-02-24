import User from '../models/User.js';
import SystemConfig from '../models/SystemConfig.js';
import ActivityLog from '../models/ActivityLog.js';
import Broadcast from '../models/Broadcast.js';
import { createBackup } from '../utils/backup.js';
import { clearRedisCache } from '../utils/cache.js';
import { asyncHandler } from '../middleware/async.js';
import mongoose from 'mongoose';

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password');
  res.json({ users });
});

// @desc    Create user
// @route   POST /api/admin/users
// @access  Private/Admin
export const createUser = asyncHandler(async (req, res) => {
  const user = await User.create({
    ...req.body,
    status: 'active',
    lastLogin: null,
  });

  await ActivityLog.create({
    user: req.user.id,
    action: `Created new user: ${user.name}`,
    type: 'success',
    details: { userId: user.id },
  });

  res.status(201).json({
    user: {
      ...user.toObject(),
      password: undefined,
    },
  });
});

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  ).select('-password');

  await ActivityLog.create({
    user: req.user.id,
    action: `Updated user: ${user.name}`,
    type: 'info',
    details: { userId: user.id, changes: req.body },
  });

  res.json({ user: updatedUser });
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  await user.deleteOne();

  await ActivityLog.create({
    user: req.user.id,
    action: `Deleted user: ${user.name}`,
    type: 'warning',
    details: { userId: user.id },
  });

  res.json({ message: 'User removed' });
});

// @desc    Get system statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getSystemStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    activeUsers,
    pendingRegistrations,
    activeIncidents,
    responseTeams,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: 'active' }),
    User.countDocuments({ status: 'pending' }),
    mongoose.model('Incident').countDocuments({ status: 'active' }),
    mongoose.model('Team').countDocuments({ active: true }),
  ]);

  res.json({
    totalUsers,
    activeUsers,
    pendingRegistrations,
    systemUptime: '99.9%', // TODO: Implement real uptime monitoring
    activeIncidents,
    responseTeams,
  });
});

// @desc    Update system configuration
// @route   PUT /api/admin/config
// @access  Private/Admin
export const updateSystemConfig = asyncHandler(async (req, res) => {
  let config = await SystemConfig.findOne();

  if (!config) {
    config = await SystemConfig.create(req.body);
  } else {
    config = await SystemConfig.findOneAndUpdate(
      {},
      req.body,
      { new: true, upsert: true }
    );
  }

  await ActivityLog.create({
    user: req.user.id,
    action: 'Updated system configuration',
    type: 'info',
    details: req.body,
  });

  res.json(config);
});

// @desc    Backup database
// @route   POST /api/admin/database/backup
// @access  Private/Admin
export const backupDatabase = asyncHandler(async (req, res) => {
  const backupPath = await createBackup();

  await ActivityLog.create({
    user: req.user.id,
    action: 'Initiated database backup',
    type: 'info',
    details: { path: backupPath },
  });

  res.json({
    message: 'Backup initiated successfully',
    path: backupPath,
  });
});

// @desc    Clear system cache
// @route   POST /api/admin/cache/clear
// @access  Private/Admin
export const clearCache = asyncHandler(async (req, res) => {
  await clearRedisCache();

  await ActivityLog.create({
    user: req.user.id,
    action: 'Cleared system cache',
    type: 'info',
  });

  res.json({ message: 'Cache cleared successfully' });
});

// @desc    Get activity logs
// @route   GET /api/admin/logs
// @access  Private/Admin
export const getActivityLogs = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const query = {};
  if (req.query.type) query.type = req.query.type;
  if (req.query.user) query.user = req.query.user;
  if (req.query.from || req.query.to) {
    query.createdAt = {};
    if (req.query.from) query.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) query.createdAt.$lte = new Date(req.query.to);
  }

  const [logs, total] = await Promise.all([
    ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name'),
    ActivityLog.countDocuments(query),
  ]);

  res.json({
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

// @desc    Broadcast message to users
// @route   POST /api/admin/broadcast/message
// @access  Private/Admin
export const broadcastMessage = asyncHandler(async (req, res) => {
  const {
    message,
    title,
    targetRoles = ['all'],
    targetLocations,
    priority = 'medium',
    expiresAt
  } = req.body;

  // Create broadcast record
  const broadcast = await Broadcast.create({
    title,
    message,
    type: 'message',
    priority,
    targetRoles,
    targetLocations,
    createdBy: req.user.id,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined
  });

  // Get Socket.IO instance
  const io = req.app.get('io');
  
  // Determine target rooms
  const rooms = [];
  if (targetRoles.includes('all')) {
    rooms.push('disaster-monitoring');
  } else {
    targetRoles.forEach(role => {
      if (role !== 'all') {
        rooms.push(`role-${role}`);
      }
    });
  }

  // Add location-based rooms if specified
  if (targetLocations && targetLocations.length > 0) {
    targetLocations.forEach(location => {
      if (location.province) {
        const roomName = `location-${location.province}${location.district ? `-${location.district}` : ''}`;
        rooms.push(roomName);
      }
    });
  }

  // Broadcast to all target rooms
  const broadcastData = {
    id: broadcast._id,
    title,
    message,
    type: 'message',
    priority,
    timestamp: broadcast.createdAt,
    from: {
      name: req.user.name,
      role: req.user.role,
      department: req.user.department
    }
  };

  // Send to specific rooms or general monitoring room
  if (rooms.length > 0) {
    rooms.forEach(room => {
      io.to(room).emit('broadcast-message', broadcastData);
    });
  } else {
    io.to('disaster-monitoring').emit('broadcast-message', broadcastData);
  }

  // Log activity
  await ActivityLog.create({
    user: req.user.id,
    action: `Sent broadcast message: "${title || message.substring(0, 50)}..."`,
    type: 'info',
    details: {
      broadcastId: broadcast._id,
      targetRoles,
      targetLocations,
      priority
    },
  });

  res.status(201).json({
    success: true,
    data: broadcast,
    message: 'Message broadcasted successfully'
  });
});

// @desc    Broadcast alert to users
// @route   POST /api/admin/broadcast/alert
// @access  Private/Admin
export const broadcastAlert = asyncHandler(async (req, res) => {
  const {
    title,
    message,
    type,
    severity,
    targetRoles = ['all'],
    targetLocations,
    actionRequired = false,
    expiresAt
  } = req.body;

  // Create broadcast record
  const broadcast = await Broadcast.create({
    title,
    message,
    type,
    priority: severity, // Map severity to priority
    severity,
    targetRoles,
    targetLocations,
    actionRequired,
    createdBy: req.user.id,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined
  });

  // Get Socket.IO instance
  const io = req.app.get('io');
  
  // Determine target rooms based on alert type and severity
  const rooms = [];
  if (type === 'emergency' || severity === 'critical') {
    // Emergency alerts go to everyone
    rooms.push('disaster-monitoring');
    // Also specifically notify admins and coordinators
    rooms.push('role-admin', 'role-coordinator');
  } else if (targetRoles.includes('all')) {
    rooms.push('disaster-monitoring');
  } else {
    targetRoles.forEach(role => {
      if (role !== 'all') {
        rooms.push(`role-${role}`);
      }
    });
  }

  // Add location-based rooms if specified
  if (targetLocations && targetLocations.length > 0) {
    targetLocations.forEach(location => {
      if (location.province) {
        const roomName = `location-${location.province}${location.district ? `-${location.district}` : ''}`;
        rooms.push(roomName);
      }
    });
  }

  // Prepare alert data
  const alertData = {
    id: broadcast._id,
    title,
    message,
    type,
    severity,
    actionRequired,
    timestamp: broadcast.createdAt,
    expiresAt: broadcast.expiresAt,
    from: {
      name: req.user.name,
      role: req.user.role,
      department: req.user.department
    }
  };

  // Send alert to target rooms
  const uniqueRooms = [...new Set(rooms)]; // Remove duplicates
  uniqueRooms.forEach(room => {
    io.to(room).emit('broadcast-alert', alertData);
  });

  // For critical/emergency alerts, also send as emergency-sos
  if (type === 'emergency' || severity === 'critical') {
    io.to('disaster-monitoring').emit('emergency-alert', {
      ...alertData,
      isSystemAlert: true
    });
  }

  // Log activity
  await ActivityLog.create({
    user: req.user.id,
    action: `Sent ${severity} ${type} alert: "${title}"`,
    type: severity === 'critical' ? 'warning' : 'info',
    details: {
      broadcastId: broadcast._id,
      alertType: type,
      severity,
      targetRoles,
      targetLocations,
      actionRequired
    },
  });

  res.status(201).json({
    success: true,
    data: broadcast,
    message: 'Alert broadcasted successfully'
  });
});

// @desc    Get broadcast history
// @route   GET /api/admin/broadcast/history
// @access  Private/Admin
export const getBroadcastHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const query = {};
  if (req.query.type) query.type = req.query.type;
  if (req.query.priority) query.priority = req.query.priority;
  if (req.query.status) query.status = req.query.status;
  if (req.query.from || req.query.to) {
    query.createdAt = {};
    if (req.query.from) query.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) query.createdAt.$lte = new Date(req.query.to);
  }

  const [broadcasts, total] = await Promise.all([
    Broadcast.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name role department'),
    Broadcast.countDocuments(query),
  ]);

  // Get broadcast statistics
  const stats = await Broadcast.getStatistics();

  res.json({
    success: true,
    data: broadcasts,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    },
    stats
  });
});
