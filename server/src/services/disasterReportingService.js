import Disaster from '../models/Disaster.js';
import Alert from '../models/Alert.js';
import User from '../models/User.js';
import logger from '../config/logger.js';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DisasterReportingService {
    constructor() {
        this.uploadDir = path.join(__dirname, '../../uploads/disasters');
        this.ensureUploadDir();
    }

    /**
     * Ensure upload directory exists
     */
    ensureUploadDir() {
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    /**
     * Process and optimize uploaded images
     */
    async processImages(files, disasterId) {
        const processedImages = [];
        
        for (const file of files) {
            try {
                const filename = `${disasterId}-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
                const filepath = path.join(this.uploadDir, filename);
                
                // Optimize image using Sharp
                await sharp(file.buffer)
                    .resize(1200, 800, { 
                        fit: 'inside',
                        withoutEnlargement: true 
                    })
                    .jpeg({ 
                        quality: 85,
                        progressive: true 
                    })
                    .toFile(filepath);

                // Create thumbnail
                const thumbnailFilename = `thumb-${filename}`;
                const thumbnailPath = path.join(this.uploadDir, thumbnailFilename);
                
                await sharp(file.buffer)
                    .resize(300, 200, { 
                        fit: 'cover' 
                    })
                    .jpeg({ 
                        quality: 70 
                    })
                    .toFile(thumbnailPath);

                processedImages.push({
                    url: `/uploads/disasters/${filename}`,
                    thumbnail: `/uploads/disasters/${thumbnailFilename}`,
                    caption: file.originalname || 'Disaster image',
                    size: fs.statSync(filepath).size,
                    uploadedAt: new Date()
                });

                logger.info(`Processed image: ${filename}`);
            } catch (error) {
                logger.error('Error processing image:', error);
                // Continue with other images even if one fails
            }
        }

        return processedImages;
    }

    /**
     * Validate disaster report data
     */
    validateDisasterData(data) {
        const errors = [];

        if (!data.title || data.title.trim().length < 10) {
            errors.push('Title must be at least 10 characters long');
        }

        if (!data.description || data.description.trim().length < 20) {
            errors.push('Description must be at least 20 characters long');
        }

        if (!data.type || !['Earthquake', 'Flood', 'Landslide', 'Fire', 'Drought', 'Cyclone', 'Avalanche', 'Epidemic', 'Industrial Accident', 'Other'].includes(data.type)) {
            errors.push('Valid disaster type is required');
        }

        if (!data.location || !data.location.province || !data.location.district) {
            errors.push('Location with province and district is required');
        }

        if (!data.location.coordinates || !data.location.coordinates.latitude || !data.location.coordinates.longitude) {
            errors.push('GPS coordinates are required');
        }

        if (!data.affected || !data.affected.totalAffected || data.affected.totalAffected < 0) {
            errors.push('Total affected count is required and must be non-negative');
        }

        return errors;
    }

    /**
     * Create new disaster report with images and geolocation
     */
    async createDisasterReport(reportData, files, userId) {
        try {
            // Validate the disaster data
            const validationErrors = this.validateDisasterData(reportData);
            if (validationErrors.length > 0) {
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

            logger.info(`Creating disaster report: ${reportData.title}`);

            // Create disaster record
            const disaster = new Disaster({
                ...reportData,
                createdBy: userId,
                source: 'Field Report',
                isVerified: false,
                reportedAt: new Date()
            });

            await disaster.save();

            // Process and attach images if provided
            if (files && files.length > 0) {
                const processedImages = await this.processImages(files, disaster._id);
                disaster.images = processedImages.map(img => ({
                    url: img.url,
                    thumbnail: img.thumbnail,
                    caption: img.caption,
                    uploadedBy: userId,
                    uploadedAt: img.uploadedAt
                }));
                await disaster.save();
            }

            // Auto-generate alert for critical disasters
            if (disaster.severity === 'Critical') {
                await this.generateAlert(disaster, userId);
            }

            // Update nearby users about the disaster
            await this.notifyNearbyUsers(disaster);

            logger.info(`Disaster report created successfully: ${disaster._id}`);
            return disaster;
        } catch (error) {
            logger.error('Error creating disaster report:', error);
            throw error;
        }
    }

    /**
     * Update existing disaster report
     */
    async updateDisasterReport(disasterId, updateData, files, userId, userRole) {
        try {
            const disaster = await Disaster.findById(disasterId);

            if (!disaster) {
                throw new Error('Disaster report not found');
            }

            // Check permissions - only creators, admins, and coordinators can update
            if (disaster.createdBy.toString() !== userId && !['admin', 'coordinator'].includes(userRole)) {
                throw new Error('Unauthorized to update this disaster report');
            }

            logger.info(`Updating disaster report: ${disasterId}`);

            // Validate update data if critical fields are being changed
            if (updateData.title || updateData.description || updateData.type) {
                const validationErrors = this.validateDisasterData({ ...disaster.toObject(), ...updateData });
                if (validationErrors.length > 0) {
                    throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
                }
            }

            // Process new images if provided
            if (files && files.length > 0) {
                const processedImages = await this.processImages(files, disasterId);
                const newImages = processedImages.map(img => ({
                    url: img.url,
                    thumbnail: img.thumbnail,
                    caption: img.caption,
                    uploadedBy: userId,
                    uploadedAt: img.uploadedAt
                }));
                disaster.images = [...disaster.images, ...newImages];
            }

            // Update disaster fields
            Object.keys(updateData).forEach(key => {
                if (key !== 'images' && updateData[key] !== undefined) {
                    disaster[key] = updateData[key];
                }
            });

            // Add update tracking
            disaster.updates.push({
                message: `Report updated by ${userRole}`,
                timestamp: new Date(),
                updatedBy: userId,
                priority: updateData.severity || disaster.severity
            });

            await disaster.save();

            logger.info(`Disaster report updated successfully: ${disasterId}`);
            return disaster;
        } catch (error) {
            logger.error('Error updating disaster report:', error);
            throw error;
        }
    }

    /**
     * Get disaster reports with advanced filtering
     */
    async getDisasterReports(filters = {}, pagination = {}) {
        try {
            const {
                type,
                severity,
                status,
                province,
                district,
                isVerified,
                dateFrom,
                dateTo,
                search,
                nearLocation,
                radius = 50 // km
            } = filters;

            const {
                page = 1,
                limit = 20,
                sortBy = 'reportedAt',
                sortOrder = 'desc'
            } = pagination;

            // Build query
            const query = {};

            if (type) query.type = type;
            if (severity) query.severity = severity;
            if (status) query.status = status;
            if (province) query['location.province'] = new RegExp(province, 'i');
            if (district) query['location.district'] = new RegExp(district, 'i');
            if (isVerified !== undefined) query.isVerified = isVerified;

            // Date range filter
            if (dateFrom || dateTo) {
                query.reportedAt = {};
                if (dateFrom) query.reportedAt.$gte = new Date(dateFrom);
                if (dateTo) query.reportedAt.$lte = new Date(dateTo);
            }

            // Text search
            if (search) {
                query.$or = [
                    { title: new RegExp(search, 'i') },
                    { description: new RegExp(search, 'i') },
                    { 'location.address': new RegExp(search, 'i') }
                ];
            }

            // Geospatial search for nearby disasters
            if (nearLocation && nearLocation.latitude && nearLocation.longitude) {
                query['location.coordinates'] = {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [nearLocation.longitude, nearLocation.latitude]
                        },
                        $maxDistance: radius * 1000 // Convert km to meters
                    }
                };
            }

            const skip = (page - 1) * limit;
            const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

            const disasters = await Disaster.find(query)
                .populate('createdBy', 'name organization email phone')
                .populate('verifiedBy', 'name organization')
                .populate('responseTeams', 'name organization phone')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .select('-updates.__v');

            const total = await Disaster.countDocuments(query);

            return {
                disasters,
                pagination: {
                    total,
                    page,
                    pages: Math.ceil(total / limit),
                    limit
                },
                filters: filters
            };
        } catch (error) {
            logger.error('Error fetching disaster reports:', error);
            throw error;
        }
    }

    /**
     * Get single disaster report with full details
     */
    async getDisasterReport(disasterId) {
        try {
            const disaster = await Disaster.findById(disasterId)
                .populate('createdBy', 'name organization email phone')
                .populate('verifiedBy', 'name organization')
                .populate('responseTeams', 'name organization phone email')
                .populate('updates.updatedBy', 'name organization');

            if (!disaster) {
                throw new Error('Disaster report not found');
            }

            return disaster;
        } catch (error) {
            logger.error('Error fetching disaster report:', error);
            throw error;
        }
    }

    /**
     * Verify disaster report (admin/coordinator only)
     */
    async verifyDisasterReport(disasterId, userId, verification) {
        try {
            const disaster = await Disaster.findById(disasterId);

            if (!disaster) {
                throw new Error('Disaster report not found');
            }

            disaster.isVerified = verification.isVerified;
            disaster.verifiedBy = userId;
            disaster.verificationNotes = verification.notes;

            // Add verification update
            disaster.updates.push({
                message: verification.isVerified 
                    ? 'Report verified and confirmed' 
                    : 'Report verification rejected',
                timestamp: new Date(),
                updatedBy: userId,
                priority: disaster.severity
            });

            await disaster.save();

            // Generate alert for verified critical disasters
            if (verification.isVerified && disaster.severity === 'Critical') {
                await this.generateAlert(disaster, userId);
            }

            logger.info(`Disaster report ${verification.isVerified ? 'verified' : 'rejected'}: ${disasterId}`);
            return disaster;
        } catch (error) {
            logger.error('Error verifying disaster report:', error);
            throw error;
        }
    }

    /**
     * Assign response teams to disaster
     */
    async assignResponseTeams(disasterId, teamMemberIds, userId) {
        try {
            const disaster = await Disaster.findById(disasterId);

            if (!disaster) {
                throw new Error('Disaster report not found');
            }

            // Verify team members exist
            const teamMembers = await User.find({
                _id: { $in: teamMemberIds },
                role: { $in: ['responder', 'coordinator'] }
            });

            if (teamMembers.length !== teamMemberIds.length) {
                throw new Error('Some team members not found or not authorized as responders');
            }

            disaster.responseTeams = teamMemberIds;

            // Add assignment update
            disaster.updates.push({
                message: `${teamMembers.length} response team members assigned`,
                timestamp: new Date(),
                updatedBy: userId,
                priority: disaster.severity
            });

            await disaster.save();

            logger.info(`Response teams assigned to disaster: ${disasterId}`);
            return disaster;
        } catch (error) {
            logger.error('Error assigning response teams:', error);
            throw error;
        }
    }

    /**
     * Add update/comment to disaster report
     */
    async addDisasterUpdate(disasterId, update, userId) {
        try {
            const disaster = await Disaster.findById(disasterId);

            if (!disaster) {
                throw new Error('Disaster report not found');
            }

            disaster.updates.push({
                message: update.message,
                timestamp: new Date(),
                updatedBy: userId,
                priority: update.priority || 'Medium'
            });

            await disaster.save();

            logger.info(`Update added to disaster report: ${disasterId}`);
            return disaster;
        } catch (error) {
            logger.error('Error adding disaster update:', error);
            throw error;
        }
    }

    /**
     * Delete disaster report (admin only)
     */
    async deleteDisasterReport(disasterId, userId) {
        try {
            const disaster = await Disaster.findById(disasterId);

            if (!disaster) {
                throw new Error('Disaster report not found');
            }

            // Delete associated images
            if (disaster.images && disaster.images.length > 0) {
                for (const image of disaster.images) {
                    try {
                        const imagePath = path.join(__dirname, '../..', image.url);
                        const thumbnailPath = path.join(__dirname, '../..', image.thumbnail);
                        
                        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
                        if (fs.existsSync(thumbnailPath)) fs.unlinkSync(thumbnailPath);
                    } catch (deleteError) {
                        logger.warn('Error deleting image file:', deleteError);
                    }
                }
            }

            await disaster.deleteOne();

            logger.info(`Disaster report deleted: ${disasterId}`);
            return { message: 'Disaster report deleted successfully' };
        } catch (error) {
            logger.error('Error deleting disaster report:', error);
            throw error;
        }
    }

    /**
     * Generate alert for critical disasters
     */
    async generateAlert(disaster, userId) {
        try {
            const alert = new Alert({
                type: disaster.type,
                severity: disaster.severity,
                location: `${disaster.location.district}, ${disaster.location.province}`,
                message: `${disaster.severity} ${disaster.type.toLowerCase()} reported in ${disaster.location.address || disaster.location.district}. ${disaster.affected.totalAffected} people affected.`,
                affected: disaster.affected.totalAffected,
                status: 'Active',
                createdBy: userId
            });

            await alert.save();
            logger.info(`Auto-generated alert for disaster: ${disaster._id}`);
        } catch (error) {
            logger.error('Error generating alert:', error);
        }
    }

    /**
     * Notify nearby users about new disasters (placeholder for real-time notifications)
     */
    async notifyNearbyUsers(disaster) {
        try {
            // This would integrate with Socket.io for real-time notifications
            // For now, we'll just log the notification
            logger.info(`Notification sent for disaster in ${disaster.location.district}`);
            
            // In a real implementation, you would:
            // 1. Find users within a certain radius
            // 2. Send push notifications
            // 3. Send SMS alerts
            // 4. Update real-time dashboard
        } catch (error) {
            logger.error('Error notifying nearby users:', error);
        }
    }

    /**
     * Get disaster statistics
     */
    async getDisasterStatistics(filters = {}) {
        try {
            const { dateFrom, dateTo, province, district } = filters;

            // Build base match criteria
            const matchCriteria = {};
            if (dateFrom || dateTo) {
                matchCriteria.reportedAt = {};
                if (dateFrom) matchCriteria.reportedAt.$gte = new Date(dateFrom);
                if (dateTo) matchCriteria.reportedAt.$lte = new Date(dateTo);
            }
            if (province) matchCriteria['location.province'] = province;
            if (district) matchCriteria['location.district'] = district;

            const stats = await Disaster.aggregate([
                { $match: matchCriteria },
                {
                    $group: {
                        _id: null,
                        totalDisasters: { $sum: 1 },
                        totalAffected: { $sum: '$affected.totalAffected' },
                        totalDeaths: { $sum: '$affected.casualties.deaths' },
                        totalInjured: { $sum: '$affected.casualties.injured' },
                        totalMissing: { $sum: '$affected.casualties.missing' },
                        totalDisplaced: { $sum: '$affected.displaced' },
                        avgAffected: { $avg: '$affected.totalAffected' },
                        byType: {
                            $push: {
                                type: '$type',
                                severity: '$severity',
                                affected: '$affected.totalAffected'
                            }
                        }
                    }
                }
            ]);

            // Get breakdown by type
            const typeBreakdown = await Disaster.aggregate([
                { $match: matchCriteria },
                {
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 },
                        totalAffected: { $sum: '$affected.totalAffected' }
                    }
                },
                { $sort: { count: -1 } }
            ]);

            // Get breakdown by severity
            const severityBreakdown = await Disaster.aggregate([
                { $match: matchCriteria },
                {
                    $group: {
                        _id: '$severity',
                        count: { $sum: 1 },
                        totalAffected: { $sum: '$affected.totalAffected' }
                    }
                },
                { $sort: { count: -1 } }
            ]);

            return {
                summary: stats[0] || {
                    totalDisasters: 0,
                    totalAffected: 0,
                    totalDeaths: 0,
                    totalInjured: 0,
                    totalMissing: 0,
                    totalDisplaced: 0,
                    avgAffected: 0
                },
                typeBreakdown,
                severityBreakdown
            };
        } catch (error) {
            logger.error('Error getting disaster statistics:', error);
            throw error;
        }
    }
}

export default new DisasterReportingService();
