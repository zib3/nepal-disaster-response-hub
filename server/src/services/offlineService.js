import Disaster from '../models/Disaster.js';
import ResourceRequest from '../models/ResourceRequest.js';
import Alert from '../models/Alert.js';
import WeatherData from '../models/WeatherData.js';
import ChatConversation from '../models/ChatConversation.js';
import logger from '../config/logger.js';

class OfflineService {
    constructor() {
        this.queuedActions = new Map(); // Store offline actions
        this.syncPriorities = {
            'emergency': 1,
            'high': 2,
            'medium': 3,
            'low': 4
        };
    }

    /**
     * Queue action for later synchronization when back online
     */
    async queueAction(action, data, userId, priority = 'medium') {
        try {
            const actionId = this.generateActionId();
            const queuedAction = {
                id: actionId,
                action,
                data,
                userId,
                priority,
                timestamp: new Date(),
                retryCount: 0,
                maxRetries: 3,
                status: 'pending'
            };

            this.queuedActions.set(actionId, queuedAction);
            
            logger.info(`Action queued for offline sync: ${actionId} - ${action}`);
            return actionId;
        } catch (error) {
            logger.error('Error queuing offline action:', error);
            throw error;
        }
    }

    /**
     * Process queued actions when connectivity is restored
     */
    async processQueuedActions() {
        try {
            if (this.queuedActions.size === 0) {
                return { processed: 0, failed: 0 };
            }

            logger.info(`Processing ${this.queuedActions.size} queued offline actions`);

            // Sort actions by priority
            const sortedActions = Array.from(this.queuedActions.values())
                .sort((a, b) => this.syncPriorities[a.priority] - this.syncPriorities[b.priority]);

            let processed = 0;
            let failed = 0;

            for (const action of sortedActions) {
                try {
                    await this.processAction(action);
                    this.queuedActions.delete(action.id);
                    processed++;
                    logger.info(`Successfully synced action: ${action.id} - ${action.action}`);
                } catch (error) {
                    action.retryCount++;
                    action.lastError = error.message;
                    
                    if (action.retryCount >= action.maxRetries) {
                        action.status = 'failed';
                        failed++;
                        logger.error(`Action failed after ${action.maxRetries} retries: ${action.id}`, error);
                    } else {
                        action.status = 'retrying';
                        logger.warn(`Action retry ${action.retryCount}/${action.maxRetries}: ${action.id}`);
                    }
                }
            }

            logger.info(`Offline sync complete: ${processed} processed, ${failed} failed`);
            return { processed, failed };
        } catch (error) {
            logger.error('Error processing queued actions:', error);
            throw error;
        }
    }

    /**
     * Process individual queued action
     */
    async processAction(queuedAction) {
        const { action, data, userId } = queuedAction;

        switch (action) {
            case 'create-disaster-report':
                return await this.syncDisasterReport(data, userId);
            
            case 'update-disaster-report':
                return await this.syncDisasterUpdate(data.id, data.updates, userId);
            
            case 'create-resource-request':
                return await this.syncResourceRequest(data, userId);
            
            case 'update-resource-status':
                return await this.syncResourceUpdate(data.resourceId, data.updates, userId);
            
            case 'create-alert':
                return await this.syncAlert(data, userId);
            
            case 'save-chat-conversation':
                return await this.syncChatConversation(data, userId);
            
            case 'emergency-sos':
                return await this.syncEmergencyAlert(data, userId);
            
            default:
                throw new Error(`Unknown action type: ${action}`);
        }
    }

    /**
     * Sync offline disaster report
     */
    async syncDisasterReport(reportData, userId) {
        try {
            const disaster = new Disaster({
                ...reportData,
                createdBy: userId,
                source: 'Offline Report',
                isVerified: false,
                reportedAt: reportData.originalTimestamp || new Date()
            });

            await disaster.save();
            logger.info(`Synced offline disaster report: ${disaster._id}`);
            return disaster;
        } catch (error) {
            logger.error('Error syncing disaster report:', error);
            throw error;
        }
    }

    /**
     * Sync disaster report updates
     */
    async syncDisasterUpdate(disasterId, updates, userId) {
        try {
            const disaster = await Disaster.findById(disasterId);
            if (!disaster) {
                throw new Error('Disaster report not found');
            }

            // Apply updates
            Object.keys(updates).forEach(key => {
                if (updates[key] !== undefined) {
                    disaster[key] = updates[key];
                }
            });

            // Add sync update tracking
            disaster.updates.push({
                message: 'Offline update synced',
                timestamp: updates.originalTimestamp || new Date(),
                updatedBy: userId,
                priority: 'Medium'
            });

            await disaster.save();
            logger.info(`Synced disaster update: ${disasterId}`);
            return disaster;
        } catch (error) {
            logger.error('Error syncing disaster update:', error);
            throw error;
        }
    }

    /**
     * Sync offline resource request
     */
    async syncResourceRequest(requestData, userId) {
        try {
            const resourceRequest = new ResourceRequest({
                ...requestData,
                createdBy: userId,
                status: 'Pending',
                createdAt: requestData.originalTimestamp || new Date()
            });

            await resourceRequest.save();
            logger.info(`Synced offline resource request: ${resourceRequest._id}`);
            return resourceRequest;
        } catch (error) {
            logger.error('Error syncing resource request:', error);
            throw error;
        }
    }

    /**
     * Sync resource status updates
     */
    async syncResourceUpdate(resourceId, updates, userId) {
        try {
            // This would integrate with the resource management service
            logger.info(`Synced resource update: ${resourceId}`);
            return { resourceId, updates, syncedAt: new Date() };
        } catch (error) {
            logger.error('Error syncing resource update:', error);
            throw error;
        }
    }

    /**
     * Sync offline alert
     */
    async syncAlert(alertData, userId) {
        try {
            const alert = new Alert({
                ...alertData,
                createdBy: userId,
                issuedAt: alertData.originalTimestamp || new Date()
            });

            await alert.save();
            logger.info(`Synced offline alert: ${alert._id}`);
            return alert;
        } catch (error) {
            logger.error('Error syncing alert:', error);
            throw error;
        }
    }

    /**
     * Sync offline chat conversation
     */
    async syncChatConversation(conversationData, userId) {
        try {
            let conversation = await ChatConversation.findOne({ sessionId: conversationData.sessionId });
            
            if (!conversation) {
                conversation = new ChatConversation({
                    sessionId: conversationData.sessionId,
                    userId: userId,
                    userInfo: conversationData.userInfo,
                    messages: [],
                    status: 'active'
                });
            }

            // Add offline messages
            if (conversationData.messages && conversationData.messages.length > 0) {
                conversation.messages.push(...conversationData.messages.map(msg => ({
                    ...msg,
                    metadata: {
                        ...msg.metadata,
                        syncedFromOffline: true,
                        originalTimestamp: msg.timestamp
                    }
                })));
            }

            await conversation.save();
            logger.info(`Synced offline chat conversation: ${conversation.sessionId}`);
            return conversation;
        } catch (error) {
            logger.error('Error syncing chat conversation:', error);
            throw error;
        }
    }

    /**
     * Sync emergency SOS alert
     */
    async syncEmergencyAlert(sosData, userId) {
        try {
            // Create high-priority alert for emergency
            const emergencyAlert = new Alert({
                type: 'Emergency',
                severity: 'Critical',
                location: sosData.location || 'Unknown Location',
                message: `Emergency SOS: ${sosData.message || 'Help needed'}`,
                affected: 1,
                status: 'Active',
                createdBy: userId,
                issuedAt: sosData.originalTimestamp || new Date()
            });

            await emergencyAlert.save();

            // Also create disaster report if location provided
            if (sosData.location && sosData.coordinates) {
                const emergencyReport = new Disaster({
                    title: 'Emergency SOS Report',
                    description: `Emergency assistance requested: ${sosData.message || 'Details not provided'}`,
                    type: 'Other',
                    severity: 'Critical',
                    status: 'Ongoing',
                    location: {
                        coordinates: sosData.coordinates,
                        province: sosData.province || 'Unknown',
                        district: sosData.district || 'Unknown',
                        address: sosData.location
                    },
                    affected: {
                        totalAffected: 1,
                        casualties: { deaths: 0, injured: 0, missing: 1 }
                    },
                    createdBy: userId,
                    source: 'Emergency SOS',
                    isVerified: false,
                    reportedAt: sosData.originalTimestamp || new Date()
                });

                await emergencyReport.save();
            }

            logger.info(`Synced emergency SOS: ${emergencyAlert._id}`);
            return emergencyAlert;
        } catch (error) {
            logger.error('Error syncing emergency alert:', error);
            throw error;
        }
    }

    /**
     * Get essential data for offline use (optimized for mobile/rural connectivity)
     */
    async getOfflineEssentials(userLocation = null, lastSync = null) {
        try {
            const syncData = {
                disasters: [],
                alerts: [],
                resources: [],
                weather: [],
                emergencyContacts: [],
                syncTimestamp: new Date()
            };

            // Base date for recent data
            const recentDate = lastSync ? new Date(lastSync) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

            // Get recent disasters (location-based if available)
            const disasterQuery = {
                reportedAt: { $gte: recentDate },
                status: { $in: ['Ongoing', 'Monitoring'] }
            };

            if (userLocation && userLocation.province) {
                disasterQuery['location.province'] = userLocation.province;
            }

            syncData.disasters = await Disaster.find(disasterQuery)
                .select('title type severity status location affected reportedAt')
                .limit(50)
                .lean();

            // Get active alerts
            syncData.alerts = await Alert.find({
                status: 'Active',
                issuedAt: { $gte: recentDate }
            })
                .select('type severity location message affected issuedAt')
                .limit(30)
                .lean();

            // Get recent weather data
            if (userLocation && userLocation.province) {
                syncData.weather = await WeatherData.find({
                    'location.province': userLocation.province,
                    timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                })
                    .select('location current forecast timestamp')
                    .limit(10)
                    .lean();
            }

            // Get emergency contacts (always include essential ones)
            syncData.emergencyContacts = await this.getEssentialEmergencyContacts();

            // Calculate data size for client optimization
            const dataSize = JSON.stringify(syncData).length;
            syncData.dataSizeBytes = dataSize;

            logger.info(`Prepared offline essentials: ${dataSize} bytes`);
            return syncData;
        } catch (error) {
            logger.error('Error preparing offline essentials:', error);
            throw error;
        }
    }

    /**
     * Get essential emergency contacts for offline use
     */
    async getEssentialEmergencyContacts() {
        // Return basic emergency numbers that work offline
        return [
            {
                name: 'Nepal Police',
                phones: [{ number: '100', type: 'Hotline' }],
                category: 'Police',
                priority: 5
            },
            {
                name: 'Fire Brigade',
                phones: [{ number: '101', type: 'Hotline' }],
                category: 'Fire',
                priority: 5
            },
            {
                name: 'Medical Emergency',
                phones: [{ number: '102', type: 'Hotline' }],
                category: 'Medical',
                priority: 5
            },
            {
                name: 'Disaster Management Hotline',
                phones: [{ number: '1135', type: 'Hotline' }],
                category: 'Government',
                priority: 5
            }
        ];
    }

    /**
     * Check connectivity and sync status
     */
    async getOfflineStatus() {
        try {
            const pendingActions = Array.from(this.queuedActions.values())
                .filter(action => action.status === 'pending');
            
            const failedActions = Array.from(this.queuedActions.values())
                .filter(action => action.status === 'failed');

            return {
                isOnline: true, // This would be determined by the client
                queuedActions: this.queuedActions.size,
                pendingSync: pendingActions.length,
                failedSync: failedActions.length,
                lastSyncAttempt: this.lastSyncAttempt || null,
                lastSuccessfulSync: this.lastSuccessfulSync || null
            };
        } catch (error) {
            logger.error('Error getting offline status:', error);
            throw error;
        }
    }

    /**
     * Clear completed and failed actions
     */
    async clearSyncHistory() {
        try {
            const before = this.queuedActions.size;
            
            for (const [key, action] of this.queuedActions.entries()) {
                if (action.status === 'completed' || action.status === 'failed') {
                    this.queuedActions.delete(key);
                }
            }

            const after = this.queuedActions.size;
            const cleared = before - after;
            
            logger.info(`Cleared ${cleared} completed/failed sync actions`);
            return { cleared, remaining: after };
        } catch (error) {
            logger.error('Error clearing sync history:', error);
            throw error;
        }
    }

    /**
     * Generate unique action ID
     */
    generateActionId() {
        return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Initialize offline service
     */
    init() {
        logger.info('Offline service initialized');
        
        // Set up periodic sync attempt (every 5 minutes)
        setInterval(async () => {
            if (this.queuedActions.size > 0) {
                try {
                    this.lastSyncAttempt = new Date();
                    const result = await this.processQueuedActions();
                    if (result.processed > 0 || result.failed === 0) {
                        this.lastSuccessfulSync = new Date();
                    }
                } catch (error) {
                    logger.error('Scheduled sync attempt failed:', error);
                }
            }
        }, 5 * 60 * 1000); // 5 minutes
    }
}

export default new OfflineService();
