import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Disaster from '../models/Disaster.js';
import Alert from '../models/Alert.js';
import NewsArticle from '../models/NewsArticle.js';
import ResourceRequest from '../models/ResourceRequest.js';
import EmergencyContact from '../models/EmergencyContact.js';

// Load environment variables
dotenv.config();

// Sample data
const users = [
    {
        name: 'Admin User',
        email: 'admin@nepaldisaster.gov.np',
        password: 'admin123',
        role: 'admin',
        organization: 'Ministry of Home Affairs',
        phone: '+977-1-4211995',
        isActive: true
    },
    {
        name: 'Krishna Bahadur Coordinator',
        email: 'coordinator@neoc.gov.np',
        password: 'coordinator123',
        role: 'coordinator',
        organization: 'National Emergency Operation Center',
        phone: '+977-1-4260402',
        isActive: true
    },
    {
        name: 'Ram Bahadur Responder',
        email: 'responder@nepal.army.mil.np',
        password: 'responder123',
        role: 'responder',
        organization: 'Nepal Army',
        phone: '+977-1-4261945',
        isActive: true
    }
];

const disasters = [
    {
        title: 'Major Earthquake in Sindhupalchok District',
        description: 'A significant earthquake with magnitude 6.2 struck Sindhupalchok district affecting multiple municipalities. Rescue and relief operations are underway.',
        type: 'Earthquake',
        severity: 'Critical',
        status: 'Ongoing',
        location: {
            coordinates: {
                latitude: 27.6644,
                longitude: 85.6344
            },
            province: 'Bagmati',
            district: 'Sindhupalchok',
            municipality: 'Chautara Sangachokgadhi',
            address: 'Chautara Sangachokgadhi Municipality'
        },
        affected: {
            casualties: {
                deaths: 15,
                injured: 78,
                missing: 5
            },
            displaced: 2500,
            housesDestroyed: 456,
            housesDamaged: 1200,
            totalAffected: 4034
        },
        estimatedDamage: {
            amount: 500000000,
            currency: 'NPR'
        },
        weatherConditions: {
            temperature: 22,
            humidity: 65,
            windSpeed: 15,
            conditions: 'Partly Cloudy'
        }
    },
    {
        title: 'Flash Flood in Karnali River Basin',
        description: 'Heavy monsoon rainfall has caused flash flooding in the Karnali River Basin, affecting several villages and displacing thousands of residents.',
        type: 'Flood',
        severity: 'High',
        status: 'Ongoing',
        location: {
            coordinates: {
                latitude: 28.6044,
                longitude: 81.6344
            },
            province: 'Karnali',
            district: 'Surkhet',
            municipality: 'Birendranagar',
            address: 'Birendranagar Municipality, Ward 5'
        },
        affected: {
            casualties: {
                deaths: 8,
                injured: 23,
                missing: 12
            },
            displaced: 1800,
            housesDestroyed: 120,
            housesDamaged: 450,
            totalAffected: 2413
        },
        estimatedDamage: {
            amount: 150000000,
            currency: 'NPR'
        },
        weatherConditions: {
            temperature: 28,
            humidity: 85,
            windSpeed: 8,
            conditions: 'Heavy Rain'
        }
    },
    {
        title: 'Landslide in Mountain Highway',
        description: 'A major landslide has blocked the Prithvi Highway near Gorkha, disrupting transportation and trapping several vehicles.',
        type: 'Landslide',
        severity: 'Medium',
        status: 'Ongoing',
        location: {
            coordinates: {
                latitude: 28.0044,
                longitude: 84.6244
            },
            province: 'Gandaki',
            district: 'Gorkha',
            municipality: 'Gorkha',
            address: 'Prithvi Highway, km 95'
        },
        affected: {
            casualties: {
                deaths: 3,
                injured: 15,
                missing: 2
            },
            displaced: 85,
            housesDestroyed: 12,
            housesDamaged: 35,
            totalAffected: 152
        },
        estimatedDamage: {
            amount: 25000000,
            currency: 'NPR'
        },
        weatherConditions: {
            temperature: 18,
            humidity: 78,
            windSpeed: 12,
            conditions: 'Cloudy'
        }
    }
];

const alerts = [
    {
        type: 'Earthquake',
        severity: 'Critical',
        location: 'Sindhupalchok',
        message: 'Major earthquake detected in Sindhupalchok district',
        affected: 2500,
        status: 'Active'
    },
    {
        type: 'Flood',
        severity: 'High',
        location: 'Karnali River Basin',
        message: 'Flash flood warning issued for Karnali River Basin',
        affected: 1800,
        status: 'Active'
    },
    {
        type: 'Landslide',
        severity: 'Medium',
        location: 'Gorkha Highway',
        message: 'Highway blocked due to landslide in Gorkha district',
        affected: 85,
        status: 'Active'
    }
];

const emergencyContacts = [
    {
        name: 'Nepal Police Headquarters',
        organization: 'Nepal Police',
        category: 'Police',
        phones: [
            {
                number: '100',
                type: 'Hotline',
                isActive: true
            },
            {
                number: '+977-1-4412048',
                type: 'Primary',
                isActive: true
            }
        ],
        email: 'info@nepalpolice.gov.np',
        address: {
            province: 'Bagmati',
            district: 'Kathmandu',
            municipality: 'Kathmandu',
            ward: '1',
            street: 'Naxal, Kathmandu'
        },
        serviceArea: [
            { province: 'Bagmati', district: 'Kathmandu' },
            { province: 'All', district: 'All' }
        ],
        availability: {
            is24x7: true,
            schedule: {}
        },
        services: [
            { name: 'Emergency Response', description: '24/7 emergency police services', isActive: true },
            { name: 'Disaster Response', description: 'Police support during disasters', isActive: true }
        ],
        priority: 5,
        isActive: true
    },
    {
        name: 'Nepal Army Disaster Response',
        organization: 'Nepal Army',
        category: 'Military',
        phones: [
            {
                number: '+977-1-4261945',
                type: 'Primary',
                isActive: true
            }
        ],
        email: 'info@nepalarmy.mil.np',
        address: {
            province: 'Bagmati',
            district: 'Kathmandu',
            municipality: 'Kathmandu',
            ward: '2',
            street: 'Singha Durbar, Kathmandu'
        },
        serviceArea: [
            { province: 'All', district: 'All' }
        ],
        availability: {
            is24x7: true,
            schedule: {}
        },
        services: [
            { name: 'Search and Rescue', description: 'Professional search and rescue operations', isActive: true },
            { name: 'Disaster Relief', description: 'Emergency relief distribution', isActive: true },
            { name: 'Medical Evacuation', description: 'Helicopter medical evacuation services', isActive: true }
        ],
        priority: 4,
        isActive: true
    },
    {
        name: 'National Emergency Operation Center',
        organization: 'Ministry of Home Affairs',
        category: 'Government',
        phones: [
            {
                number: '+977-1-4260402',
                type: 'Hotline',
                isActive: true
            }
        ],
        email: 'info@neoc.gov.np',
        address: {
            province: 'Bagmati',
            district: 'Kathmandu',
            municipality: 'Kathmandu',
            ward: '3',
            street: 'Singha Durbar, Kathmandu'
        },
        serviceArea: [
            { province: 'All', district: 'All' }
        ],
        availability: {
            is24x7: true,
            schedule: {}
        },
        services: [
            { name: 'Disaster Coordination', description: 'Central disaster management coordination', isActive: true },
            { name: 'Information Management', description: 'Disaster information collection and dissemination', isActive: true }
        ],
        priority: 5,
        isActive: true
    },
    {
        name: 'Red Cross Society Nepal',
        organization: 'Nepal Red Cross Society',
        category: 'NGO',
        phones: [
            {
                number: '+977-1-4270650',
                type: 'Primary',
                isActive: true
            },
            {
                number: '+977-1-4270855',
                type: 'Emergency',
                isActive: true
            }
        ],
        email: 'nrcs@nrcs.org',
        address: {
            province: 'Bagmati',
            district: 'Kathmandu',
            municipality: 'Kathmandu',
            ward: '4',
            street: 'Kalimati, Kathmandu'
        },
        serviceArea: [
            { province: 'All', district: 'All' }
        ],
        availability: {
            is24x7: false,
            schedule: {
                monday: { start: '09:00', end: '17:00' },
                tuesday: { start: '09:00', end: '17:00' },
                wednesday: { start: '09:00', end: '17:00' },
                thursday: { start: '09:00', end: '17:00' },
                friday: { start: '09:00', end: '17:00' },
                saturday: { start: '09:00', end: '15:00' }
            }
        },
        services: [
            { name: 'First Aid Training', description: 'Community first aid training programs', isActive: true },
            { name: 'Emergency Response', description: 'Disaster response and relief operations', isActive: true },
            { name: 'Blood Bank Services', description: 'Blood collection and distribution', isActive: true }
        ],
        priority: 3,
        isActive: true
    }
];

// Connect to database and seed data
const seedDB = async () => {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        console.log('🔄 Clearing existing data...');
        await User.deleteMany({});
        await Disaster.deleteMany({});
        await Alert.deleteMany({});
        await NewsArticle.deleteMany({});
        await ResourceRequest.deleteMany({});
        await EmergencyContact.deleteMany({});
        console.log('✅ Existing data cleared');

        // Create users
        console.log('🔄 Creating users...');
        // Hash passwords manually since insertMany doesn't trigger pre-save middleware
        const salt = await bcrypt.genSalt(10);
        const hashedUsers = await Promise.all(users.map(async user => {
            const hashedPassword = await bcrypt.hash(user.password, salt);
            return { ...user, password: hashedPassword };
        }));
        const createdUsers = await User.insertMany(hashedUsers);
        console.log(`✅ Created ${createdUsers.length} users`);

        // Add createdBy field to disasters
        const disastersWithCreator = disasters.map(disaster => ({
            ...disaster,
            createdBy: createdUsers[0]._id // Admin user
        }));

        // Create disasters
        console.log('🔄 Creating disasters...');
        const createdDisasters = await Disaster.insertMany(disastersWithCreator);
        console.log(`✅ Created ${createdDisasters.length} disasters`);

        // Add createdBy field to alerts
        const alertsWithCreator = alerts.map(alert => ({
            ...alert,
            createdBy: createdUsers[1]._id // Coordinator user
        }));

        // Create alerts
        console.log('🔄 Creating alerts...');
        const createdAlerts = await Alert.insertMany(alertsWithCreator);
        console.log(`✅ Created ${createdAlerts.length} alerts`);

        // Create news articles
        console.log('🔄 Creating news articles...');
        const newsArticles = [
            {
                title: 'Emergency Response Teams Deployed to Earthquake-Hit Areas',
                content: 'Following the magnitude 6.2 earthquake that struck Sindhupalchok district, the government has deployed multiple emergency response teams to assist with rescue operations and provide immediate relief to affected communities. The Nepal Army, Armed Police Force, and local volunteers are working around the clock to reach remote areas where communications have been disrupted.',
                excerpt: 'Government deploys emergency response teams to earthquake-affected areas in Sindhupalchok district as rescue operations continue.',
                category: 'Breaking',
                priority: 'Critical',
                tags: ['earthquake', 'rescue', 'emergency response', 'sindhupalchok'],
                location: {
                    coordinates: {
                        latitude: 27.6644,
                        longitude: 85.6344
                    },
                    province: 'Bagmati',
                    district: 'Sindhupalchok'
                },
                source: {
                    name: 'Department of Disaster Management',
                    type: 'Official'
                },
                relatedDisasters: [createdDisasters[0]._id],
                isVerified: true,
                verifiedBy: createdUsers[0]._id,
                createdBy: createdUsers[1]._id,
                publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
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
                relatedDisasters: [createdDisasters[1]._id],
                isVerified: true,
                verifiedBy: createdUsers[0]._id,
                createdBy: createdUsers[1]._id,
                publishedAt: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
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
                relatedDisasters: [createdDisasters[2]._id],
                isVerified: true,
                verifiedBy: createdUsers[0]._id,
                createdBy: createdUsers[1]._id,
                publishedAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
            }
        ];

        const createdNews = await NewsArticle.insertMany(newsArticles);
        console.log(`✅ Created ${createdNews.length} news articles`);

        // Create resource requests
        console.log('🔄 Creating resource requests...');
        const resourceRequests = [
            {
                title: 'Emergency Medical Supplies for Earthquake Victims',
                description: 'Urgent need for medical supplies including bandages, antibiotics, pain relievers, and surgical equipment for treating earthquake victims in Sindhupalchok district.',
                category: 'Medical',
                priority: 'Critical',
                requiredQuantity: 500,
                unit: 'kits',
                location: {
                    coordinates: {
                        latitude: 27.6644,
                        longitude: 85.6344
                    },
                    province: 'Bagmati',
                    district: 'Sindhupalchok',
                    municipality: 'Chautara Sangachokgadhi',
                    address: 'District Hospital, Chautara'
                },
                urgentBy: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
                contactPerson: {
                    name: 'Dr. Sita Sharma',
                    phone: '+977-9841234567',
                    email: 'dr.sita@chautara.hospital.np',
                    designation: 'Chief Medical Officer'
                },
                status: 'Pending',
                estimatedCost: {
                    amount: 250000,
                    currency: 'NPR'
                },
                relatedDisaster: createdDisasters[0]._id,
                createdBy: createdUsers[2]._id,
                isVerified: true,
                verifiedBy: createdUsers[1]._id
            },
            {
                title: 'Emergency Food Supplies for Flood Victims',
                description: 'Immediate need for food supplies including rice, lentils, cooking oil, and baby formula for families displaced by flash floods in Karnali River Basin.',
                category: 'Food',
                priority: 'High',
                requiredQuantity: 1000,
                unit: 'packages',
                location: {
                    coordinates: {
                        latitude: 28.6044,
                        longitude: 81.6344
                    },
                    province: 'Karnali',
                    district: 'Surkhet',
                    municipality: 'Birendranagar',
                    address: 'Relief Distribution Center, Birendranagar'
                },
                urgentBy: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
                contactPerson: {
                    name: 'Rajesh Kumar',
                    phone: '+977-9851234568',
                    email: 'rajesh.relief@birendranagar.gov.np',
                    designation: 'Relief Coordinator'
                },
                status: 'In Progress',
                fulfilledQuantity: 300,
                estimatedCost: {
                    amount: 150000,
                    currency: 'NPR'
                },
                relatedDisaster: createdDisasters[1]._id,
                createdBy: createdUsers[1]._id,
                assignedTeam: createdUsers[2]._id,
                isVerified: true,
                verifiedBy: createdUsers[0]._id
            },
            {
                title: 'Temporary Shelter Materials for Landslide Victims',
                description: 'Need for tarpaulins, tents, blankets, and basic shelter materials for families affected by the landslide on Prithvi Highway near Gorkha.',
                category: 'Shelter',
                priority: 'Medium',
                requiredQuantity: 50,
                unit: 'shelter kits',
                location: {
                    coordinates: {
                        latitude: 28.0044,
                        longitude: 84.6244
                    },
                    province: 'Gandaki',
                    district: 'Gorkha',
                    municipality: 'Gorkha',
                    address: 'Community Hall, Gorkha'
                },
                urgentBy: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
                contactPerson: {
                    name: 'Maya Gurung',
                    phone: '+977-9861234569',
                    email: 'maya.relief@gorkha.gov.np',
                    designation: 'Local Relief Officer'
                },
                status: 'Pending',
                estimatedCost: {
                    amount: 75000,
                    currency: 'NPR'
                },
                relatedDisaster: createdDisasters[2]._id,
                createdBy: createdUsers[1]._id,
                isVerified: false
            }
        ];

        const createdResources = await ResourceRequest.insertMany(resourceRequests);
        console.log(`✅ Created ${createdResources.length} resource requests`);

        // Add createdBy field to emergency contacts
        const contactsWithCreator = emergencyContacts.map(contact => ({
            ...contact,
            createdBy: createdUsers[0]._id // Admin user
        }));

        // Create emergency contacts
        console.log('🔄 Creating emergency contacts...');
        const createdContacts = await EmergencyContact.insertMany(contactsWithCreator);
        console.log(`✅ Created ${createdContacts.length} emergency contacts`);

        console.log('\n🎉 Database seeding completed successfully!');
        console.log('\n📋 Summary:');
        console.log(`   Users: ${createdUsers.length}`);
        console.log(`   Disasters: ${createdDisasters.length}`);
        console.log(`   Alerts: ${createdAlerts.length}`);
        console.log(`   News Articles: ${createdNews.length}`);
        console.log(`   Resource Requests: ${createdResources.length}`);
        console.log(`   Emergency Contacts: ${createdContacts.length}`);
        
        console.log('\n🔐 Login Credentials:');
        console.log('   Admin: admin@nepaldisaster.gov.np / admin123');
        console.log('   Coordinator: coordinator@neoc.gov.np / coordinator123');
        console.log('   Responder: responder@nepal.army.mil.np / responder123');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};

// Run seeder if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seedDB();
}

export default seedDB;
