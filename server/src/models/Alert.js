import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Alert title is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true
    },
    type: {
        type: String,
        required: [true, 'Alert type is required'],
        enum: ['weather', 'earthquake', 'flood', 'fire', 'health', 'security', 'system', 'general'],
        trim: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['active', 'monitoring', 'resolved', 'expired'],
        default: 'active'
    },
    targetRoles: [{
        type: String,
        enum: ['admin', 'coordinator', 'responder', 'viewer', 'public']
    }],
    targetRegions: [{
        type: String,
        trim: true
    }],
    coordinates: {
        lat: {
            type: Number,
            min: -90,
            max: 90
        },
        lng: {
            type: Number,
            min: -180,
            max: 180
        }
    },
    radius: {
        type: Number, // in kilometers
        min: 0,
        default: 10
    },
    expiresAt: {
        type: Date
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

export default mongoose.model('Alert', alertSchema);
