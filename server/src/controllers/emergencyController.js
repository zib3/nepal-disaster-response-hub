import EmergencyContact from '../models/EmergencyContact.js';

// @desc    Get all emergency contacts with filtering
// @route   GET /api/emergency-contacts
// @access  Public
export const getEmergencyContacts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        
        // Build filter object
        let filter = { isActive: true };
        if (req.query.category) filter.category = req.query.category;
        if (req.query.province) filter['address.province'] = req.query.province;
        if (req.query.district) filter['address.district'] = req.query.district;
        if (req.query.priority) filter.priority = { $gte: parseInt(req.query.priority) };

        const total = await EmergencyContact.countDocuments(filter);
        const contacts = await EmergencyContact.find(filter)
            .populate('createdBy', 'name organization')
            .populate('verifiedBy', 'name')
            .sort({ category: 1, priority: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            success: true,
            count: contacts.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            data: contacts
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Get emergency contacts by category
// @route   GET /api/emergency-contacts/category/:category
// @access  Public
export const getContactsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const contacts = await EmergencyContact.find({ 
            category,
            isActive: true 
        })
            .sort({ priority: -1 })
            .select('name organization phones email address availability services');

        res.status(200).json({
            success: true,
            count: contacts.length,
            category,
            data: contacts
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Get emergency contacts by location
// @route   GET /api/emergency-contacts/location
// @access  Public
export const getContactsByLocation = async (req, res) => {
    try {
        const { province, district } = req.query;
        
        if (!province) {
            return res.status(400).json({
                success: false,
                message: 'Province is required'
            });
        }

        let filter = {
            isActive: true,
            $or: [
                { 'address.province': province },
                { 'serviceArea.province': province }
            ]
        };

        if (district) {
            filter.$or = [
                { 'address.province': province, 'address.district': district },
                { 'serviceArea.province': province, 'serviceArea.district': district }
            ];
        }

        const contacts = await EmergencyContact.find(filter)
            .sort({ category: 1, priority: -1 })
            .select('name organization category phones email address availability');

        res.status(200).json({
            success: true,
            count: contacts.length,
            location: { province, district },
            data: contacts
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Create emergency contact
// @route   POST /api/emergency-contacts
// @access  Private (Admin/Coordinator)
export const createEmergencyContact = async (req, res) => {
    try {
        const contactData = {
            ...req.body,
            createdBy: req.user.id
        };

        const contact = await EmergencyContact.create(contactData);
        
        const populatedContact = await EmergencyContact.findById(contact._id)
            .populate('createdBy', 'name organization');

        res.status(201).json({
            success: true,
            data: populatedContact
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Get single emergency contact
// @route   GET /api/emergency-contacts/:id
// @access  Public
export const getEmergencyContactById = async (req, res) => {
    try {
        const contact = await EmergencyContact.findById(req.params.id)
            .populate('createdBy', 'name organization')
            .populate('verifiedBy', 'name');

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Emergency contact not found'
            });
        }

        res.status(200).json({
            success: true,
            data: contact
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Update emergency contact
// @route   PUT /api/emergency-contacts/:id
// @access  Private (Admin/Coordinator/Creator)
export const updateEmergencyContact = async (req, res) => {
    try {
        let contact = await EmergencyContact.findById(req.params.id);

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Emergency contact not found'
            });
        }

        // Check ownership or admin/coordinator rights
        if (contact.createdBy.toString() !== req.user.id && !['admin', 'coordinator'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this contact'
            });
        }

        contact = await EmergencyContact.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        )
            .populate('createdBy', 'name organization')
            .populate('verifiedBy', 'name');

        res.status(200).json({
            success: true,
            data: contact
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Verify emergency contact
// @route   PUT /api/emergency-contacts/:id/verify
// @access  Private (Admin/Coordinator)
export const verifyEmergencyContact = async (req, res) => {
    try {
        const contact = await EmergencyContact.findByIdAndUpdate(
            req.params.id,
            {
                verifiedBy: req.user.id,
                lastVerified: new Date()
            },
            { new: true }
        )
            .populate('createdBy', 'name organization')
            .populate('verifiedBy', 'name');

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Emergency contact not found'
            });
        }

        res.status(200).json({
            success: true,
            data: contact,
            message: 'Contact verified successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Delete emergency contact
// @route   DELETE /api/emergency-contacts/:id
// @access  Private (Admin/Creator)
export const deleteEmergencyContact = async (req, res) => {
    try {
        const contact = await EmergencyContact.findById(req.params.id);

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Emergency contact not found'
            });
        }

        // Check ownership or admin rights
        if (contact.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this contact'
            });
        }

        await EmergencyContact.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Contact deleted successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Get emergency hotlines (critical contacts)
// @route   GET /api/emergency-contacts/hotlines
// @access  Public
export const getEmergencyHotlines = async (req, res) => {
    try {
        const hotlines = await EmergencyContact.find({
            isActive: true,
            'phones.type': 'Hotline',
            'availability.is24x7': true
        })
            .sort({ priority: -1, category: 1 })
            .select('name organization category phones')
            .limit(20);

        // Transform data to show only hotline numbers
        const transformedData = hotlines.map(contact => ({
            name: contact.name,
            organization: contact.organization,
            category: contact.category,
            hotlines: contact.phones.filter(phone => phone.type === 'Hotline' && phone.isActive)
        })).filter(contact => contact.hotlines.length > 0);

        res.status(200).json({
            success: true,
            count: transformedData.length,
            data: transformedData
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Search emergency contacts
// @route   GET /api/emergency-contacts/search
// @access  Public
export const searchEmergencyContacts = async (req, res) => {
    try {
        const { q, page = 1, limit = 10 } = req.query;
        
        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        const skip = (page - 1) * limit;

        const searchFilter = {
            isActive: true,
            $or: [
                { name: { $regex: q, $options: 'i' } },
                { organization: { $regex: q, $options: 'i' } },
                { category: { $regex: q, $options: 'i' } },
                { 'services.name': { $regex: q, $options: 'i' } }
            ]
        };

        const total = await EmergencyContact.countDocuments(searchFilter);
        const contacts = await EmergencyContact.find(searchFilter)
            .populate('createdBy', 'name organization')
            .sort({ priority: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            count: contacts.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: contacts,
            query: q
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};
