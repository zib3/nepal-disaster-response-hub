import mongoose from 'mongoose';

const resourceRequestSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Request title is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Request description is required'],
        trim: true
    },
    category: {
        type: String,
        enum: ['Medical', 'Food', 'Shelter', 'Water', 'Clothing', 'Transportation', 'Equipment', 'Personnel', 'Other'],
        required: [true, 'Category is required']
    },
    priority: {
        type: String,
        enum: ['Critical', 'High', 'Medium', 'Low'],
        default: 'Medium'
    },
    status: {
        type: String,
        enum: ['Pending', 'In Progress', 'Partially Fulfilled', 'Fulfilled', 'Cancelled'],
        default: 'Pending'
    },
    location: {
        province: { type: String, required: true },
        district: { type: String, required: true },
        municipality: String,
        ward: String,
        coordinates: {
            latitude: Number,
            longitude: Number
        },
        address: String
    },
    requiredQuantity: {
        type: Number,
        required: [true, 'Required quantity is required']
    },
    fulfilledQuantity: {
        type: Number,
        default: 0
    },
    unit: {
        type: String,
        required: [true, 'Unit is required'],
        trim: true
    },
    urgentBy: {
        type: Date,
        required: [true, 'Urgency date is required']
    },
    contactPerson: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        email: String,
        organization: String
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    relatedDisaster: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Disaster'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedTeam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    estimatedCost: {
        amount: Number,
        currency: { type: String, default: 'NPR' }
    },
    notes: String
}, {
    timestamps: true
});

// Index for efficient searching
resourceRequestSchema.index({ status: 1, priority: -1 });
resourceRequestSchema.index({ category: 1, createdAt: -1 });
resourceRequestSchema.index({ 'location.province': 1, 'location.district': 1 });
resourceRequestSchema.index({ urgentBy: 1 });

export default mongoose.model('ResourceRequest', resourceRequestSchema);
