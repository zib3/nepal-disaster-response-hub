import mongoose from 'mongoose';

const floodPredictionSchema = new mongoose.Schema({
    location: {
        name: { type: String, required: true },
        province: { type: String, required: true },
        district: { type: String, required: true },
        municipality: String,
        coordinates: {
            latitude: { type: Number, required: true },
            longitude: { type: Number, required: true }
        },
        riverBasin: String,
        elevation: Number // meters above sea level
    },
    prediction: {
        riskLevel: {
            type: String,
            enum: ['low', 'moderate', 'high', 'extreme'],
            required: true
        },
        confidence: {
            type: Number,
            min: 0,
            max: 100,
            required: true
        },
        probability: {
            type: Number,
            min: 0,
            max: 100,
            required: true
        },
        predictedDate: Date,
        validUntil: { type: Date, required: true },
        severity: {
            waterLevel: Number, // meters above normal
            affectedArea: Number, // square kilometers
            estimatedDuration: Number, // hours
            populationAtRisk: Number
        }
    },
    inputData: {
        weatherData: {
            currentPrecipitation: Number, // mm
            forecastPrecipitation: Number, // mm over next 24-72 hours
            temperature: Number,
            humidity: Number,
            windSpeed: Number,
            pressure: Number
        },
        historicalData: {
            avgRainfall: Number,
            maxRecordedRainfall: Number,
            previousFloodEvents: Number,
            seasonalPattern: String
        },
        geographicalFactors: {
            soilSaturation: Number, // percentage
            snowMelt: Number, // mm equivalent
            riverLevel: Number, // meters
            damStatus: String,
            deforestation: Number // percentage change
        },
        humanFactors: {
            urbanization: Number, // percentage
            drainageCapacity: Number, // percentage of original
            populationDensity: Number // per sq km
        }
    },
    modelInfo: {
        version: { type: String, required: true },
        algorithm: { type: String, required: true },
        trainingData: {
            startDate: Date,
            endDate: Date,
            recordCount: Number
        },
        accuracy: {
            overall: Number,
            precision: Number,
            recall: Number,
            f1Score: Number
        },
        processingTime: Number // milliseconds
    },
    alerts: [{
        level: {
            type: String,
            enum: ['watch', 'warning', 'emergency'],
            required: true
        },
        message: { type: String, required: true },
        actionRequired: [String],
        targetAudience: [String], // ['public', 'responders', 'authorities']
        issuedAt: { type: Date, default: Date.now },
        expiresAt: Date,
        sent: { type: Boolean, default: false },
        channels: [String] // ['sms', 'email', 'app', 'radio']
    }],
    verification: {
        actualEvent: {
            occurred: { type: Boolean, default: false },
            severity: String,
            impactArea: Number,
            casualties: Number,
            damageAssessment: String
        },
        accuracy: {
            riskLevelAccurate: Boolean,
            timingAccurate: Boolean,
            severityAccurate: Boolean,
            overallAccuracy: Number
        },
        feedback: [{
            source: String, // 'field_report', 'official_data', 'citizen_report'
            accuracy: Number,
            comments: String,
            reportedAt: { type: Date, default: Date.now }
        }]
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'verified', 'false_positive'],
        default: 'active'
    },
    tags: [String],
    createdBy: {
        type: String,
        default: 'AI_SYSTEM'
    },
    metadata: {
        dataQuality: {
            completeness: Number, // percentage
            reliability: Number, // percentage
            timeliness: Number // minutes since last update
        },
        computationMetrics: {
            cpuUsage: Number,
            memoryUsage: Number,
            executionTime: Number
        }
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
floodPredictionSchema.index({ 'location.province': 1, 'location.district': 1 });
floodPredictionSchema.index({ 'location.coordinates': '2dsphere' });
floodPredictionSchema.index({ 'prediction.riskLevel': 1, status: 1 });
floodPredictionSchema.index({ 'prediction.validUntil': 1 });
floodPredictionSchema.index({ createdAt: -1 });
floodPredictionSchema.index({ 'prediction.predictedDate': 1 });

// Virtual field for time remaining until prediction expires
floodPredictionSchema.virtual('timeRemaining').get(function() {
    return this.prediction.validUntil - new Date();
});

// Virtual field to check if prediction is still valid
floodPredictionSchema.virtual('isValid').get(function() {
    return new Date() < this.prediction.validUntil;
});

// Method to check if alert should be escalated
floodPredictionSchema.methods.shouldEscalate = function() {
    return this.prediction.riskLevel === 'extreme' && this.prediction.confidence > 80;
};

export default mongoose.model('FloodPrediction', floodPredictionSchema);
