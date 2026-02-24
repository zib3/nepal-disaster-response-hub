import mongoose from 'mongoose';

const SystemConfigSchema = new mongoose.Schema({
  autoApprovePublicRegistrations: {
    type: Boolean,
    default: false,
  },
  dataRetentionDays: {
    type: Number,
    default: 90,
  },
  emailNotifications: {
    type: Boolean,
    default: true,
  },
  maintenanceMode: {
    type: Boolean,
    default: false,
  },
  smtpConfig: {
    host: String,
    port: Number,
    secure: Boolean,
    auth: {
      user: String,
      pass: String,
    },
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
});

SystemConfigSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const SystemConfig = mongoose.model('SystemConfig', SystemConfigSchema);

export default SystemConfig;
