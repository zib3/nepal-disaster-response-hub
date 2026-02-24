import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Import models
import User from './src/models/User.js';
import Disaster from './src/models/Disaster.js';
import Alert from './src/models/Alert.js';
import NewsArticle from './src/models/NewsArticle.js';
import ResourceRequest from './src/models/ResourceRequest.js';
import EmergencyContact from './src/models/EmergencyContact.js';

dotenv.config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nepal-disaster-response');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

// Sample data
const sampleUsers = [
    {
        name: 'Admin User',
        email: 'admin@nepaldisaster.gov.np',
        password: 'admin123',
        role: 'admin',
        organization: 'Department of Disaster Management',
        phone: '+977-1-4211984',
        isActive: true
    },
    {
        name: 'Krishna Bahadur Coordinator',
        email: 'krishna.coordinator@nepaldisaster.gov.np',
        password: 'coord123',
        role: 'coordinator',
        organization: 'National Emergency Operation Center',
        phone: '+977-9841234567',
        isActive: true
    },
    {
        name: 'Ram Rescue Team Lead',
        email: 'ram.responder@nepaldisaster.gov.np',
        password: 'resp123',
        role: 'responder',
        organization: 'Nepal Army Rescue Team',
        phone: '+977-9851234567',
        isActive: true
    },
    {
        name: 'Sita Medical Team',
        email: 'sita.medic@health.gov.np',
        password: 'medic123',
        role: 'responder',
        organization: 'Ministry of Health Emergency Response',
        phone: '+977-9861234567',
        isActive: true
    },
    {
        name: 'Data Viewer',
        email: 'viewer@example.com',
        password: 'viewer123',
        role: 'viewer',
        organization: 'General Public',
        phone: '+977-9871234567',
        isActive: true
    }
];

const sampleDisasters = [
    {
        title: 'Major Earthquake in Sindhupalchok District',
        type: 'Earthquake',
        location: {
            province: 'Bagmati',
            district: 'Sindhupalchok',
            municipality: 'Chautara Sangachokgadhi',
            coordinates: { latitude: 27.6644, longitude: 85.6344 },
            address: 'Chautara Sangachokgadhi Municipality'
        },
        severity: 'Critical',
        status: 'Ongoing',
        affected: {
            casualties: { deaths: 12, injured: 45, missing: 3 },
            displaced: 2500,
            housesDestroyed: 150,
            housesDamaged: 400,
            totalAffected: 3000
        },
        description: 'A magnitude 6.2 earthquake struck Sindhupalchok district causing significant damage to infrastructure and displacing thousands of people.',
        source: 'Government',
        isVerified: true,
        estimatedDamage: { amount: 50000000, currency: 'NPR', description: 'Preliminary damage assessment' },
        weatherConditions: {
            temperature: 18,
            humidity: 65,
            windSpeed: 15,
            precipitation: 0,
            visibility: 8,
            conditions: 'Partly cloudy'
        }
    },
    {
        title: 'Flash Flood in Karnali River Basin',
        type: 'Flood',
        location: {
            province: 'Karnali',
            district: 'Surkhet',
            municipality: 'Birendranagar',
            coordinates: { latitude: 28.6044, longitude: 81.6344 },
            address: 'Birendranagar Municipality, Ward 5'
        },
        severity: 'High',
        status: 'Monitoring',
        affected: {
            casualties: { deaths: 2, injured: 8, missing: 1 },
            displaced: 800,
            housesDestroyed: 45,
            housesDamaged: 120,
            totalAffected: 1200
        },
        description: 'Heavy monsoon rains caused flash flooding in the Karnali River basin, affecting several communities downstream.',
        source: 'Field Report',
        isVerified: true,
        estimatedDamage: { amount: 15000000, currency: 'NPR', description: 'Agricultural and infrastructure losses' }
    },
    {
        title: 'Landslide in Mountain Highway',
        type: 'Landslide',
        location: {
            province: 'Gandaki',
            district: 'Gorkha',
            municipality: 'Gorkha',
            coordinates: { latitude: 28.0044, longitude: 84.6244 },
            address: 'Prithvi Highway, km 95'
        },
        severity: 'Medium',
        status: 'Ongoing',
        affected: {
            casualties: { deaths: 0, injured: 2, missing: 0 },
            displaced: 50,
            housesDestroyed: 3,
            housesDamaged: 8,
            totalAffected: 100
        },
        description: 'A major landslide blocked the Prithvi Highway disrupting transportation and affecting local communities.',
        source: 'Field Report',
        isVerified: true
    }
];

const sampleAlerts = [
    {
        type: 'Earthquake Warning',
        location: 'Central Nepal',
        severity: 'Critical',
        status: 'Active',
        affected: 500000,
        message: 'Strong earthquake aftershocks expected in Central Nepal region. Citizens advised to stay away from buildings and follow safety protocols.'
    },
    {
        type: 'Flood Warning',
        location: 'Terai Region',
        severity: 'High',
        status: 'Active',
        affected: 200000,
        message: 'Heavy monsoon rains forecasted. Flood warning issued for low-lying areas in Terai region. Evacuation recommended for high-risk zones.'
    },
    {
        type: 'Weather Advisory',
        location: 'Himalayan Region',
        severity: 'Medium',
        status: 'Advisory',
        affected: 50000,
        message: 'Adverse weather conditions in high altitude areas. Trekkers and mountaineers advised to exercise caution.'
    }
];

const sampleNews = [
    {
        title: 'Emergency Response Teams Deployed to Earthquake-Hit Areas',
        content: 'Following the magnitude 6.2 earthquake that struck Sindhupalchok district, the government has deployed multiple emergency response teams to assist with rescue operations and provide immediate relief to affected communities. The Nepal Army, Armed Police Force, and local volunteers are working around the clock to reach remote areas where communications have been disrupted.',
        excerpt: 'Government deploys emergency response teams to earthquake-affected areas in Sindhupalchok district as rescue operations continue.',
        category: 'Breaking',
        priority: 'Critical',
        tags: ['earthquake', 'rescue', 'emergency response', 'sindhupalchok'],
        location: {
            province: 'Bagmati',
            district: 'Sindhupalchok',
            coordinates: { latitude: 27.6644, longitude: 85.6344 }
        },
        source: {
            name: 'Department of Disaster Management',
            type: 'Official'
        },
        isVerified: true
    },
    {
        title: 'Monsoon Update: Heavy Rainfall Expected Across Western Nepal',
        content: 'The Department of Hydrology and Meteorology has issued a weather bulletin predicting heavy to very heavy rainfall across western Nepal over the next 48 hours. Citizens in flood-prone areas are advised to remain vigilant and follow evacuation orders if issued by local authorities.',
        excerpt: 'Heavy rainfall expected across western Nepal as monsoon intensifies, flood warning issued for vulnerable areas.',
        category: 'Update',
        priority: 'High',
        tags: ['monsoon', 'rainfall', 'flood warning', 'western nepal'],
        location: {
            province: 'Karnali'
        },
        source: {
            name: 'Department of Hydrology and Meteorology',
            type: 'Official'
        },
        isVerified: true
    },
    {
        title: 'Community Resilience Program Launched in Earthquake-Prone Districts',
        content: 'The Ministry of Home Affairs, in collaboration with international partners, has launched a comprehensive community resilience program aimed at strengthening disaster preparedness in earthquake-prone districts across Nepal. The program will focus on early warning systems, community training, and infrastructure improvement.',
        excerpt: 'New community resilience program launched to strengthen disaster preparedness in earthquake-prone areas.',
        category: 'Prevention',
        priority: 'Medium',
        tags: ['community resilience', 'disaster preparedness', 'earthquake', 'early warning'],
        location: {
            province: 'All Provinces'
        },
        source: {
            name: 'Ministry of Home Affairs',
            type: 'Official'
        },
        isVerified: true
    }
];

const sampleResourceRequests = [
    {
        title: 'Urgent Medical Supplies for Earthquake Victims',
        description: 'Immediate need for medical supplies including bandages, antiseptics, pain medications, and emergency medical equipment for treating earthquake victims in remote areas.',
        category: 'Medical',
        priority: 'Critical',
        status: 'Pending',
        location: {
            province: 'Bagmati',
            district: 'Sindhupalchok',
            municipality: 'Chautara Sangachokgadhi',
            coordinates: { latitude: 27.6644, longitude: 85.6344 },
            address: 'Chautara Hospital'
        },
        requiredQuantity: 500,
        unit: 'Medical Kits',
        urgentBy: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
        contactPerson: {
            name: 'Dr. Rajesh Shrestha',
            phone: '+977-9841234567',
            email: 'rajesh.shrestha@health.gov.np',
            organization: 'Chautara Hospital'
        },
        estimatedCost: { amount: 2500000, currency: 'NPR' }
    },
    {
        title: 'Emergency Food Supplies for Flood-Affected Families',
        description: 'Immediate food assistance required for families displaced by flooding. Need rice, lentils, cooking oil, salt, and other essential food items.',
        category: 'Food',
        priority: 'High',
        status: 'Pending',
        location: {
            province: 'Karnali',
            district: 'Surkhet',
            municipality: 'Birendranagar',
            coordinates: { latitude: 28.6044, longitude: 81.6344 }
        },
        requiredQuantity: 200,
        unit: 'Family Packages',
        urgentBy: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        contactPerson: {
            name: 'Ram Bahadur Thapa',
            phone: '+977-9851234567',
            organization: 'Local Relief Committee'
        },
        estimatedCost: { amount: 1000000, currency: 'NPR' }
    },
    {
        title: 'Temporary Shelter Materials',
        description: 'Tarpaulins, tents, blankets, and other materials needed to provide temporary shelter for displaced families.',
        category: 'Shelter',
        priority: 'High',
        status: 'In Progress',
        location: {
            province: 'Gandaki',
            district: 'Gorkha',
            municipality: 'Gorkha'
        },
        requiredQuantity: 150,
        fulfilledQuantity: 50,
        unit: 'Shelter Kits',
        urgentBy: new Date(Date.now() + 36 * 60 * 60 * 1000), // 36 hours from now
        contactPerson: {
            name: 'Sita Gurung',
            phone: '+977-9861234567',
            organization: 'Red Cross Society'
        },
        estimatedCost: { amount: 3000000, currency: 'NPR' }
    }
];

const sampleEmergencyContacts = [
    {
        name: 'Nepal Police Emergency',
        organization: 'Nepal Police',
        category: 'Police',
        phones: [
            { number: '100', type: 'Hotline', isActive: true },
            { number: '+977-1-4411210', type: 'Primary', isActive: true }
        ],
        email: 'info@nepalpolice.gov.np',
        address: {
            province: 'Bagmati',
            district: 'Kathmandu',
            municipality: 'Kathmandu Metropolitan City',
            coordinates: { latitude: 27.7172, longitude: 85.3240 }
        },
        serviceArea: [
            { province: 'All Provinces' }
        ],
        availability: { is24x7: true },
        services: [
            { name: 'Emergency Response', isActive: true },
            { name: 'Crime Reporting', isActive: true },
            { name: 'Traffic Control', isActive: true }
        ],
        priority: 5,
        isActive: true
    },
    {
        name: 'Fire Emergency Service',
        organization: 'Nepal Fire Service',
        category: 'Fire',
        phones: [
            { number: '101', type: 'Hotline', isActive: true }
        ],
        address: {
            province: 'Bagmati',
            district: 'Kathmandu',
            coordinates: { latitude: 27.7172, longitude: 85.3240 }
        },
        availability: { is24x7: true },
        priority: 5,
        isActive: true
    },
    {
        name: 'Emergency Medical Service',
        organization: 'Ministry of Health and Population',
        category: 'Medical',
        phones: [
            { number: '102', type: 'Hotline', isActive: true },
            { number: '+977-1-4412505', type: 'Primary', isActive: true }
        ],
        email: 'emergency@mohp.gov.np',
        address: {
            province: 'Bagmati',
            district: 'Kathmandu',
            coordinates: { latitude: 27.7172, longitude: 85.3240 }
        },
        availability: { is24x7: true },
        services: [
            { name: 'Ambulance Service', isActive: true },
            { name: 'Emergency Medical Care', isActive: true }
        ],
        priority: 5,
        isActive: true
    },
    {
        name: 'Nepal Army Rescue',
        organization: 'Nepal Army',
        category: 'Rescue',
        phones: [
            { number: '+977-1-4261945', type: 'Primary', isActive: true },
            { number: '+977-1-4261944', type: 'Secondary', isActive: true }
        ],
        email: 'rescue@nepalarmy.mil.np',
        address: {
            province: 'Bagmati',
            district: 'Kathmandu',
            coordinates: { latitude: 27.7172, longitude: 85.3240 }
        },
        serviceArea: [{ province: 'All Provinces' }],
        availability: { is24x7: true },
        services: [
            { name: 'Search and Rescue', isActive: true },
            { name: 'Disaster Response', isActive: true },
            { name: 'Helicopter Rescue', isActive: true }
        ],
        priority: 5,
        isActive: true
    },
    {
        name: 'Tourist Helpline',
        organization: 'Nepal Tourism Board',
        category: 'Government',
        phones: [
            { number: '+977-1-4256909', type: 'Hotline', isActive: true }
        ],
        email: 'info@welcomenepal.com',
        availability: { is24x7: true },
        services: [
            { name: 'Tourist Assistance', isActive: true },
            { name: 'Emergency Support for Tourists', isActive: true }
        ],
        priority: 3,
        isActive: true
    }
];

const seedData = async () => {
    try {
        console.log('🌱 Starting to seed enhanced database...');

        // Clear existing data
        await User.deleteMany({});
        await Disaster.deleteMany({});
        await Alert.deleteMany({});
        await NewsArticle.deleteMany({});
        await ResourceRequest.deleteMany({});
        await EmergencyContact.deleteMany({});

        console.log('🗑️ Cleared existing data');

        // Create users
        console.log('👥 Creating users...');
        const users = [];
        for (const userData of sampleUsers) {
            // Let the User model handle password hashing via pre-save hook
            const user = await User.create(userData);
            users.push(user);
            console.log(`✅ Created user: ${user.email}`);
        }

        const adminUser = users[0];
        const coordinatorUser = users[1];
        const responderUser = users[2];

        // Create disasters
        console.log('🌪️ Creating disasters...');
        const disasters = [];
        for (const disasterData of sampleDisasters) {
            const disaster = new Disaster({
                ...disasterData,
                createdBy: coordinatorUser._id,
                verifiedBy: adminUser._id
            });
            disasters.push(await disaster.save());
            console.log(`✅ Created disaster: ${disaster.title}`);
        }

        // Create alerts
        console.log('🚨 Creating alerts...');
        for (const alertData of sampleAlerts) {
            const alert = new Alert({
                ...alertData,
                createdBy: coordinatorUser._id
            });
            await alert.save();
            console.log(`✅ Created alert: ${alert.type}`);
        }

        // Create news articles
        console.log('📰 Creating news articles...');
        for (let i = 0; i < sampleNews.length; i++) {
            const newsData = sampleNews[i];
            const news = new NewsArticle({
                ...newsData,
                createdBy: coordinatorUser._id,
                verifiedBy: adminUser._id,
                relatedDisasters: i < disasters.length ? [disasters[i]._id] : []
            });
            await news.save();
            console.log(`✅ Created news: ${news.title}`);
        }

        // Create resource requests
        console.log('📦 Creating resource requests...');
        for (let i = 0; i < sampleResourceRequests.length; i++) {
            const resourceData = sampleResourceRequests[i];
            const resource = new ResourceRequest({
                ...resourceData,
                createdBy: responderUser._id,
                relatedDisaster: i < disasters.length ? disasters[i]._id : disasters[0]._id,
                isVerified: true,
                verifiedBy: coordinatorUser._id
            });
            
            if (resource.status === 'In Progress') {
                resource.assignedTeam = responderUser._id;
            }
            
            await resource.save();
            console.log(`✅ Created resource request: ${resource.title}`);
        }

        // Create emergency contacts
        console.log('📞 Creating emergency contacts...');
        for (const contactData of sampleEmergencyContacts) {
            const contact = new EmergencyContact({
                ...contactData,
                createdBy: adminUser._id,
                verifiedBy: adminUser._id,
                lastVerified: new Date()
            });
            await contact.save();
            console.log(`✅ Created emergency contact: ${contact.name}`);
        }

        console.log('\n🎉 Database seeding completed successfully!');
        console.log('\n📊 Summary:');
        console.log(`👥 Users: ${users.length}`);
        console.log(`🌪️ Disasters: ${disasters.length}`);
        console.log(`🚨 Alerts: ${sampleAlerts.length}`);
        console.log(`📰 News Articles: ${sampleNews.length}`);
        console.log(`📦 Resource Requests: ${sampleResourceRequests.length}`);
        console.log(`📞 Emergency Contacts: ${sampleEmergencyContacts.length}`);
        
        console.log('\n🔐 Test Credentials:');
        console.log('Admin: admin@nepaldisaster.gov.np / admin123');
        console.log('Coordinator: krishna.coordinator@nepaldisaster.gov.np / coord123');
        console.log('Responder: ram.responder@nepaldisaster.gov.np / resp123');
        console.log('Viewer: viewer@example.com / viewer123');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};

// Connect to database and seed
connectDB().then(() => {
    seedData();
});
