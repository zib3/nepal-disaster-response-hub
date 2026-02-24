import cron from 'node-cron';
import weatherService from './weatherService.js';
import logger from '../config/logger.js';

class SchedulerService {
    constructor() {
        this.tasks = new Map();
    }

    init() {
        // Schedule weather updates every 30 minutes
        this.scheduleWeatherUpdates();
        
        // Schedule cleanup tasks daily
        this.scheduleDataCleanup();
        
        logger.info('Scheduler service initialized');
    }

    scheduleWeatherUpdates() {
        const task = cron.schedule('*/30 * * * *', async () => {
            try {
                logger.info('Starting scheduled weather update...');
                const result = await weatherService.updateAllLocationsWeather();
                logger.info(`Scheduled weather update completed: ${result.successful} successful, ${result.failed} failed`);
            } catch (error) {
                logger.error('Error in scheduled weather update:', error.message);
            }
        }, {
            scheduled: true,
            timezone: "Asia/Kathmandu"
        });

        this.tasks.set('weatherUpdate', task);
        logger.info('Weather update task scheduled (every 30 minutes)');
    }

    scheduleDataCleanup() {
        const task = cron.schedule('0 2 * * *', async () => {
            try {
                logger.info('Starting scheduled data cleanup...');
                await this.cleanupOldData();
                logger.info('Scheduled data cleanup completed');
            } catch (error) {
                logger.error('Error in scheduled data cleanup:', error.message);
            }
        }, {
            scheduled: true,
            timezone: "Asia/Kathmandu"
        });

        this.tasks.set('dataCleanup', task);
        logger.info('Data cleanup task scheduled (daily at 2 AM)');
    }

    async cleanupOldData() {
        const { ChatConversation, WeatherData, FloodPrediction } = await import('../models/index.js');
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        try {
            // Clean up old completed chat conversations (30+ days old)
            const oldConversations = await ChatConversation.deleteMany({
                status: { $in: ['completed', 'abandoned'] },
                updatedAt: { $lt: thirtyDaysAgo }
            });
            
            // Clean up old weather data (keep only last 7 days)
            const oldWeatherData = await WeatherData.deleteMany({
                createdAt: { $lt: sevenDaysAgo }
            });
            
            // Clean up expired flood predictions
            const expiredPredictions = await FloodPrediction.deleteMany({
                'prediction.validUntil': { $lt: new Date() },
                status: 'expired'
            });
            
            logger.info(`Cleanup results - Conversations: ${oldConversations.deletedCount}, Weather: ${oldWeatherData.deletedCount}, Predictions: ${expiredPredictions.deletedCount}`);
        } catch (error) {
            logger.error('Error during data cleanup:', error.message);
        }
    }

    startTask(taskName) {
        const task = this.tasks.get(taskName);
        if (task) {
            task.start();
            logger.info(`Started task: ${taskName}`);
        } else {
            logger.warn(`Task not found: ${taskName}`);
        }
    }

    stopTask(taskName) {
        const task = this.tasks.get(taskName);
        if (task) {
            task.stop();
            logger.info(`Stopped task: ${taskName}`);
        } else {
            logger.warn(`Task not found: ${taskName}`);
        }
    }

    stopAllTasks() {
        this.tasks.forEach((task, name) => {
            task.destroy();
            logger.info(`Destroyed task: ${name}`);
        });
        this.tasks.clear();
    }
}

export default new SchedulerService();
