import express from 'express';
import auth from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import weatherService from '../services/weatherService.js';
import WeatherData from '../models/WeatherData.js';
import logger from '../config/logger.js';

const router = express.Router();

// @route   GET /api/weather/current
// @desc    Get current weather for all monitored locations
// @access  Private
router.get('/current', auth, async (req, res) => {
    try {
        const weatherData = await weatherService.getAllCurrentWeather();
        
        res.status(200).json({
            success: true,
            count: weatherData.length,
            data: weatherData
        });
    } catch (error) {
        logger.error('Error fetching current weather:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching weather data',
            error: error.message
        });
    }
});

// @route   GET /api/weather/location/:province/:district
// @desc    Get weather data for specific location
// @access  Private
router.get('/location/:province/:district', auth, async (req, res) => {
    try {
        const { province, district } = req.params;
        const weatherData = await weatherService.getLocationWeather(province, district);
        
        if (!weatherData) {
            return res.status(404).json({
                success: false,
                message: `Weather data not found for ${district}, ${province}`
            });
        }
        
        res.status(200).json({
            success: true,
            data: weatherData
        });
    } catch (error) {
        logger.error('Error fetching location weather:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching location weather',
            error: error.message
        });
    }
});

// @route   GET /api/weather/alerts
// @desc    Get active weather alerts
// @access  Private
router.get('/alerts', auth, async (req, res) => {
    try {
        const { severity } = req.query;
        
        let query = {
            'alerts.0': { $exists: true }, // Has at least one alert
            'alerts.expiresAt': { $gte: new Date() } // Alert not expired
        };
        
        if (severity) {
            query['alerts.severity'] = severity;
        }
        
        const weatherWithAlerts = await WeatherData.find(query).sort({ updatedAt: -1 });
        
        // Extract and flatten alerts
        const activeAlerts = [];
        weatherWithAlerts.forEach(weather => {
            weather.alerts.forEach(alert => {
                if (!alert.expiresAt || alert.expiresAt > new Date()) {
                    activeAlerts.push({
                        _id: alert._id,
                        location: weather.location,
                        type: alert.type,
                        severity: alert.severity,
                        description: alert.description,
                        issuedAt: alert.issuedAt,
                        expiresAt: alert.expiresAt
                    });
                }
            });
        });
        
        res.status(200).json({
            success: true,
            count: activeAlerts.length,
            data: activeAlerts
        });
    } catch (error) {
        logger.error('Error fetching weather alerts:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching weather alerts',
            error: error.message
        });
    }
});

// @route   GET /api/weather/forecast/:province/:district
// @desc    Get weather forecast for specific location
// @access  Private
router.get('/forecast/:province/:district', auth, async (req, res) => {
    try {
        const { province, district } = req.params;
        const { days = 5 } = req.query;
        
        const weatherData = await WeatherData.findOne({
            'location.province': province,
            'location.district': district
        }).sort({ updatedAt: -1 });
        
        if (!weatherData) {
            return res.status(404).json({
                success: false,
                message: `Weather forecast not available for ${district}, ${province}`
            });
        }
        
        const forecast = weatherData.forecast.slice(0, parseInt(days));
        
        res.status(200).json({
            success: true,
            location: weatherData.location,
            forecast,
            lastUpdated: weatherData.dataSource.lastUpdated
        });
    } catch (error) {
        logger.error('Error fetching weather forecast:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching weather forecast',
            error: error.message
        });
    }
});

// @route   POST /api/weather/update
// @desc    Manually trigger weather data update (Admin only)
// @access  Private (Admin)
router.post('/update', auth, authorize(['admin']), async (req, res) => {
    try {
        logger.info(`Weather update triggered by user: ${req.user._id}`);
        
        const result = await weatherService.updateAllLocationsWeather();
        
        res.status(200).json({
            success: true,
            message: 'Weather update completed',
            data: result
        });
    } catch (error) {
        logger.error('Error updating weather data:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error updating weather data',
            error: error.message
        });
    }
});

// @route   GET /api/weather/risk-assessment
// @desc    Get risk assessment for all locations
// @access  Private
router.get('/risk-assessment', auth, async (req, res) => {
    try {
        const { riskLevel } = req.query;
        
        let query = {};
        if (riskLevel) {
            query['riskAssessment.overallRisk'] = riskLevel;
        }
        
        const weatherData = await WeatherData.find(query)
            .select('location riskAssessment updatedAt')
            .sort({ 'riskAssessment.overallRisk': -1, updatedAt: -1 });
        
        // Group by risk level for summary
        const riskSummary = {
            extreme: 0,
            high: 0,
            moderate: 0,
            low: 0
        };
        
        weatherData.forEach(data => {
            riskSummary[data.riskAssessment.overallRisk]++;
        });
        
        res.status(200).json({
            success: true,
            summary: riskSummary,
            count: weatherData.length,
            data: weatherData
        });
    } catch (error) {
        logger.error('Error fetching risk assessment:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching risk assessment',
            error: error.message
        });
    }
});

// @route   GET /api/weather/statistics
// @desc    Get weather statistics and trends
// @access  Private
router.get('/statistics', auth, async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));
        
        const weatherData = await WeatherData.find({
            createdAt: { $gte: startDate }
        });
        
        // Calculate statistics
        const stats = {
            totalLocations: weatherData.length,
            averageTemperature: 0,
            averageHumidity: 0,
            totalPrecipitation: 0,
            activeAlerts: 0,
            highRiskLocations: 0
        };
        
        let tempSum = 0, humiditySum = 0, precipSum = 0;
        
        weatherData.forEach(data => {
            tempSum += data.current.temperature || 0;
            humiditySum += data.current.humidity || 0;
            precipSum += data.precipitation.daily || 0;
            
            if (data.alerts && data.alerts.length > 0) {
                stats.activeAlerts += data.alerts.length;
            }
            
            if (data.riskAssessment.overallRisk === 'high' || data.riskAssessment.overallRisk === 'extreme') {
                stats.highRiskLocations++;
            }
        });
        
        if (weatherData.length > 0) {
            stats.averageTemperature = Math.round(tempSum / weatherData.length * 10) / 10;
            stats.averageHumidity = Math.round(humiditySum / weatherData.length);
            stats.totalPrecipitation = Math.round(precipSum * 10) / 10;
        }
        
        res.status(200).json({
            success: true,
            period: `${days} days`,
            statistics: stats
        });
    } catch (error) {
        logger.error('Error fetching weather statistics:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching weather statistics',
            error: error.message
        });
    }
});

export default router;
