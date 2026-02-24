import mongoose from 'mongoose';

const disasterSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Disaster title is required'],
        trim: true
    },
    type: {
        type: String,
        required: [true, 'Disaster type is required'],
        enum: ['Earthquake', 'Flood', 'Landslide', 'Fire', 'Drought', 'Cyclone', 'Avalanche', 'Epidemic', 'Industrial Accident', 'Other'],
        trim: true
    },
    location: {
        province: { type: String, required: true },
        district: { type: String, required: true },
        municipality: String,
        ward: String,
        coordinates: {
            latitude: { type: Number, required: true },
            longitude: { type: Number, required: true }
        },
        address: String
    },
    severity: {
        type: String,
        enum: ['Critical', 'High', 'Medium', 'Low'],
        default: 'Medium'
    },
    status: {
        type: String,
        enum: ['Ongoing', 'Monitoring', 'Resolved', 'Under Investigation'],
        default: 'Ongoing'
    },
    affected: {
        casualties: {
            deaths: { type: Number, default: 0 },
            injured: { type: Number, default: 0 },
            missing: { type: Number, default: 0 }
        },
        displaced: { type: Number, default: 0 },
        housesDestroyed: { type: Number, default: 0 },
        housesDamaged: { type: Number, default: 0 },
        totalAffected: { type: Number, required: true }
    },
    reportedAt: {
        type: Date,
        default: Date.now
    },
    resolvedAt: {
        type: Date
    },
    description: {
        type: String,
        trim: true,
        required: [true, 'Description is required']
    },
    images: [{
        url: String,
        caption: String,
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],
    source: {
        type: String,
        enum: ['Government', 'NGO', 'Media', 'Social Media', 'Field Report', 'Satellite', 'Other'],
        default: 'Field Report'
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    responseTeams: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    estimatedDamage: {
        amount: Number,
        currency: { type: String, default: 'NPR' },
        description: String
    },
    weatherConditions: {
        temperature: Number,
        humidity: Number,
        windSpeed: Number,
        precipitation: Number,
        visibility: Number,
        conditions: String
    },
    updates: [{
        message: String,
        timestamp: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        priority: { type: String, enum: ['Critical', 'High', 'Medium', 'Low'], default: 'Medium' }
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Index for efficient searching
disasterSchema.index({ type: 1, severity: -1 });
disasterSchema.index({ 'location.province': 1, 'location.district': 1 });
disasterSchema.index({ status: 1, reportedAt: -1 });
disasterSchema.index({ isVerified: 1 });

export default mongoose.model('Disaster', disasterSchema);
