import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Resource name is required'],
        trim: true
    },
    category: {
        type: String,
        required: [true, 'Resource category is required'],
        enum: [
            'medical_supplies',
            'food_water', 
            'shelter_materials',
            'rescue_equipment',
            'communication_tools',
            'transportation',
            'personnel',
            'emergency_services',
            'other'
        ]
    },
    type: {
        type: String,
        required: [true, 'Resource type is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    quantity: {
        available: { 
            type: Number, 
            required: true,
            min: 0
        },
        total: { 
            type: Number, 
            required: true,
            min: 0
        },
        unit: {
            type: String,
            required: true,
            enum: ['pieces', 'kg', 'liters', 'boxes', 'people', 'vehicles', 'sets', 'other']
        },
        reserved: { type: Number, default: 0, min: 0 },
        inUse: { type: Number, default: 0, min: 0 }
    },
    location: {
        name: { type: String, required: true },
        province: { type: String, required: true },
        district: { type: String, required: true },
        municipality: String,
        ward: String,
        coordinates: {
            latitude: { type: Number, required: true },
            longitude: { type: Number, required: true }
        },
        address: String,
        facilityType: {
            type: String,
            enum: ['hospital', 'warehouse', 'school', 'government_office', 'ngo_office', 'field_station', 'other']
        }
    },
    status: {
        type: String,
        enum: ['available', 'low_stock', 'out_of_stock', 'maintenance', 'deployment', 'damaged'],
        default: 'available'
    },
    provider: {
        organization: { type: String, required: true },
        contactPerson: {
            name: String,
            phone: String,
            email: String
        },
        type: {
            type: String,
            enum: ['government', 'ngo', 'international', 'private', 'volunteer'],
            default: 'government'
        }
    },
    specifications: {
        brand: String,
        model: String,
        serialNumber: String,
        expiryDate: Date,
        condition: {
            type: String,
            enum: ['new', 'good', 'fair', 'poor'],
            default: 'good'
        },
        technicalSpecs: mongoose.Schema.Types.Mixed
    },
    allocation: [{
        disasterId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Disaster'
        },
        requestId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'ResourceRequest'
        },
        quantity: { type: Number, required: true },
        allocatedAt: { type: Date, default: Date.now },
        allocatedBy: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User',
            required: true
        },
        status: {
            type: String,
            enum: ['allocated', 'dispatched', 'delivered', 'returned', 'lost'],
            default: 'allocated'
        },
        expectedReturn: Date,
        notes: String
    }],
    maintenanceLog: [{
        type: {
            type: String,
            enum: ['inspection', 'repair', 'replacement', 'cleaning', 'calibration']
        },
        description: String,
        performedBy: String,
        performedAt: { type: Date, default: Date.now },
        cost: Number,
        nextMaintenanceDate: Date
    }],
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    tags: [String], // For search and categorization
    isActive: { type: Boolean, default: true },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Virtual field for availability percentage
resourceSchema.virtual('availabilityPercent').get(function() {
    return this.quantity.total > 0 ? (this.quantity.available / this.quantity.total) * 100 : 0;
});

// Virtual field to check if resource needs replenishment
resourceSchema.virtual('needsReplenishment').get(function() {
    return this.quantity.available <= (this.quantity.total * 0.2); // 20% threshold
});

// Indexes for efficient queries
resourceSchema.index({ category: 1, type: 1 });
resourceSchema.index({ status: 1 });
resourceSchema.index({ 'location.province': 1, 'location.district': 1 });
resourceSchema.index({ 'location.coordinates': '2dsphere' });
resourceSchema.index({ priority: -1, createdAt: -1 });
resourceSchema.index({ tags: 1 });

// Pre-save middleware to update status based on quantity
resourceSchema.pre('save', function(next) {
    if (this.quantity.available === 0) {
        this.status = 'out_of_stock';
    } else if (this.quantity.available <= (this.quantity.total * 0.1)) {
        this.status = 'low_stock';
    } else if (this.status === 'out_of_stock' || this.status === 'low_stock') {
        this.status = 'available';
    }
    next();
});

export default mongoose.model('Resource', resourceSchema);
