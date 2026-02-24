import mongoose from 'mongoose';

const broadcastSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['message', 'alert', 'emergency', 'warning', 'info', 'success'],
    default: 'message'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  targetRoles: [{
    type: String,
    enum: ['public', 'viewer', 'responder', 'coordinator', 'admin', 'all']
  }],
  targetLocations: [{
    province: String,
    district: String,
    municipality: String
  }],
  actionRequired: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'expired'],
    default: 'sent'
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  deliveredTo: [{
    socketId: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: String,
    location: {
      province: String,
      district: String
    },
    deliveredAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  metadata: {
    attachments: [String],
    images: [String],
    links: [{
      url: String,
      title: String,
      description: String
    }],
    tags: [String],
    category: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
broadcastSchema.index({ createdBy: 1, createdAt: -1 });
broadcastSchema.index({ type: 1, priority: 1 });
broadcastSchema.index({ targetRoles: 1 });
broadcastSchema.index({ 'targetLocations.province': 1 });
broadcastSchema.index({ status: 1, expiresAt: 1 });

// Virtual for read count
broadcastSchema.virtual('readCount').get(function() {
  return this.readBy ? this.readBy.length : 0;
});

// Virtual for delivery count
broadcastSchema.virtual('deliveryCount').get(function() {
  return this.deliveredTo ? this.deliveredTo.length : 0;
});

// Virtual for checking if broadcast is expired
broadcastSchema.virtual('isExpired').get(function() {
  return this.expiresAt && new Date() > this.expiresAt;
});

// Virtual for checking if broadcast is active
broadcastSchema.virtual('isActive').get(function() {
  return this.status === 'sent' && !this.isExpired;
});

// Method to check if user can see this broadcast
broadcastSchema.methods.canUserSee = function(user) {
  // Check if broadcast is active
  if (!this.isActive) return false;
  
  // Check target roles
  if (this.targetRoles && this.targetRoles.length > 0) {
    if (!this.targetRoles.includes('all') && !this.targetRoles.includes(user.role)) {
      return false;
    }
  }
  
  // Check target locations
  if (this.targetLocations && this.targetLocations.length > 0 && user.location) {
    const hasLocationMatch = this.targetLocations.some(target => {
      if (target.province && target.province !== user.location.province) {
        return false;
      }
      if (target.district && target.district !== user.location.district) {
        return false;
      }
      return true;
    });
    
    if (!hasLocationMatch) return false;
  }
  
  return true;
};

// Method to mark as read by user
broadcastSchema.methods.markAsRead = function(userId) {
  if (!this.readBy.some(read => read.user.toString() === userId.toString())) {
    this.readBy.push({ user: userId, readAt: new Date() });
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to add delivery record
broadcastSchema.methods.addDelivery = function(socketId, userId, role, location) {
  this.deliveredTo.push({
    socketId,
    userId,
    role,
    location,
    deliveredAt: new Date()
  });
  return this.save();
};

// Static method to get active broadcasts for user
broadcastSchema.statics.getActiveForUser = function(user) {
  return this.find({
    status: 'sent',
    expiresAt: { $gt: new Date() }
  })
  .populate('createdBy', 'name role department')
  .sort({ priority: -1, createdAt: -1 })
  .then(broadcasts => {
    return broadcasts.filter(broadcast => broadcast.canUserSee(user));
  });
};

// Static method to get broadcast statistics
broadcastSchema.statics.getStatistics = function(dateRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);
  
  return Promise.all([
    this.countDocuments({ createdAt: { $gte: startDate } }),
    this.countDocuments({ 
      createdAt: { $gte: startDate },
      type: { $in: ['emergency', 'alert'] }
    }),
    this.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]),
    this.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ])
  ]).then(([totalBroadcasts, emergencyBroadcasts, byType, byPriority]) => ({
    totalBroadcasts,
    emergencyBroadcasts,
    byType: byType.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
    byPriority: byPriority.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
    dateRange
  }));
};

const Broadcast = mongoose.model('Broadcast', broadcastSchema);

export default Broadcast;
