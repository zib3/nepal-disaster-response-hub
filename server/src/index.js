import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import connectDB from './config/database.js';
import logger from './config/logger.js';
// Load all models
import './models/index.js';
import errorHandler from './middleware/errorHandler.js';
import schedulerService from './services/schedulerService.js';

// Import routes
import authRoutes from './routes/auth.js';
import disasterRoutes from './routes/disasters.js';
import alertRoutes from './routes/alerts.js';
import statsRoutes from './routes/stats.js';
import userRoutes from './routes/users.js';
import newsRouter from './routes/news.js';
import resourcesRouter from './routes/resources.js';
import emergencyContactsRouter from './routes/emergencyContacts.js';
import healthRouter from './routes/health.js';
import adminRouter from './routes/admin.js';
import weatherRouter from './routes/weather.js';
import chatbotRouter from './routes/chatbot.js';
import floodPredictionRouter from './routes/floodPrediction.js';
import offlineRouter from './routes/offline.js';
import offlineService from './services/offlineService.js';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:8080",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 8080;

// Connect to MongoDB
connectDB();

// Rate limiting (more permissive for development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // increased limit for development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for development
    return process.env.NODE_ENV === 'development';
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(limiter);
app.use(cors({
  origin: ["http://localhost:8080", "http://localhost:5173", "http://localhost:3000"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRouter);
app.use('/api/disasters', disasterRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/news', newsRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/emergency-contacts', emergencyContactsRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/chatbot', chatbotRouter);
app.use('/api/flood-prediction', floodPredictionRouter);
app.use('/api/offline', offlineRouter);

// Socket.IO for real-time features
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  // Join disaster monitoring room
  socket.on('join-monitoring', (data) => {
    socket.join('disaster-monitoring');
    logger.info(`Client ${socket.id} joined disaster monitoring`);
    
    // Send current online users count
    const onlineUsers = io.sockets.adapter.rooms.get('disaster-monitoring')?.size || 0;
    io.to('disaster-monitoring').emit('online-users', onlineUsers);
  });

  // Join location-based room
  socket.on('join-location', (data) => {
    const { province, district } = data;
    const roomName = `location-${province}${district ? `-${district}` : ''}`;
    socket.join(roomName);
    logger.info(`Client ${socket.id} joined location room: ${roomName}`);
  });

  // Join role-based room
  socket.on('join-role', (data) => {
    const { role } = data;
    socket.join(`role-${role}`);
    logger.info(`Client ${socket.id} joined role room: role-${role}`);
  });

  // Handle real-time location updates
  socket.on('location-update', (data) => {
    const { latitude, longitude, province, district } = data;
    socket.to('disaster-monitoring').emit('responder-location', {
      socketId: socket.id,
      location: { latitude, longitude },
      area: { province, district },
      timestamp: new Date()
    });
  });

  // Handle emergency SOS signals
  socket.on('emergency-sos', (data) => {
    logger.warn(`Emergency SOS received from ${socket.id}:`, data);
    io.to('disaster-monitoring').emit('emergency-sos', {
      ...data,
      socketId: socket.id,
      timestamp: new Date()
    });
    
    // Notify specific role groups
    io.to('role-admin').emit('emergency-sos', {
      ...data,
      socketId: socket.id,
      timestamp: new Date()
    });
    io.to('role-coordinator').emit('emergency-sos', {
      ...data,
      socketId: socket.id,
      timestamp: new Date()
    });
  });

  // Handle chat messages
  socket.on('chat-message', (data) => {
    const { room, message, user } = data;
    const chatData = {
      id: Date.now(),
      message,
      user,
      timestamp: new Date(),
      socketId: socket.id
    };
    
    if (room) {
      socket.to(room).emit('chat-message', chatData);
    } else {
      socket.to('disaster-monitoring').emit('chat-message', chatData);
    }
  });

  // Handle typing indicators
  socket.on('typing-start', (data) => {
    const { room, user } = data;
    const targetRoom = room || 'disaster-monitoring';
    socket.to(targetRoom).emit('typing-start', { user, socketId: socket.id });
  });

  socket.on('typing-stop', (data) => {
    const { room, user } = data;
    const targetRoom = room || 'disaster-monitoring';
    socket.to(targetRoom).emit('typing-stop', { user, socketId: socket.id });
  });

  // Handle resource status updates
  socket.on('resource-status-update', (data) => {
    socket.to('disaster-monitoring').emit('resource-status-update', {
      ...data,
      updatedBy: socket.id,
      timestamp: new Date()
    });
  });

  // Handle weather updates
  socket.on('weather-update', (data) => {
    const { province, district } = data.location;
    const locationRoom = `location-${province}${district ? `-${district}` : ''}`;
    
    io.to(locationRoom).emit('weather-update', {
      ...data,
      timestamp: new Date()
    });
    io.to('disaster-monitoring').emit('weather-update', {
      ...data,
      timestamp: new Date()
    });
  });

  // Handle team coordination messages
  socket.on('team-coordination', (data) => {
    const { teamId, message, action, location } = data;
    io.to(`team-${teamId}`).emit('team-coordination', {
      ...data,
      from: socket.id,
      timestamp: new Date()
    });
  });

  // Handle join team room
  socket.on('join-team', (data) => {
    const { teamId } = data;
    socket.join(`team-${teamId}`);
    logger.info(`Client ${socket.id} joined team room: team-${teamId}`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
    
    // Update online users count
    const onlineUsers = io.sockets.adapter.rooms.get('disaster-monitoring')?.size || 0;
    io.to('disaster-monitoring').emit('online-users', onlineUsers);
    
    // Notify about responder going offline
    socket.to('disaster-monitoring').emit('responder-offline', {
      socketId: socket.id,
      timestamp: new Date()
    });
  });
});

// Make io available to routes
app.set('io', io);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
httpServer.listen(PORT, () => {
  logger.info(`🚀 Nepal Disaster Response Server running on port ${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`📊 Health check available at: http://localhost:${PORT}/health`);
  
  // Initialize scheduled tasks
  schedulerService.init();
  
  // Initialize offline service
  offlineService.init();
});

// Process error handlers
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

export default app;
