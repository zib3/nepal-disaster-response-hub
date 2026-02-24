import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Disaster from '../models/Disaster.js';
import Alert from '../models/Alert.js';
import WeatherData from '../models/WeatherData.js';
import Resource from '../models/Resource.js';
import connectDB from '../config/database.js';
import logger from '../config/logger.js';

// Sample data generators
const provinces = ['Bagmati', 'Gandaki', 'Koshi', 'Madhesh', 'Lumbini', 'Karnali', 'Sudurpaschim'];
const districts = {
    'Bagmati': ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Chitwan', 'Nuwakot'],
    'Gandaki': ['Kaski', 'Gorkha', 'Lamjung', 'Parbat'],
    'Koshi': ['Morang', 'Sunsari', 'Jhapa', 'Ilam'],
    'Madhesh': ['Parsa', 'Bara', 'Rautahat', 'Saptari'],
    'Lumbini': ['Rupandehi', 'Kapilvastu', 'Dang', 'Banke'],
    'Karnali': ['Surkhet', 'Dailekh', 'Jumla'],
    'Sudurpaschim': ['Kailali', 'Kanchanpur', 'Doti']
};

const disasterTypes = ['Earthquake', 'Flood', 'Landslide', 'Fire', 'Drought', 'Cyclone'];
const severityLevels = ['Critical', 'High', 'Medium', 'Low'];
const statusTypes = ['Ongoing', 'Monitoring', 'Resolved'];

class SampleDataSeeder {
    constructor() {
        this.users = [];
        this.disasters = [];
    }

    async seed() {
        try {
            await connectDB();
            
            logger.info('🌱 Starting database seeding...');
            
            // Clear existing data
            await this.clearDatabase();
            
            // Create sample data
            await this.createUsers();
            await this.createDisasters();
            await this.createAlerts();
            await this.createWeatherData();
            await this.createResources();
            
            logger.info('✅ Database seeding completed successfully!');
            process.exit(0);
        } catch (error) {
            logger.error('❌ Database seeding failed:', error.message);
            process.exit(1);
        }
    }

    async clearDatabase() {
        logger.info('🧹 Clearing existing data...');
        
        await Promise.all([
            User.deleteMany({}),
            Disaster.deleteMany({}),
            Alert.deleteMany({}),
            WeatherData.deleteMany({}),
            Resource.deleteMany({})
        ]);
        
        logger.info('✨ Database cleared');
    }

    async createUsers() {
        logger.info('👥 Creating users...');
        
        const usersData = [
            {
                name: 'Admin User',
                email: 'admin@nepaldisaster.gov.np',
                password: 'admin123',
                role: 'admin',
                organization: 'Department of Disaster Management',
                phone: '+977-1-4211694'
            },
            {
                name: 'Emergency Coordinator',
                email: 'coordinator@neoc.gov.np',
                password: 'coordinator123',
                role: 'coordinator',
                organization: 'National Emergency Operation Center',
                phone: '+977-1-4211699'
            },
            {
                name: 'Field Responder',
                email: 'responder@redcross.org.np',
                password: 'responder123',
                role: 'responder',
                organization: 'Nepal Red Cross Society',
                phone: '+977-1-4270650'
            },
            {
                name: 'Public User',
                email: 'citizen@example.com',
                password: 'public123',
                role: 'viewer',
                organization: 'General Public',
                phone: '+977-9800000000'
            }
        ];

        for (const userData of usersData) {
            const user = new User(userData);
            await user.save();
            this.users.push(user);
        }
        
        logger.info(`✅ Created ${this.users.length} users`);
    }

    async createDisasters() {
        logger.info('🌋 Creating disaster records...');
        
        const disastersData = [];
        
        for (let i = 0; i < 15; i++) {
            const province = provinces[Math.floor(Math.random() * provinces.length)];
            const district = districts[province][Math.floor(Math.random() * districts[province].length)];
            const type = disasterTypes[Math.floor(Math.random() * disasterTypes.length)];
            const severity = severityLevels[Math.floor(Math.random() * severityLevels.length)];
            const status = statusTypes[Math.floor(Math.random() * statusTypes.length)];
            
            // Generate realistic coordinates for Nepal
            const lat = 26.3 + Math.random() * 4; // Nepal's latitude range
            const lon = 80.1 + Math.random() * 8; // Nepal's longitude range
            
            const disaster = {
                title: `${type} in ${district}, ${province}`,
                type,
                location: {
                    province,
                    district,
                    municipality: `${district} Municipality`,
                    ward: Math.floor(Math.random() * 15) + 1,
                    coordinates: { latitude: lat, longitude: lon },
                    address: `Ward ${Math.floor(Math.random() * 15) + 1}, ${district}`
                },
                severity,
                status,
                affected: {
                    casualties: {
                        deaths: Math.floor(Math.random() * 50),
                        injured: Math.floor(Math.random() * 200),
                        missing: Math.floor(Math.random() * 20)
                    },
                    displaced: Math.floor(Math.random() * 5000),
                    housesDestroyed: Math.floor(Math.random() * 500),
                    housesDamaged: Math.floor(Math.random() * 1000),
                    totalAffected: Math.floor(Math.random() * 10000) + 1000
                },
                description: `${type} incident reported in ${district}, ${province}. Emergency response teams dispatched.`,
                source: ['Government', 'NGO', 'Media', 'Field Report'][Math.floor(Math.random() * 4)],
                isVerified: Math.random() > 0.3,
                estimatedDamage: {
                    amount: Math.floor(Math.random() * 10000000) + 1000000,
                    currency: 'NPR',
                    description: 'Preliminary damage assessment'
                },
                createdBy: this.users[Math.floor(Math.random() * this.users.length)]._id,
                reportedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random within last 30 days
            };
            
            disastersData.push(disaster);
        }
        
        this.disasters = await Disaster.insertMany(disastersData);
        logger.info(`✅ Created ${this.disasters.length} disaster records`);
    }

    async createAlerts() {
        logger.info('🚨 Creating alerts...');
        
        const alertsData = [];
        
        for (let i = 0; i < 10; i++) {
            const province = provinces[Math.floor(Math.random() * provinces.length)];
            const district = districts[province][Math.floor(Math.random() * districts[province].length)];
            const severity = severityLevels[Math.floor(Math.random() * severityLevels.length)];
            const alertTypes = ['Weather Warning', 'Flood Alert', 'Earthquake Advisory', 'Emergency Notification'];
            
            const alert = {
                type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
                location: `${district}, ${province}`,
                severity,
                status: ['Active', 'Monitoring', 'Advisory'][Math.floor(Math.random() * 3)],
                affected: Math.floor(Math.random() * 50000) + 1000,
                message: `${severity} alert issued for ${district}, ${province}. Take necessary precautions.`,
                responseTime: Math.floor(Math.random() * 120) + 10, // 10-130 minutes
                createdBy: this.users[Math.floor(Math.random() * this.users.length)]._id,
                issuedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random within last 7 days
            };
            
            alertsData.push(alert);
        }
        
        await Alert.insertMany(alertsData);
        logger.info(`✅ Created ${alertsData.length} alerts`);
    }

    async createWeatherData() {
        logger.info('🌤️ Creating weather data...');
        
        const weatherLocations = [
            { name: 'Kathmandu', province: 'Bagmati', district: 'Kathmandu', lat: 27.7172, lon: 85.3240 },
            { name: 'Pokhara', province: 'Gandaki', district: 'Kaski', lat: 28.2096, lon: 83.9856 },
            { name: 'Chitwan', province: 'Bagmati', district: 'Chitwan', lat: 27.5291, lon: 84.3542 },
            { name: 'Biratnagar', province: 'Koshi', district: 'Morang', lat: 26.4525, lon: 87.2718 },
            { name: 'Nepalgunj', province: 'Lumbini', district: 'Banke', lat: 28.0500, lon: 81.6167 }
        ];
        
        const weatherData = [];
        
        for (const location of weatherLocations) {
            const conditions = ['Clear', 'Clouds', 'Rain', 'Thunderstorm'];
            const condition = conditions[Math.floor(Math.random() * conditions.length)];
            
            const data = {
                location: {
                    name: location.name,
                    province: location.province,
                    district: location.district,
                    coordinates: {
                        latitude: location.lat,
                        longitude: location.lon
                    }
                },
                current: {
                    temperature: 15 + Math.random() * 20,
                    humidity: 40 + Math.random() * 40,
                    pressure: 1000 + Math.random() * 50,
                    windSpeed: Math.random() * 30,
                    windDirection: Math.random() * 360,
                    visibility: 5 + Math.random() * 10,
                    cloudCover: Math.random() * 100,
                    condition,
                    description: condition.toLowerCase()
                },
                precipitation: {
                    current: Math.random() * 10,
                    daily: Math.random() * 50,
                    weekly: Math.random() * 200
                },
                riskAssessment: {
                    floodRisk: ['low', 'moderate', 'high'][Math.floor(Math.random() * 3)],
                    landslideRisk: ['low', 'moderate', 'high'][Math.floor(Math.random() * 3)],
                    overallRisk: ['low', 'moderate', 'high'][Math.floor(Math.random() * 3)]
                },
                dataSource: {
                    provider: 'openweather',
                    lastUpdated: new Date()
                }
            };
            
            weatherData.push(data);
        }
        
        await WeatherData.insertMany(weatherData);
        logger.info(`✅ Created weather data for ${weatherData.length} locations`);
    }

    async createResources() {
        logger.info('📦 Creating resources...');
        
        const resourceTypes = [
            { category: 'medical_supplies', type: 'First Aid Kits', unit: 'pieces' },
            { category: 'medical_supplies', type: 'Ambulances', unit: 'vehicles' },
            { category: 'food_water', type: 'Emergency Food Packets', unit: 'boxes' },
            { category: 'food_water', type: 'Water Purification Tablets', unit: 'pieces' },
            { category: 'shelter_materials', type: 'Emergency Tents', unit: 'pieces' },
            { category: 'shelter_materials', type: 'Blankets', unit: 'pieces' },
            { category: 'rescue_equipment', type: 'Search and Rescue Teams', unit: 'people' },
            { category: 'communication_tools', type: 'Satellite Phones', unit: 'pieces' },
            { category: 'transportation', type: 'Helicopters', unit: 'vehicles' }
        ];
        
        const resourcesData = [];
        
        for (const resourceType of resourceTypes) {
            for (let i = 0; i < 3; i++) {
                const province = provinces[Math.floor(Math.random() * provinces.length)];
                const district = districts[province][Math.floor(Math.random() * districts[province].length)];
                
                const total = Math.floor(Math.random() * 1000) + 100;
                const used = Math.floor(Math.random() * total * 0.3);
                const available = total - used;
                
                const resource = {
                    name: resourceType.type,
                    category: resourceType.category,
                    type: resourceType.type,
                    description: `${resourceType.type} available for emergency response`,
                    quantity: {
                        available,
                        total,
                        unit: resourceType.unit,
                        reserved: Math.floor(Math.random() * available * 0.2),
                        inUse: used
                    },
                    location: {
                        name: `${district} Emergency Center`,
                        province,
                        district,
                        coordinates: {
                            latitude: 26.3 + Math.random() * 4,
                            longitude: 80.1 + Math.random() * 8
                        },
                        address: `Emergency Center, ${district}`,
                        facilityType: ['hospital', 'warehouse', 'government_office'][Math.floor(Math.random() * 3)]
                    },
                    provider: {
                        organization: ['Government of Nepal', 'Nepal Red Cross', 'UNICEF', 'WHO'][Math.floor(Math.random() * 4)],
                        contactPerson: {
                            name: 'Resource Manager',
                            phone: '+977-1-4200000',
                            email: 'resources@example.com'
                        },
                        type: ['government', 'ngo', 'international'][Math.floor(Math.random() * 3)]
                    },
                    priority: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
                    createdBy: this.users[Math.floor(Math.random() * this.users.length)]._id
                };
                
                resourcesData.push(resource);
            }
        }
        
        await Resource.insertMany(resourcesData);
        logger.info(`✅ Created ${resourcesData.length} resources`);
    }
}

// Run seeder if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const seeder = new SampleDataSeeder();
    await seeder.seed();
}

export default SampleDataSeeder;
