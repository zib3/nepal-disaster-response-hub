import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
    type: {
        type: String,
        required: [true, 'Alert type is required'],
        trim: true
    },
    location: {
        type: String,
        required: [true, 'Location is required'],
        trim: true
    },
    severity: {
        type: String,
        enum: ['Critical', 'High', 'Medium', 'Low'],
        default: 'Medium'
    },
    status: {
        type: String,
        enum: ['Active', 'Monitoring', 'Advisory', 'Resolved'],
        default: 'Active'
    },
    affected: {
        type: Number,
        required: [true, 'Affected number is required']
    },
    issuedAt: {
        type: Date,
        default: Date.now
    },
    resolvedAt: {
        type: Date
    },
    message: {
        type: String,
        trim: true
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
