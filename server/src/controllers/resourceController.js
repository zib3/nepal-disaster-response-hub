import ResourceRequest from '../models/ResourceRequest.js';

// @desc    Get all resource requests with filtering
// @route   GET /api/resources
// @access  Private
export const getResourceRequests = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        // Build filter object
        let filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.priority) filter.priority = req.query.priority;
        if (req.query.category) filter.category = req.query.category;
        if (req.query.province) filter['location.province'] = req.query.province;
        if (req.query.district) filter['location.district'] = req.query.district;
        if (req.query.verified) filter.isVerified = req.query.verified === 'true';

        // Urgency filter
        if (req.query.urgent === 'true') {
            filter.urgentBy = { $gte: new Date(), $lte: new Date(Date.now() + 24 * 60 * 60 * 1000) };
        }

        const total = await ResourceRequest.countDocuments(filter);
        const requests = await ResourceRequest.find(filter)
            .populate('createdBy', 'name organization')
            .populate('verifiedBy', 'name')
            .populate('assignedTeam', 'name organization')
            .populate('relatedDisaster', 'title type location')
            .sort({ priority: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            success: true,
            count: requests.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            data: requests
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Get urgent resource requests
// @route   GET /api/resources/urgent
// @access  Private
export const getUrgentRequests = async (req, res) => {
    try {
        const requests = await ResourceRequest.find({
            status: { $in: ['Pending', 'In Progress'] },
            urgentBy: { $gte: new Date(), $lte: new Date(Date.now() + 48 * 60 * 60 * 1000) }
        })
            .populate('createdBy', 'name organization')
            .populate('relatedDisaster', 'title type location')
            .sort({ urgentBy: 1, priority: -1 })
            .limit(20);

        res.status(200).json({
            success: true,
            count: requests.length,
            data: requests
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Create resource request
// @route   POST /api/resources
// @access  Private
export const createResourceRequest = async (req, res) => {
    try {
        const requestData = {
            ...req.body,
            createdBy: req.user.id
        };

        const request = await ResourceRequest.create(requestData);
        
        // Populate the response
        const populatedRequest = await ResourceRequest.findById(request._id)
            .populate('createdBy', 'name organization')
            .populate('relatedDisaster', 'title type location');

        // Emit real-time update
        const io = req.app.get('io');
        io.to('disaster-monitoring').emit('new-resource-request', populatedRequest);

        // If critical priority, send urgent notification
        if (request.priority === 'Critical') {
            io.to('disaster-monitoring').emit('urgent-resource-request', populatedRequest);
        }

        res.status(201).json({
            success: true,
            data: populatedRequest
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Get single resource request
// @route   GET /api/resources/:id
// @access  Private
export const getResourceRequestById = async (req, res) => {
    try {
        const request = await ResourceRequest.findById(req.params.id)
            .populate('createdBy', 'name organization phone email')
            .populate('verifiedBy', 'name')
            .populate('assignedTeam', 'name organization phone email')
            .populate('relatedDisaster', 'title type location description');

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Resource request not found'
            });
        }

        res.status(200).json({
            success: true,
            data: request
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Update resource request
// @route   PUT /api/resources/:id
// @access  Private (Admin/Coordinator/Creator)
export const updateResourceRequest = async (req, res) => {
    try {
        let request = await ResourceRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Resource request not found'
            });
        }

        // Check ownership or admin/coordinator rights
        if (request.createdBy.toString() !== req.user.id && !['admin', 'coordinator'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this resource request'
            });
        }

        request = await ResourceRequest.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        )
            .populate('createdBy', 'name organization')
            .populate('verifiedBy', 'name')
            .populate('assignedTeam', 'name organization')
            .populate('relatedDisaster', 'title type location');

        // Emit real-time update
        const io = req.app.get('io');
        io.to('disaster-monitoring').emit('resource-request-updated', request);

        res.status(200).json({
            success: true,
            data: request
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Assign team to resource request
// @route   PUT /api/resources/:id/assign
// @access  Private (Admin/Coordinator)
export const assignTeam = async (req, res) => {
    try {
        const { assignedTeam } = req.body;

        const request = await ResourceRequest.findByIdAndUpdate(
            req.params.id,
            {
                assignedTeam,
                status: 'In Progress'
            },
            { new: true }
        )
            .populate('createdBy', 'name organization')
            .populate('assignedTeam', 'name organization phone email')
            .populate('relatedDisaster', 'title type location');

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Resource request not found'
            });
        }

        // Emit real-time update
        const io = req.app.get('io');
        io.to('disaster-monitoring').emit('resource-request-assigned', request);

        res.status(200).json({
            success: true,
            data: request,
            message: 'Team assigned successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Update fulfillment status
// @route   PUT /api/resources/:id/fulfill
// @access  Private (Admin/Coordinator/Assigned Team)
export const updateFulfillment = async (req, res) => {
    try {
        const { fulfilledQuantity, notes, status } = req.body;
        
        let request = await ResourceRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Resource request not found'
            });
        }

        // Check if user is authorized to update fulfillment
        const isAuthorized = ['admin', 'coordinator'].includes(req.user.role) || 
                           (request.assignedTeam && request.assignedTeam.toString() === req.user.id);

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update fulfillment status'
            });
        }

        // Determine status based on fulfillment
        let newStatus = status;
        if (!newStatus) {
            if (fulfilledQuantity >= request.requiredQuantity) {
                newStatus = 'Fulfilled';
            } else if (fulfilledQuantity > 0) {
                newStatus = 'Partially Fulfilled';
            }
        }

        const updateData = { fulfilledQuantity };
        if (newStatus) updateData.status = newStatus;
        if (notes) updateData.notes = notes;

        request = await ResourceRequest.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        )
            .populate('createdBy', 'name organization')
            .populate('assignedTeam', 'name organization')
            .populate('relatedDisaster', 'title type location');

        // Emit real-time update
        const io = req.app.get('io');
        io.to('disaster-monitoring').emit('resource-request-fulfilled', request);

        res.status(200).json({
            success: true,
            data: request,
            message: 'Fulfillment status updated successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Verify resource request
// @route   PUT /api/resources/:id/verify
// @access  Private (Admin/Coordinator)
export const verifyResourceRequest = async (req, res) => {
    try {
        const request = await ResourceRequest.findByIdAndUpdate(
            req.params.id,
            {
                isVerified: true,
                verifiedBy: req.user.id
            },
            { new: true }
        )
            .populate('createdBy', 'name organization')
            .populate('verifiedBy', 'name');

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Resource request not found'
            });
        }

        res.status(200).json({
            success: true,
            data: request,
            message: 'Resource request verified successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Delete resource request
// @route   DELETE /api/resources/:id
// @access  Private (Admin/Creator)
export const deleteResourceRequest = async (req, res) => {
    try {
        const request = await ResourceRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Resource request not found'
            });
        }

        // Check ownership or admin rights
        if (request.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this resource request'
            });
        }

        await ResourceRequest.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Resource request deleted successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Get resource statistics
// @route   GET /api/resources/stats
// @access  Private
export const getResourceStats = async (req, res) => {
    try {
        // Get request counts by status
        const statusStats = await ResourceRequest.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalValue: { $sum: '$estimatedCost.amount' }
                }
            }
        ]);

        // Get request counts by category
        const categoryStats = await ResourceRequest.aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    pending: {
                        $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] }
                    },
                    fulfilled: {
                        $sum: { $cond: [{ $eq: ['$status', 'Fulfilled'] }, 1, 0] }
                    }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Get urgent requests count
        const urgentCount = await ResourceRequest.countDocuments({
            status: { $in: ['Pending', 'In Progress'] },
            urgentBy: { $gte: new Date(), $lte: new Date(Date.now() + 24 * 60 * 60 * 1000) }
        });

        // Get average response time (mock calculation)
        const fulfilledRequests = await ResourceRequest.find({
            status: 'Fulfilled',
            updatedAt: { $exists: true },
            createdAt: { $exists: true }
        }).select('createdAt updatedAt');

        let avgResponseTime = 0;
        if (fulfilledRequests.length > 0) {
            const totalTime = fulfilledRequests.reduce((sum, req) => {
                return sum + (new Date(req.updatedAt) - new Date(req.createdAt));
            }, 0);
            avgResponseTime = Math.round(totalTime / fulfilledRequests.length / (1000 * 60 * 60)); // Convert to hours
        }

        res.status(200).json({
            success: true,
            data: {
                statusStats,
                categoryStats,
                urgentCount,
                avgResponseTime: `${avgResponseTime} hours`,
                totalRequests: await ResourceRequest.countDocuments(),
                pendingRequests: await ResourceRequest.countDocuments({ status: 'Pending' }),
                fulfilledRequests: await ResourceRequest.countDocuments({ status: 'Fulfilled' })
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};
