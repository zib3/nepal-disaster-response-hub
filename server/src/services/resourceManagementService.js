import Resource from '../models/Resource.js';
import ResourceRequest from '../models/ResourceRequest.js';
import Disaster from '../models/Disaster.js';
import User from '../models/User.js';
import logger from '../config/logger.js';

class ResourceManagementService {
    constructor() {
        this.resourceCategories = {
            'Medical': ['First Aid Kits', 'Medications', 'Medical Equipment', 'Ambulances', 'Medical Personnel'],
            'Food': ['Rice', 'Lentils', 'Canned Food', 'Water Bottles', 'Baby Formula'],
            'Shelter': ['Tents', 'Blankets', 'Tarpaulins', 'Sleeping Bags', 'Temporary Housing'],
            'Transportation': ['Vehicles', 'Boats', 'Helicopters', 'Fuel'],
            'Communication': ['Radios', 'Satellite Phones', 'Emergency Broadcast Equipment'],
            'Tools': ['Generators', 'Rescue Equipment', 'Construction Tools', 'Safety Equipment'],
            'Personnel': ['Rescue Teams', 'Medical Staff', 'Volunteers', 'Security Personnel']
        };

        this.priorityWeights = {
            'Critical': 1.0,
            'High': 0.8,
            'Medium': 0.6,
            'Low': 0.4
        };
    }

    /**
     * Create a new resource in inventory
     */
    async createResource(resourceData, userId) {
        try {
            logger.info(`Creating new resource: ${resourceData.name}`);

            const resource = new Resource({
                ...resourceData,
                createdBy: userId,
                lastUpdated: new Date()
            });

            await resource.save();

            logger.info(`Resource created successfully: ${resource._id}`);
            return resource;
        } catch (error) {
            logger.error('Error creating resource:', error);
            throw error;
        }
    }

    /**
     * Update resource availability and status
     */
    async updateResourceAvailability(resourceId, updateData, userId) {
        try {
            const resource = await Resource.findById(resourceId);

            if (!resource) {
                throw new Error('Resource not found');
            }

            const oldAvailable = resource.availability.available;
            const oldStatus = resource.status;

            // Update resource fields
            if (updateData.availability) {
                resource.availability = {
                    ...resource.availability,
                    ...updateData.availability
                };
            }

            if (updateData.status) {
                resource.status = updateData.status;
            }

            if (updateData.location) {
                resource.location = {
                    ...resource.location,
                    ...updateData.location
                };
            }

            // Add tracking history
            resource.trackingHistory.push({
                action: this.getTrackingAction(oldAvailable, resource.availability.available, oldStatus, resource.status),
                timestamp: new Date(),
                updatedBy: userId,
                details: updateData.notes || `Updated by user ${userId}`,
                previousState: {
                    available: oldAvailable,
                    status: oldStatus
                },
                newState: {
                    available: resource.availability.available,
                    status: resource.status
                }
            });

            resource.lastUpdated = new Date();
            await resource.save();

            logger.info(`Resource availability updated: ${resourceId}`);
            return resource;
        } catch (error) {
            logger.error('Error updating resource availability:', error);
            throw error;
        }
    }

    /**
     * Create a new resource request
     */
    async createResourceRequest(requestData, userId) {
        try {
            logger.info(`Creating resource request: ${requestData.title}`);

            // Calculate urgency score
            const urgencyScore = this.calculateUrgencyScore(requestData);

            const resourceRequest = new ResourceRequest({
                ...requestData,
                urgencyScore,
                createdBy: userId,
                status: 'Pending'
            });

            await resourceRequest.save();

            // Try to find and allocate available resources
            await this.attemptAutoAllocation(resourceRequest._id);

            logger.info(`Resource request created: ${resourceRequest._id}`);
            return resourceRequest;
        } catch (error) {
            logger.error('Error creating resource request:', error);
            throw error;
        }
    }

    /**
     * Allocate resources to a request
     */
    async allocateResources(requestId, allocationData, userId) {
        try {
            const request = await ResourceRequest.findById(requestId);
            if (!request) {
                throw new Error('Resource request not found');
            }

            const { resourceId, allocatedQuantity, notes } = allocationData;

            const resource = await Resource.findById(resourceId);
            if (!resource) {
                throw new Error('Resource not found');
            }

            // Check if enough resources are available
            if (resource.availability.available < allocatedQuantity) {
                throw new Error(`Insufficient resources. Available: ${resource.availability.available}, Requested: ${allocatedQuantity}`);
            }

            // Update resource availability
            resource.availability.available -= allocatedQuantity;
            resource.availability.allocated += allocatedQuantity;

            // Add tracking history for resource
            resource.trackingHistory.push({
                action: 'allocated',
                timestamp: new Date(),
                updatedBy: userId,
                details: `Allocated ${allocatedQuantity} units to request ${requestId}`,
                relatedRequest: requestId,
                quantityChanged: -allocatedQuantity
            });

            // Update request with allocation
            if (!request.allocations) {
                request.allocations = [];
            }

            request.allocations.push({
                resourceId: resourceId,
                allocatedQuantity: allocatedQuantity,
                allocatedBy: userId,
                allocatedAt: new Date(),
                notes: notes,
                status: 'Allocated'
            });

            // Update request status
            const totalAllocated = request.allocations.reduce((sum, alloc) => sum + alloc.allocatedQuantity, 0);
            if (totalAllocated >= request.requiredQuantity) {
                request.status = 'Fulfilled';
                request.fulfilledAt = new Date();
            } else {
                request.status = 'Partially Fulfilled';
            }

            request.assignedTeam = userId;

            await resource.save();
            await request.save();

            logger.info(`Resources allocated: ${allocatedQuantity} units of ${resource.name} to request ${requestId}`);
            return { request, resource };
        } catch (error) {
            logger.error('Error allocating resources:', error);
            throw error;
        }
    }

    /**
     * Get optimal resource allocation recommendations
     */
    async getResourceRecommendations(requestId) {
        try {
            const request = await ResourceRequest.findById(requestId);
            if (!request) {
                throw new Error('Resource request not found');
            }

            // Find available resources matching the category
            const availableResources = await Resource.find({
                category: request.category,
                'availability.available': { $gt: 0 },
                status: 'Available'
            }).sort({ 
                'location.province': request.location.province === '$location.province' ? -1 : 1,
                'availability.available': -1
            });

            const recommendations = [];

            for (const resource of availableResources) {
                const distance = this.calculateDistance(request.location, resource.location);
                const availableQuantity = resource.availability.available;
                const canSupply = Math.min(availableQuantity, request.requiredQuantity);

                if (canSupply > 0) {
                    const score = this.calculateAllocationScore(request, resource, distance, canSupply);

                    recommendations.push({
                        resourceId: resource._id,
                        resourceName: resource.name,
                        canSupply: canSupply,
                        distance: distance,
                        score: score,
                        location: resource.location,
                        estimatedDeliveryTime: this.estimateDeliveryTime(distance, resource.category)
                    });
                }
            }

            // Sort by score (higher is better)
            recommendations.sort((a, b) => b.score - a.score);

            return recommendations.slice(0, 10); // Return top 10 recommendations
        } catch (error) {
            logger.error('Error getting resource recommendations:', error);
            throw error;
        }
    }

    /**
     * Automatically attempt to allocate resources to urgent requests
     */
    async attemptAutoAllocation(requestId) {
        try {
            const request = await ResourceRequest.findById(requestId);
            
            // Only auto-allocate for critical requests
            if (request.priority !== 'Critical') {
                return;
            }

            const recommendations = await this.getResourceRecommendations(requestId);
            
            if (recommendations.length > 0) {
                const bestResource = recommendations[0];
                
                // Auto-allocate if resource is in same province and has high score
                if (bestResource.score > 0.8 && bestResource.distance < 50) {
                    await this.allocateResources(requestId, {
                        resourceId: bestResource.resourceId,
                        allocatedQuantity: Math.min(bestResource.canSupply, request.requiredQuantity),
                        notes: 'Auto-allocated for critical request'
                    }, request.createdBy);
                }
            }
        } catch (error) {
            logger.warn('Error in auto-allocation:', error);
            // Don't throw error as this is a background operation
        }
    }

    /**
     * Track resource movement and delivery
     */
    async updateResourceDelivery(requestId, allocationId, deliveryData, userId) {
        try {
            const request = await ResourceRequest.findById(requestId);
            if (!request) {
                throw new Error('Resource request not found');
            }

            const allocation = request.allocations.id(allocationId);
            if (!allocation) {
                throw new Error('Allocation not found');
            }

            allocation.status = deliveryData.status;
            allocation.deliveryTracking = {
                currentLocation: deliveryData.currentLocation,
                estimatedArrival: deliveryData.estimatedArrival,
                trackingUpdates: allocation.deliveryTracking?.trackingUpdates || []
            };

            allocation.deliveryTracking.trackingUpdates.push({
                timestamp: new Date(),
                location: deliveryData.currentLocation,
                status: deliveryData.status,
                notes: deliveryData.notes,
                updatedBy: userId
            });

            if (deliveryData.status === 'Delivered') {
                allocation.deliveredAt = new Date();
                
                // Update resource status
                const resource = await Resource.findById(allocation.resourceId);
                if (resource) {
                    resource.availability.allocated -= allocation.allocatedQuantity;
                    resource.availability.used += allocation.allocatedQuantity;
                    
                    resource.trackingHistory.push({
                        action: 'delivered',
                        timestamp: new Date(),
                        updatedBy: userId,
                        details: `Delivered ${allocation.allocatedQuantity} units to ${request.location.address}`,
                        relatedRequest: requestId
                    });
                    
                    await resource.save();
                }
            }

            await request.save();

            logger.info(`Delivery status updated for allocation ${allocationId}`);
            return request;
        } catch (error) {
            logger.error('Error updating delivery status:', error);
            throw error;
        }
    }

    /**
     * Get resource inventory with filtering
     */
    async getResourceInventory(filters = {}, pagination = {}) {
        try {
            const {
                category,
                status,
                province,
                district,
                availability,
                search
            } = filters;

            const {
                page = 1,
                limit = 20,
                sortBy = 'lastUpdated',
                sortOrder = 'desc'
            } = pagination;

            // Build query
            const query = {};
            
            if (category) query.category = category;
            if (status) query.status = status;
            if (province) query['location.province'] = province;
            if (district) query['location.district'] = district;
            
            if (availability === 'available') {
                query['availability.available'] = { $gt: 0 };
            } else if (availability === 'low') {
                query['availability.available'] = { $lte: 10, $gt: 0 };
            } else if (availability === 'out') {
                query['availability.available'] = 0;
            }

            if (search) {
                query.$or = [
                    { name: new RegExp(search, 'i') },
                    { description: new RegExp(search, 'i') },
                    { category: new RegExp(search, 'i') }
                ];
            }

            const skip = (page - 1) * limit;
            const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

            const resources = await Resource.find(query)
                .populate('createdBy', 'name organization')
                .sort(sort)
                .skip(skip)
                .limit(limit);

            const total = await Resource.countDocuments(query);

            return {
                resources,
                pagination: {
                    total,
                    page,
                    pages: Math.ceil(total / limit),
                    limit
                }
            };
        } catch (error) {
            logger.error('Error fetching resource inventory:', error);
            throw error;
        }
    }

    /**
     * Get resource requests with filtering
     */
    async getResourceRequests(filters = {}, pagination = {}) {
        try {
            const {
                category,
                priority,
                status,
                province,
                district,
                urgent,
                dateFrom,
                dateTo
            } = filters;

            const {
                page = 1,
                limit = 20,
                sortBy = 'urgencyScore',
                sortOrder = 'desc'
            } = pagination;

            // Build query
            const query = {};
            
            if (category) query.category = category;
            if (priority) query.priority = priority;
            if (status) query.status = status;
            if (province) query['location.province'] = province;
            if (district) query['location.district'] = district;

            if (urgent === 'true') {
                query.urgentBy = { $gte: new Date() };
                query.priority = { $in: ['Critical', 'High'] };
            }

            if (dateFrom || dateTo) {
                query.createdAt = {};
                if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
                if (dateTo) query.createdAt.$lte = new Date(dateTo);
            }

            const skip = (page - 1) * limit;
            const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

            const requests = await ResourceRequest.find(query)
                .populate('createdBy', 'name organization phone email')
                .populate('assignedTeam', 'name organization')
                .populate('allocations.resourceId', 'name category location')
                .sort(sort)
                .skip(skip)
                .limit(limit);

            const total = await ResourceRequest.countDocuments(query);

            return {
                requests,
                pagination: {
                    total,
                    page,
                    pages: Math.ceil(total / limit),
                    limit
                }
            };
        } catch (error) {
            logger.error('Error fetching resource requests:', error);
            throw error;
        }
    }

    /**
     * Get resource allocation analytics
     */
    async getResourceAnalytics(filters = {}) {
        try {
            const { dateFrom, dateTo, category, province } = filters;

            const matchCriteria = {};
            if (dateFrom || dateTo) {
                matchCriteria.createdAt = {};
                if (dateFrom) matchCriteria.createdAt.$gte = new Date(dateFrom);
                if (dateTo) matchCriteria.createdAt.$lte = new Date(dateTo);
            }
            if (category) matchCriteria.category = category;
            if (province) matchCriteria['location.province'] = province;

            // Resource utilization
            const utilization = await Resource.aggregate([
                { $match: matchCriteria },
                {
                    $group: {
                        _id: '$category',
                        totalResources: { $sum: 1 },
                        totalCapacity: { $sum: '$availability.total' },
                        totalAvailable: { $sum: '$availability.available' },
                        totalAllocated: { $sum: '$availability.allocated' },
                        totalUsed: { $sum: '$availability.used' }
                    }
                },
                {
                    $addFields: {
                        utilizationRate: {
                            $divide: ['$totalUsed', '$totalCapacity']
                        },
                        availabilityRate: {
                            $divide: ['$totalAvailable', '$totalCapacity']
                        }
                    }
                }
            ]);

            // Request fulfillment statistics
            const fulfillment = await ResourceRequest.aggregate([
                { $match: matchCriteria },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        avgUrgencyScore: { $avg: '$urgencyScore' }
                    }
                }
            ]);

            // Response time analysis
            const responseTime = await ResourceRequest.aggregate([
                {
                    $match: {
                        ...matchCriteria,
                        status: { $in: ['Fulfilled', 'Partially Fulfilled'] }
                    }
                },
                {
                    $addFields: {
                        responseTimeHours: {
                            $divide: [
                                { $subtract: ['$updatedAt', '$createdAt'] },
                                1000 * 60 * 60
                            ]
                        }
                    }
                },
                {
                    $group: {
                        _id: '$priority',
                        avgResponseTime: { $avg: '$responseTimeHours' },
                        count: { $sum: 1 }
                    }
                }
            ]);

            return {
                utilization,
                fulfillment,
                responseTime,
                generatedAt: new Date()
            };
        } catch (error) {
            logger.error('Error generating resource analytics:', error);
            throw error;
        }
    }

    /**
     * Helper methods
     */

    calculateUrgencyScore(requestData) {
        let score = 0;

        // Priority weight (40%)
        score += this.priorityWeights[requestData.priority] * 0.4;

        // Time urgency (30%)
        if (requestData.urgentBy) {
            const hoursUntilDeadline = (new Date(requestData.urgentBy) - new Date()) / (1000 * 60 * 60);
            if (hoursUntilDeadline <= 6) score += 0.3;
            else if (hoursUntilDeadline <= 24) score += 0.2;
            else if (hoursUntilDeadline <= 72) score += 0.1;
        }

        // Quantity factor (20%)
        if (requestData.requiredQuantity > 100) score += 0.2;
        else if (requestData.requiredQuantity > 50) score += 0.15;
        else if (requestData.requiredQuantity > 10) score += 0.1;

        // Disaster relation factor (10%)
        if (requestData.relatedDisaster) score += 0.1;

        return Math.min(score, 1.0);
    }

    calculateDistance(location1, location2) {
        // Simplified distance calculation based on province/district
        if (location1.province === location2.province) {
            if (location1.district === location2.district) return 5; // Same district
            return 25; // Same province, different district
        }
        return 100; // Different province
    }

    calculateAllocationScore(request, resource, distance, canSupply) {
        let score = 0;

        // Quantity match (40%)
        const quantityRatio = canSupply / request.requiredQuantity;
        score += Math.min(quantityRatio, 1.0) * 0.4;

        // Distance factor (30%)
        const distanceScore = Math.max(0, (200 - distance) / 200);
        score += distanceScore * 0.3;

        // Resource availability (20%)
        const availabilityRatio = resource.availability.available / resource.availability.total;
        score += availabilityRatio * 0.2;

        // Priority match (10%)
        if (request.priority === 'Critical' && resource.status === 'Available') {
            score += 0.1;
        }

        return score;
    }

    estimateDeliveryTime(distance, category) {
        // Simplified delivery time estimation
        const baseTime = {
            'Medical': 2,     // 2 hours base for medical supplies
            'Food': 4,        // 4 hours base for food
            'Shelter': 6,     // 6 hours base for shelter materials
            'Transportation': 1, // 1 hour base for vehicles
            'Personnel': 3    // 3 hours base for personnel
        };

        const base = baseTime[category] || 4;
        const travelTime = distance / 50; // Assume 50km/hour average speed

        return base + travelTime;
    }

    getTrackingAction(oldAvailable, newAvailable, oldStatus, newStatus) {
        if (newStatus !== oldStatus) return `status_changed_to_${newStatus.toLowerCase()}`;
        if (newAvailable > oldAvailable) return 'restocked';
        if (newAvailable < oldAvailable) return 'consumed';
        return 'updated';
    }
}

export default new ResourceManagementService();
