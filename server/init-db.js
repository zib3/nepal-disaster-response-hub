#!/usr/bin/env node

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import User from './src/models/User.js';
import Disaster from './src/models/Disaster.js';
import Alert from './src/models/Alert.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nepal-disaster-response';

// Sample data
const sampleUsers = [
    {
        name: 'Admin User',
        email: 'admin@nepaldisaster.gov.np',
        password: 'admin123',
        role: 'admin',
        organization: 'Department of Disaster Management',
        phone: '+977-1-1234567'
    },
    {
        name: 'Emergency Coordinator',
        email: 'coordinator@redcross.org.np',
        password: 'coord123',
        role: 'coordinator',
        organization: 'Nepal Red Cross Society',
        phone: '+977-1-2345678'
    },
    {
        name: 'Field Responder',
        email: 'responder@army.mil.np',
        password: 'responder123',
        role: 'responder',
        organization: 'Nepal Army',
        phone: '+977-1-3456789'
    },
    {
        name: 'Observer',
        email: 'observer@undp.org',
        password: 'observer123',
        role: 'viewer',
        organization: 'UNDP Nepal',
        phone: '+977-1-4567890'
    }
];

const sampleDisasters = [
    {
        type: 'Flood',
        location: 'Kathmandu Valley',
        severity: 'High',
        affected: 15000,
        description: 'Heavy monsoon rains cause flooding in Kathmandu Valley affecting multiple districts.',
        reportedAt: new Date('2024-07-15T10:30:00Z')
    },
    {
        type: 'Landslide',
        location: 'Pokhara Region',
        severity: 'Medium',
        affected: 3500,
        description: 'Landslide blocks major highway, isolating several villages.',
        reportedAt: new Date('2024-07-20T14:15:00Z')
    },
    {
        type: 'Earthquake',
        location: 'Chitwan District',
        severity: 'Critical',
        affected: 25000,
        description: 'Magnitude 6.2 earthquake strikes Chitwan, damaging infrastructure.',
        reportedAt: new Date('2024-07-25T08:45:00Z')
    },
    {
        type: 'Drought',
        location: 'Far Western Region',
        severity: 'Medium',
        affected: 8000,
        description: 'Prolonged dry spell affects agricultural communities.',
        reportedAt: new Date('2024-06-10T12:00:00Z')
    },
    {
        type: 'Forest Fire',
        location: 'Makalu Barun National Park',
        severity: 'High',
        affected: 1200,
        description: 'Wildfire threatens biodiversity and local communities.',
        reportedAt: new Date('2024-03-18T16:20:00Z')
    }
];

async function initializeDatabase() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully');

        // Clear existing data
        console.log('🧹 Clearing existing data...');
        await User.deleteMany({});
        await Disaster.deleteMany({});
        await Alert.deleteMany({});

        // Create users
        console.log('👥 Creating sample users...');
        const createdUsers = [];
        for (const userData of sampleUsers) {
            // Let the User model handle password hashing via pre-save middleware
            const user = await User.create(userData);
            createdUsers.push(user);
            console.log(`   ✅ Created user: ${user.name} (${user.email})`);
        }

        // Create disasters
        console.log('🌪️  Creating sample disasters...');
        const createdDisasters = await Disaster.insertMany(sampleDisasters);
        console.log(`   ✅ Created ${createdDisasters.length} disasters`);

        // Create alerts based on disasters
        console.log('🚨 Creating sample alerts...');
        const sampleAlerts = [
            {
                type: 'Flash Flood Warning',
                location: 'Bagmati River Basin',
                severity: 'Critical',
                status: 'Active',
                affected: 8500,
                message: 'Flash flood warning issued for communities along Bagmati River. Immediate evacuation recommended.',
                createdBy: createdUsers[0]._id,
                issuedAt: new Date('2024-07-31T06:00:00Z')
            },
            {
                type: 'Landslide Risk',
                location: 'Sindhuli District',
                severity: 'High',
                status: 'Monitoring',
                affected: 2300,
                message: 'High risk of landslides due to heavy rainfall. Monitoring ongoing.',
                createdBy: createdUsers[1]._id,
                issuedAt: new Date('2024-07-31T02:30:00Z')
            },
            {
                type: 'Heavy Rainfall Alert',
                location: 'Western Region',
                severity: 'Medium',
                status: 'Advisory',
                affected: 12000,
                message: 'Heavy rainfall expected. Residents advised to take precautionary measures.',
                createdBy: createdUsers[0]._id,
                issuedAt: new Date('2024-07-30T18:45:00Z')
            },
            {
                type: 'Earthquake Aftershock',
                location: 'Gorkha District',
                severity: 'Low',
                status: 'Resolved',
                affected: 1500,
                message: 'Minor aftershocks reported. No significant damage. Situation under control.',
                createdBy: createdUsers[1]._id,
                issuedAt: new Date('2024-07-29T12:15:00Z'),
                resolvedAt: new Date('2024-07-30T08:00:00Z')
            }
        ];

        const createdAlerts = await Alert.insertMany(sampleAlerts);
        console.log(`   ✅ Created ${createdAlerts.length} alerts`);

        console.log('\n🎉 Database initialization completed successfully!');
        console.log('\n📊 Summary:');
        console.log(`   • Users: ${createdUsers.length}`);
        console.log(`   • Disasters: ${createdDisasters.length}`);
        console.log(`   • Alerts: ${createdAlerts.length}`);

        console.log('\n🔐 Login Credentials:');
        console.log('   Admin: admin@nepaldisaster.gov.np / admin123');
        console.log('   Coordinator: coordinator@redcross.org.np / coord123');
        console.log('   Responder: responder@army.mil.np / responder123');
        console.log('   Observer: observer@undp.org / observer123');

    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
        process.exit(0);
    }
}

// Run initialization
initializeDatabase();
