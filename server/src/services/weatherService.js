import axios from 'axios';
import WeatherData from '../models/WeatherData.js';
import logger from '../config/logger.js';

class WeatherService {
    constructor() {
        this.apiKey = process.env.OPENWEATHER_API_KEY;
        this.baseUrl = 'http://api.openweathermap.org/data/2.5';
        this.geoUrl = 'http://api.openweathermap.org/geo/1.0';
        
        // Major cities/districts in Nepal for monitoring
        this.nepalLocations = [
            { name: 'Kathmandu', province: 'Bagmati', district: 'Kathmandu', lat: 27.7172, lon: 85.3240 },
            { name: 'Pokhara', province: 'Gandaki', district: 'Kaski', lat: 28.2096, lon: 83.9856 },
            { name: 'Chitwan', province: 'Bagmati', district: 'Chitwan', lat: 27.5291, lon: 84.3542 },
            { name: 'Biratnagar', province: 'Koshi', district: 'Morang', lat: 26.4525, lon: 87.2718 },
            { name: 'Birgunj', province: 'Madhesh', district: 'Parsa', lat: 27.0058, lon: 84.8761 },
            { name: 'Dharan', province: 'Koshi', district: 'Sunsari', lat: 26.8054, lon: 87.2847 },
            { name: 'Butwal', province: 'Lumbini', district: 'Rupandehi', lat: 27.7000, lon: 83.4486 },
            { name: 'Nepalgunj', province: 'Lumbini', district: 'Banke', lat: 28.0500, lon: 81.6167 },
            { name: 'Dhangadhi', province: 'Sudurpaschim', district: 'Kailali', lat: 28.6833, lon: 80.5833 },
            { name: 'Janakpur', province: 'Madhesh', district: 'Dhanusha', lat: 26.7288, lon: 85.9267 }
        ];
    }

    async getCurrentWeather(lat, lon) {
        try {
            const response = await axios.get(`${this.baseUrl}/weather`, {
                params: {
                    lat,
                    lon,
                    appid: this.apiKey || 'demo_key',
                    units: 'metric'
                },
                timeout: 5000
            });

            return this.formatCurrentWeatherData(response.data);
        } catch (error) {
            logger.error('Error fetching current weather:', error.message);
            return this.getMockWeatherData(lat, lon);
        }
    }

    async getWeatherForecast(lat, lon) {
        try {
            const response = await axios.get(`${this.baseUrl}/forecast`, {
                params: {
                    lat,
                    lon,
                    appid: this.apiKey || 'demo_key',
                    units: 'metric'
                },
                timeout: 5000
            });

            return this.formatForecastData(response.data);
        } catch (error) {
            logger.error('Error fetching weather forecast:', error.message);
            return this.getMockForecastData();
        }
    }

    formatCurrentWeatherData(data) {
        return {
            temperature: data.main.temp,
            humidity: data.main.humidity,
            pressure: data.main.pressure,
            windSpeed: data.wind?.speed * 3.6 || 0, // Convert m/s to km/h
            windDirection: data.wind?.deg || 0,
            visibility: data.visibility ? data.visibility / 1000 : 10, // Convert m to km
            cloudCover: data.clouds.all,
            condition: data.weather[0].main,
            description: data.weather[0].description,
            uvIndex: 0 // Not available in current weather API
        };
    }

    formatForecastData(data) {
        const forecast = [];
        const dailyData = {};

        data.list.forEach(item => {
            const date = new Date(item.dt * 1000).toDateString();
            if (!dailyData[date]) {
                dailyData[date] = {
                    date: new Date(item.dt * 1000),
                    temperatures: [],
                    precipitation: 0,
                    condition: item.weather[0].main,
                    windSpeed: item.wind.speed * 3.6
                };
            }
            
            dailyData[date].temperatures.push(item.main.temp);
            if (item.rain) {
                dailyData[date].precipitation += item.rain['3h'] || 0;
            }
        });

        Object.values(dailyData).forEach(day => {
            forecast.push({
                date: day.date,
                temperature: {
                    min: Math.min(...day.temperatures),
                    max: Math.max(...day.temperatures)
                },
                precipitation: {
                    probability: day.precipitation > 0 ? 70 : 20,
                    amount: day.precipitation
                },
                condition: day.condition,
                windSpeed: day.windSpeed
            });
        });

        return forecast.slice(0, 5); // Return 5-day forecast
    }

    async updateAllLocationsWeather() {
        logger.info('Starting weather data update for all Nepal locations...');
        
        const updatePromises = this.nepalLocations.map(location => 
            this.updateLocationWeather(location)
        );

        try {
            const results = await Promise.allSettled(updatePromises);
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            
            logger.info(`Weather update completed. Successful: ${successful}, Failed: ${failed}`);
            return { successful, failed };
        } catch (error) {
            logger.error('Error in batch weather update:', error.message);
            throw error;
        }
    }

    async updateLocationWeather(location) {
        try {
            const [current, forecast] = await Promise.all([
                this.getCurrentWeather(location.lat, location.lon),
                this.getWeatherForecast(location.lat, location.lon)
            ]);

            const weatherData = {
                location: {
                    name: location.name,
                    province: location.province,
                    district: location.district,
                    coordinates: {
                        latitude: location.lat,
                        longitude: location.lon
                    }
                },
                current,
                precipitation: {
                    current: current.precipitation || 0,
                    daily: forecast[0]?.precipitation?.amount || 0,
                    weekly: forecast.reduce((sum, day) => sum + (day.precipitation?.amount || 0), 0)
                },
                forecast,
                alerts: this.generateWeatherAlerts(current, forecast),
                riskAssessment: this.assessRisks(current, forecast),
                dataSource: {
                    provider: 'openweather',
                    lastUpdated: new Date()
                }
            };

            // Upsert weather data
            await WeatherData.findOneAndUpdate(
                { 
                    'location.name': location.name,
                    'location.district': location.district 
                },
                weatherData,
                { 
                    upsert: true, 
                    new: true,
                    setDefaultsOnInsert: true 
                }
            );

            logger.info(`Updated weather data for ${location.name}`);
            return weatherData;

        } catch (error) {
            logger.error(`Error updating weather for ${location.name}:`, error.message);
            throw error;
        }
    }

    generateWeatherAlerts(current, forecast) {
        const alerts = [];
        
        // High temperature alert
        if (current.temperature > 40) {
            alerts.push({
                type: 'heat_warning',
                severity: current.temperature > 45 ? 'extreme' : 'high',
                description: `Extreme heat warning. Temperature: ${current.temperature}°C`,
                issuedAt: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            });
        }

        // Heavy rain alert
        const totalRain = forecast.reduce((sum, day) => sum + (day.precipitation?.amount || 0), 0);
        if (totalRain > 100) {
            alerts.push({
                type: 'flood_warning',
                severity: totalRain > 200 ? 'extreme' : 'high',
                description: `Heavy rainfall expected. Total forecast: ${totalRain.toFixed(1)}mm`,
                issuedAt: new Date(),
                expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000)
            });
        }

        // High wind alert
        if (current.windSpeed > 50) {
            alerts.push({
                type: 'wind_warning',
                severity: current.windSpeed > 80 ? 'extreme' : 'high',
                description: `Strong winds expected. Speed: ${current.windSpeed.toFixed(1)} km/h`,
                issuedAt: new Date(),
                expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000)
            });
        }

        return alerts;
    }

    assessRisks(current, forecast) {
        let floodRisk = 'low';
        let landslideRisk = 'low';

        // Assess flood risk based on precipitation and humidity
        const totalRain = forecast.reduce((sum, day) => sum + (day.precipitation?.amount || 0), 0);
        if (totalRain > 200 || (totalRain > 100 && current.humidity > 90)) {
            floodRisk = 'extreme';
        } else if (totalRain > 100 || current.humidity > 85) {
            floodRisk = 'high';
        } else if (totalRain > 50) {
            floodRisk = 'moderate';
        }

        // Assess landslide risk (similar factors plus temperature for soil stability)
        if (totalRain > 150 && current.temperature < 15) {
            landslideRisk = 'high';
        } else if (totalRain > 100) {
            landslideRisk = 'moderate';
        }

        const overallRisk = floodRisk === 'extreme' || landslideRisk === 'extreme' 
            ? 'extreme' 
            : floodRisk === 'high' || landslideRisk === 'high' 
            ? 'high' 
            : floodRisk === 'moderate' || landslideRisk === 'moderate' 
            ? 'moderate' 
            : 'low';

        return { floodRisk, landslideRisk, overallRisk };
    }

    // Mock data for development/demo purposes
    getMockWeatherData(lat, lon) {
        const conditions = ['Clear', 'Clouds', 'Rain', 'Thunderstorm'];
        const condition = conditions[Math.floor(Math.random() * conditions.length)];
        
        return {
            temperature: 15 + Math.random() * 20,
            humidity: 40 + Math.random() * 40,
            pressure: 1000 + Math.random() * 50,
            windSpeed: Math.random() * 30,
            windDirection: Math.random() * 360,
            visibility: 5 + Math.random() * 10,
            cloudCover: Math.random() * 100,
            condition,
            description: condition.toLowerCase(),
            uvIndex: Math.random() * 10
        };
    }

    getMockForecastData() {
        const forecast = [];
        for (let i = 1; i <= 5; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            
            forecast.push({
                date,
                temperature: {
                    min: 10 + Math.random() * 15,
                    max: 20 + Math.random() * 15
                },
                precipitation: {
                    probability: Math.random() * 100,
                    amount: Math.random() * 20
                },
                condition: ['Clear', 'Clouds', 'Rain'][Math.floor(Math.random() * 3)],
                windSpeed: Math.random() * 25
            });
        }
        return forecast;
    }

    async getLocationWeather(province, district) {
        try {
            return await WeatherData.findOne({
                'location.province': province,
                'location.district': district
            }).sort({ updatedAt: -1 });
        } catch (error) {
            logger.error('Error fetching location weather:', error.message);
            return null;
        }
    }

    async getAllCurrentWeather() {
        try {
            return await WeatherData.find({
                updatedAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } // Last 2 hours
            }).sort({ updatedAt: -1 });
        } catch (error) {
            logger.error('Error fetching all weather data:', error.message);
            return [];
        }
    }
}

export default new WeatherService();
