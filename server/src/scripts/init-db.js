import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, Incident, Team, ActivityLog, SystemConfig } from '../models/index.js';
import logger from '../config/logger.js';

dotenv.config();

const initializeDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Incident.deleteMany({}),
      Team.deleteMany({}),
      ActivityLog.deleteMany({}),
      SystemConfig.deleteMany({}),
    ]);
    logger.info('Cleared existing data');

    // Create admin user
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@nexus.gov.np',
      password: 'admin123',
      role: 'admin',
      department: 'Emergency Management',
      isActive: true,
    });
    logger.info('Created admin user:', admin.email);

    // Create system configuration
    const config = await SystemConfig.create({
      autoApprovePublicRegistrations: false,
      dataRetentionDays: 90,
      emailNotifications: true,
    });
    logger.info('Created system configuration');

    // Create test team
    const team = await Team.create({
      name: 'Emergency Response Team',
      description: 'Primary response team for emergencies',
      type: 'rescue',
      active: true,
      location: {
        province: 'Bagmati',
        district: 'Kathmandu',
      },
    });
    logger.info('Created test team');

    // Create test incident
    const incident = await Incident.create({
      title: 'Test Emergency',
      description: 'This is a test emergency incident',
      type: 'earthquake',
      location: {
        type: 'Point',
        coordinates: [85.3240, 27.7172], // Kathmandu coordinates
        province: 'Bagmati',
        district: 'Kathmandu',
        municipality: 'Kathmandu Metropolitan City',
      },
      severity: 'high',
      status: 'active',
      reportedBy: admin._id,
      assignedTeam: team._id,
    });
    logger.info('Created test incident');

    // Create activity log
    await ActivityLog.create({
      user: admin._id,
      action: 'System initialized',
      type: 'info',
      details: {
        message: 'Database initialized with test data',
      },
    });
    logger.info('Created activity log');

    logger.info('Database initialization completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error initializing database:', error);
    process.exit(1);
  }
};

initializeDatabase();
