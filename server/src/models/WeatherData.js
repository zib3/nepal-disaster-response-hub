import mongoose from 'mongoose';

const weatherDataSchema = new mongoose.Schema({
    location: {
        name: { type: String, required: true },
        province: { type: String, required: true },
        district: { type: String, required: true },
        coordinates: {
            latitude: { type: Number, required: true },
            longitude: { type: Number, required: true }
        }
    },
    current: {
        temperature: { type: Number, required: true }, // Celsius
        humidity: { type: Number, required: true }, // Percentage
        pressure: { type: Number, required: true }, // hPa
        windSpeed: { type: Number, required: true }, // km/h
        windDirection: { type: Number }, // degrees
        visibility: { type: Number }, // km
        uvIndex: { type: Number },
        cloudCover: { type: Number }, // percentage
        condition: { type: String, required: true }, // Clear, Rainy, Cloudy, etc.
        description: { type: String }
    },
    precipitation: {
        current: { type: Number, default: 0 }, // mm/h
        daily: { type: Number, default: 0 }, // mm/day
        weekly: { type: Number, default: 0 } // mm/week
    },
    alerts: [{
        type: { 
            type: String, 
            enum: ['flood_warning', 'storm_warning', 'heat_warning', 'cold_warning', 'wind_warning'] 
        },
        severity: { 
            type: String, 
            enum: ['low', 'moderate', 'high', 'extreme'] 
        },
        description: String,
        issuedAt: { type: Date, default: Date.now },
        expiresAt: Date
    }],
    forecast: [{
        date: { type: Date, required: true },
        temperature: {
            min: Number,
            max: Number
        },
        precipitation: {
            probability: Number, // percentage
            amount: Number // mm
        },
        condition: String,
        windSpeed: Number
    }],
    dataSource: {
        provider: { type: String, default: 'openweather' },
        lastUpdated: { type: Date, default: Date.now }
    },
    riskAssessment: {
        floodRisk: { 
            type: String, 
            enum: ['low', 'moderate', 'high', 'extreme'], 
            default: 'low' 
        },
        landslideRisk: { 
            type: String, 
            enum: ['low', 'moderate', 'high', 'extreme'], 
            default: 'low' 
        },
        overallRisk: { 
            type: String, 
            enum: ['low', 'moderate', 'high', 'extreme'], 
            default: 'low' 
        }
    }
}, {
    timestamps: true
});

// Index for efficient location-based queries
weatherDataSchema.index({ 'location.province': 1, 'location.district': 1 });
weatherDataSchema.index({ 'location.coordinates': '2dsphere' });
weatherDataSchema.index({ updatedAt: -1 });

export default mongoose.model('WeatherData', weatherDataSchema);
