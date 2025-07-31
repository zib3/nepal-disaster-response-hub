import mongoose from 'mongoose';

const disasterSchema = new mongoose.Schema({
    type: {
        type: String,
        required: [true, 'Disaster type is required'],
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
    affected: {
        type: Number,
        required: [true, 'Affected number is required'],
    },
    reportedAt: {
        type: Date,
        default: Date.now
    },
    description: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

export default mongoose.model('Disaster', disasterSchema);
