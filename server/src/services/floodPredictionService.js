import WeatherData from '../models/WeatherData.js';
import FloodPrediction from '../models/FloodPrediction.js';
import Alert from '../models/Alert.js';
import logger from '../config/logger.js';

class FloodPredictionService {
    constructor() {
        // Risk factors for flood prediction
        this.riskFactors = {
            rainfall: {
                low: 0,
                medium: 50,   // mm in 24h
                high: 100,    // mm in 24h
                critical: 200 // mm in 24h
            },
            riverLevels: {
                normal: 0,
                warning: 0.7,
                danger: 0.85,
                critical: 0.95
            },
            terrainRisk: {
                'mountains': 0.8,
                'hills': 0.6,
                'terai': 0.9,
                'valley': 0.4
            }
        };

        // High-risk areas in Nepal
        this.highRiskAreas = [
            { province: 'Province 1', district: 'Sunsari', risk: 0.9 },
            { province: 'Province 1', district: 'Morang', risk: 0.85 },
            { province: 'Province 2', district: 'Saptari', risk: 0.9 },
            { province: 'Province 2', district: 'Siraha', risk: 0.8 },
            { province: 'Bagmati', district: 'Sindhupalchok', risk: 0.7 },
            { province: 'Bagmati', district: 'Dhading', risk: 0.6 },
            { province: 'Gandaki', district: 'Gorkha', risk: 0.65 },
            { province: 'Gandaki', district: 'Lamjung', risk: 0.6 },
            { province: 'Lumbini', district: 'Nawalparasi', risk: 0.8 },
            { province: 'Lumbini', district: 'Kapilvastu', risk: 0.75 },
            { province: 'Karnali', district: 'Surkhet', risk: 0.7 },
            { province: 'Sudurpashchim', district: 'Kailali', risk: 0.8 }
        ];
    }

    /**
     * Analyze historical weather data to identify patterns
     */
    async analyzeHistoricalData(location, days = 30) {
        try {
            const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
            
            const historicalData = await WeatherData.find({
                $or: [
                    { 'location.province': location.province },
                    { 'location.district': location.district }
                ],
                timestamp: { $gte: startDate }
            }).sort({ timestamp: -1 });

            if (historicalData.length === 0) {
                return this.getDefaultAnalysis();
            }

            const analysis = {
                avgRainfall: 0,
                maxRainfall: 0,
                rainyDays: 0,
                avgHumidity: 0,
                temperatureTrend: 'stable',
                patterns: []
            };

            let totalRainfall = 0;
            let totalHumidity = 0;
            let rainyDayCount = 0;
            let maxRain = 0;

            historicalData.forEach(data => {
                const rainfall = data.current?.precipitation || 0;
                totalRainfall += rainfall;
                totalHumidity += data.current?.humidity || 0;
                
                if (rainfall > 1) rainyDayCount++;
                if (rainfall > maxRain) maxRain = rainfall;
            });

            analysis.avgRainfall = totalRainfall / historicalData.length;
            analysis.maxRainfall = maxRain;
            analysis.rainyDays = rainyDayCount;
            analysis.avgHumidity = totalHumidity / historicalData.length;

            // Identify concerning patterns
            if (analysis.avgRainfall > 10) {
                analysis.patterns.push('High average rainfall detected');
            }
            if (analysis.maxRainfall > 50) {
                analysis.patterns.push('Extreme rainfall events recorded');
            }
            if (analysis.rainyDays > days * 0.6) {
                analysis.patterns.push('Frequent rainfall pattern');
            }

            return analysis;
        } catch (error) {
            logger.error('Error analyzing historical data:', error);
            return this.getDefaultAnalysis();
        }
    }

    /**
     * Calculate flood risk score based on multiple factors
     */
    calculateFloodRisk(weatherData, location, historicalAnalysis) {
        let riskScore = 0;
        const factors = [];

        // Rainfall risk (40% weight)
        const rainfall = weatherData.current?.precipitation || 0;
        let rainfallRisk = 0;
        if (rainfall >= this.riskFactors.rainfall.critical) {
            rainfallRisk = 1.0;
        } else if (rainfall >= this.riskFactors.rainfall.high) {
            rainfallRisk = 0.8;
        } else if (rainfall >= this.riskFactors.rainfall.medium) {
            rainfallRisk = 0.5;
        } else {
            rainfallRisk = 0.2;
        }
        riskScore += rainfallRisk * 0.4;
        factors.push({ factor: 'rainfall', value: rainfall, risk: rainfallRisk });

        // Historical pattern risk (25% weight)
        let historialRisk = 0;
        if (historicalAnalysis.maxRainfall > 100) historialRisk += 0.4;
        if (historicalAnalysis.avgRainfall > 15) historialRisk += 0.3;
        if (historicalAnalysis.rainyDays > 20) historialRisk += 0.3;
        historialRisk = Math.min(historialRisk, 1.0);
        riskScore += historialRisk * 0.25;
        factors.push({ factor: 'historical', value: historicalAnalysis.maxRainfall, risk: historialRisk });

        // Location-based risk (20% weight)
        const locationRisk = this.getLocationRisk(location);
        riskScore += locationRisk * 0.2;
        factors.push({ factor: 'location', value: location.district, risk: locationRisk });

        // Weather conditions risk (10% weight)
        const humidity = weatherData.current?.humidity || 0;
        const windSpeed = weatherData.current?.windSpeed || 0;
        let weatherRisk = 0;
        if (humidity > 80) weatherRisk += 0.5;
        if (windSpeed > 25) weatherRisk += 0.3;
        if (weatherData.current?.conditions?.includes('storm')) weatherRisk += 0.2;
        weatherRisk = Math.min(weatherRisk, 1.0);
        riskScore += weatherRisk * 0.1;
        factors.push({ factor: 'weather', value: `${humidity}% humidity`, risk: weatherRisk });

        // Seasonal risk (5% weight)
        const month = new Date().getMonth();
        const seasonalRisk = (month >= 5 && month <= 9) ? 0.8 : 0.2; // Monsoon season
        riskScore += seasonalRisk * 0.05;
        factors.push({ factor: 'seasonal', value: `Month ${month + 1}`, risk: seasonalRisk });

        return {
            score: Math.min(riskScore, 1.0),
            level: this.getRiskLevel(riskScore),
            factors: factors,
            confidence: this.calculateConfidence(factors)
        };
    }

    /**
     * Get location-specific risk based on geographical factors
     */
    getLocationRisk(location) {
        const area = this.highRiskAreas.find(area => 
            area.province === location.province && area.district === location.district
        );
        return area ? area.risk : 0.3; // Default moderate risk
    }

    /**
     * Convert risk score to human-readable level
     */
    getRiskLevel(score) {
        if (score >= 0.8) return 'Critical';
        if (score >= 0.6) return 'High';
        if (score >= 0.4) return 'Medium';
        if (score >= 0.2) return 'Low';
        return 'Minimal';
    }

    /**
     * Calculate prediction confidence based on available data
     */
    calculateConfidence(factors) {
        let confidence = 0.5; // Base confidence
        
        // Increase confidence based on data quality
        factors.forEach(factor => {
            if (factor.factor === 'rainfall' && factor.value > 0) confidence += 0.2;
            if (factor.factor === 'historical' && factor.value > 0) confidence += 0.15;
            if (factor.factor === 'location') confidence += 0.1;
        });

        return Math.min(confidence, 0.95);
    }

    /**
     * Generate flood prediction for a specific location
     */
    async generatePrediction(location, weatherData, userId = null) {
        try {
            logger.info(`Generating flood prediction for ${location.district}, ${location.province}`);

            // Analyze historical data
            const historicalAnalysis = await this.analyzeHistoricalData(location);

            // Calculate risk
            const riskAssessment = this.calculateFloodRisk(weatherData, location, historicalAnalysis);

            // Generate recommendations
            const recommendations = this.generateRecommendations(riskAssessment);

            // Create prediction record
            const prediction = new FloodPrediction({
                location: location,
                weatherData: {
                    current: weatherData.current,
                    forecast: weatherData.forecast
                },
                riskScore: riskAssessment.score,
                riskLevel: riskAssessment.level,
                confidence: riskAssessment.confidence,
                factors: riskAssessment.factors,
                historicalAnalysis: historicalAnalysis,
                recommendations: recommendations,
                validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                createdBy: userId
            });

            await prediction.save();

            // Generate alert if risk is high
            if (riskAssessment.score >= 0.6) {
                await this.generateFloodAlert(prediction);
            }

            logger.info(`Flood prediction generated with ${riskAssessment.level} risk level`);
            return prediction;
        } catch (error) {
            logger.error('Error generating flood prediction:', error);
            throw error;
        }
    }

    /**
     * Generate actionable recommendations based on risk level
     */
    generateRecommendations(riskAssessment) {
        const recommendations = [];
        
        switch (riskAssessment.level) {
            case 'Critical':
                recommendations.push({
                    priority: 'immediate',
                    action: 'Evacuate low-lying areas immediately',
                    description: 'Move to higher ground and avoid flood-prone areas'
                });
                recommendations.push({
                    priority: 'immediate',
                    action: 'Activate emergency response teams',
                    description: 'Deploy rescue teams and emergency equipment'
                });
                recommendations.push({
                    priority: 'immediate',
                    action: 'Issue public warnings',
                    description: 'Alert all residents through emergency broadcast systems'
                });
                break;

            case 'High':
                recommendations.push({
                    priority: 'urgent',
                    action: 'Prepare for potential evacuation',
                    description: 'Keep emergency supplies ready and monitor conditions'
                });
                recommendations.push({
                    priority: 'urgent',
                    action: 'Monitor river levels closely',
                    description: 'Increase monitoring frequency and deploy sensors'
                });
                recommendations.push({
                    priority: 'important',
                    action: 'Alert vulnerable communities',
                    description: 'Notify residents in flood-prone areas'
                });
                break;

            case 'Medium':
                recommendations.push({
                    priority: 'important',
                    action: 'Increase monitoring',
                    description: 'Enhanced weather and water level monitoring'
                });
                recommendations.push({
                    priority: 'advisory',
                    action: 'Prepare emergency supplies',
                    description: 'Stock emergency kits and review evacuation plans'
                });
                break;

            case 'Low':
                recommendations.push({
                    priority: 'advisory',
                    action: 'Routine monitoring',
                    description: 'Continue standard weather monitoring procedures'
                });
                break;
        }

        return recommendations;
    }

    /**
     * Generate automatic flood alert for high-risk predictions
     */
    async generateFloodAlert(prediction) {
        try {
            const alert = new Alert({
                type: 'Flood',
                severity: prediction.riskLevel,
                location: `${prediction.location.district}, ${prediction.location.province}`,
                message: `Flood prediction indicates ${prediction.riskLevel.toLowerCase()} risk. Risk score: ${(prediction.riskScore * 100).toFixed(1)}%. ${prediction.recommendations[0]?.description || 'Take necessary precautions.'}`,
                affected: this.estimateAffectedPopulation(prediction.location, prediction.riskScore),
                status: 'Active',
                createdBy: prediction.createdBy
            });

            await alert.save();
            logger.info(`Auto-generated flood alert for ${prediction.location.district}`);
            return alert;
        } catch (error) {
            logger.error('Error generating flood alert:', error);
        }
    }

    /**
     * Estimate affected population based on location and risk score
     */
    estimateAffectedPopulation(location, riskScore) {
        // Estimated population data for Nepal districts (simplified)
        const populationData = {
            'Kathmandu': 1744240,
            'Morang': 965370,
            'Sunsari': 763487,
            'Chitwan': 579984,
            'Surkhet': 350804
        };

        const basePopulation = populationData[location.district] || 200000;
        const vulnerabilityFactor = 0.15; // 15% of population in flood-prone areas
        
        return Math.round(basePopulation * vulnerabilityFactor * riskScore);
    }

    /**
     * Get all recent predictions for a location
     */
    async getLocationPredictions(location, limit = 10) {
        return await FloodPrediction.find({
            $or: [
                { 'location.province': location.province },
                { 'location.district': location.district }
            ]
        })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('createdBy', 'name organization');
    }

    /**
     * Get default analysis when no historical data is available
     */
    getDefaultAnalysis() {
        return {
            avgRainfall: 5,
            maxRainfall: 20,
            rainyDays: 8,
            avgHumidity: 65,
            temperatureTrend: 'stable',
            patterns: ['Insufficient historical data for detailed analysis']
        };
    }

    /**
     * Batch process predictions for all high-risk areas
     */
    async generateBatchPredictions(userId) {
        const results = [];
        
        for (const area of this.highRiskAreas) {
            try {
                // Get latest weather data for the area
                const weatherData = await WeatherData.findOne({
                    $or: [
                        { 'location.province': area.province },
                        { 'location.district': area.district }
                    ]
                }).sort({ timestamp: -1 });

                if (weatherData) {
                    const prediction = await this.generatePrediction(
                        { province: area.province, district: area.district },
                        weatherData,
                        userId
                    );
                    results.push(prediction);
                }
            } catch (error) {
                logger.error(`Error generating prediction for ${area.district}:`, error);
            }
        }

        logger.info(`Generated ${results.length} flood predictions in batch`);
        return results;
    }
}

export default new FloodPredictionService();
