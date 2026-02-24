import mongoose from 'mongoose';

const emergencyContactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Contact name is required'],
        trim: true
    },
    organization: {
        type: String,
        required: [true, 'Organization is required'],
        trim: true
    },
    category: {
        type: String,
        enum: ['Police', 'Fire', 'Medical', 'Rescue', 'Government', 'NGO', 'Military', 'Utility', 'Transportation', 'Communication'],
        required: [true, 'Category is required']
    },
    phones: [{
        number: { type: String, required: true },
        type: { type: String, enum: ['Primary', 'Secondary', 'Emergency', 'Hotline'], default: 'Primary' },
        isActive: { type: Boolean, default: true }
    }],
    email: {
        type: String,
        lowercase: true,
        match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'Please enter a valid email']
    },
    address: {
        province: String,
        district: String,
        municipality: String,
        ward: String,
        street: String,
        coordinates: {
            latitude: Number,
            longitude: Number
        }
    },
    serviceArea: [{
        province: String,
        district: String
    }],
    availability: {
        is24x7: { type: Boolean, default: true },
        schedule: {
            monday: { start: String, end: String },
            tuesday: { start: String, end: String },
            wednesday: { start: String, end: String },
            thursday: { start: String, end: String },
            friday: { start: String, end: String },
            saturday: { start: String, end: String },
            sunday: { start: String, end: String }
        }
    },
    services: [{
        name: String,
        description: String,
        isActive: { type: Boolean, default: true }
    }],
    priority: {
        type: Number,
        min: 1,
        max: 5,
        default: 3
    },
    isActive: {
        type: Boolean,
        default: true
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastVerified: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Index for efficient searching
emergencyContactSchema.index({ category: 1, priority: -1 });
emergencyContactSchema.index({ 'address.province': 1, 'address.district': 1 });
emergencyContactSchema.index({ isActive: 1 });

export default mongoose.model('EmergencyContact', emergencyContactSchema);
