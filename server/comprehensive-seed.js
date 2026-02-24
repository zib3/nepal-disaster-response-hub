#!/usr/bin/env node

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import all models
import User from './src/models/User.js';
import Disaster from './src/models/Disaster.js';
import Alert from './src/models/Alert.js';
import NewsArticle from './src/models/NewsArticle.js';
import ResourceRequest from './src/models/ResourceRequest.js';
import Resource from './src/models/Resource.js';
import EmergencyContact from './src/models/EmergencyContact.js';
import Incident from './src/models/Incident.js';
import Team from './src/models/Team.js';
import WeatherData from './src/models/WeatherData.js';
import FloodPrediction from './src/models/FloodPrediction.js';
import ActivityLog from './src/models/ActivityLog.js';
import ChatConversation from './src/models/ChatConversation.js';
import SystemConfig from './src/models/SystemConfig.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nepal-disaster-response';

// Nepal-specific locations and data
const nepalProvinces = [
    { name: 'Koshi', capital: 'Biratnagar', districts: ['Jhapa', 'Ilam', 'Panchthar', 'Taplejung', 'Morang', 'Sunsari', 'Dhankuta', 'Terhathum', 'Sankhuwasabha', 'Bhojpur', 'Solukhumbu', 'Okhaldhunga', 'Khotang', 'Udayapur'] },
    { name: 'Madhesh', capital: 'Janakpur', districts: ['Saptari', 'Siraha', 'Dhanusha', 'Mahottari', 'Sarlahi', 'Rautahat', 'Bara', 'Parsa'] },
    { name: 'Bagmati', capital: 'Hetauda', districts: ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Kavrepalanchok', 'Dolakha', 'Sindhupalchok', 'Rasuwa', 'Nuwakot', 'Dhading', 'Chitwan', 'Makwanpur', 'Sindhuli', 'Ramechhap'] },
    { name: 'Gandaki', capital: 'Pokhara', districts: ['Gorkha', 'Lamjung', 'Tanahu', 'Syangja', 'Kaski', 'Manang', 'Mustang', 'Myagdi', 'Parbat', 'Baglung', 'Nawalpur'] },
    { name: 'Lumbini', capital: 'Deukhuri', districts: ['Kapilvastu', 'Parasi', 'Rupandehi', 'Arghakhanchi', 'Gulmi', 'Palpa', 'Dang', 'Pyuthan', 'Rolpa', 'Eastern Rukum', 'Banke', 'Bardiya'] },
    { name: 'Karnali', capital: 'Birendranagar', districts: ['Western Rukum', 'Salyan', 'Dolpa', 'Humla', 'Jumla', 'Kalikot', 'Mugu', 'Surkhet', 'Dailekh', 'Jajarkot'] },
    { name: 'Sudurpashchim', capital: 'Godawari', districts: ['Kailali', 'Kanchanpur', 'Dadeldhura', 'Baitadi', 'Darchula', 'Bajhang', 'Bajura', 'Achham', 'Doti'] }
];

// Comprehensive sample data
const sampleUsers = [
    {
        name: 'System Administrator',
        email: 'admin@nepaldisaster.gov.np',
        password: 'admin123',
        role: 'admin',
        organization: 'Ministry of Home Affairs',
        department: 'Disaster Management Division',
        phone: '+977-1-4211984',
        isActive: true,
        permissions: ['all'],
        address: {
            province: 'Bagmati',
            district: 'Kathmandu',
            municipality: 'Kathmandu Metropolitan City',
            ward: 1
        }
    },
    {
        name: 'Krishna Bahadur Thapa',
        email: 'krishna.coordinator@neoc.gov.np',
        password: 'coord123',
        role: 'coordinator',
        organization: 'National Emergency Operations Center',
        department: 'Operations Division',
        phone: '+977-9841234567',
        isActive: true,
        specialization: ['Emergency Response', 'Resource Coordination'],
        address: {
            province: 'Bagmati',
            district: 'Kathmandu',
            municipality: 'Kathmandu Metropolitan City',
            ward: 3
        }
    },
    {
        name: 'Ram Singh Rescue Leader',
        email: 'ram.responder@nepalarmy.mil.np',
        password: 'resp123',
        role: 'responder',
        organization: 'Nepal Army',
        department: 'Disaster Response Battalion',
        phone: '+977-9851234567',
        isActive: true,
        specialization: ['Search and Rescue', 'Medical Response', 'Helicopter Operations'],
        address: {
            province: 'Bagmati',
            district: 'Kathmandu',
            municipality: 'Kathmandu Metropolitan City',
            ward: 5
        }
    },
    {
        name: 'Dr. Sita Sharma',
        email: 'sita.medic@mohp.gov.np',
        password: 'medic123',
        role: 'responder',
        organization: 'Ministry of Health',
        department: 'Emergency Medical Services',
        phone: '+977-9861234567',
        isActive: true,
        specialization: ['Emergency Medicine', 'Trauma Care', 'Public Health'],
        address: {
            province: 'Bagmati',
            district: 'Kathmandu',
            municipality: 'Kathmandu Metropolitan City',
            ward: 7
        }
    },
    {
        name: 'Hari Prasad Coordinator',
        email: 'hari.analyst@drrportal.gov.np',
        password: 'analyst123',
        role: 'coordinator',
        organization: 'Department of Disaster Risk Reduction',
        department: 'Risk Analysis Division',
        phone: '+977-9871234567',
        isActive: true,
        specialization: ['Risk Assessment', 'Data Analysis', 'GIS Mapping']
    },
    {
        name: 'Maya Gurung Observer',
        email: 'maya.observer@undp.org',
        password: 'observer123',
        role: 'viewer',
        organization: 'UNDP Nepal',
        department: 'Disaster Risk Reduction',
        phone: '+977-9881234567',
        isActive: true
    },
    {
        name: 'General Viewer',
        email: 'viewer@example.com',
        password: 'viewer123',
        role: 'viewer',
        organization: 'General Public',
        phone: '+977-9891234567',
        isActive: true
    }
];

const sampleTeams = [
    {
        name: 'Central Emergency Response Team',
        description: 'Primary emergency response team for central Nepal covering Bagmati Province',
        type: 'rescue',
        active: true,
        location: {
            province: 'Bagmati',
            district: 'Kathmandu'
        }
    },
    {
        name: 'Mountain Rescue Team Nepal',
        description: 'Specialized high-altitude rescue team for mountainous regions',
        type: 'rescue',
        active: true,
        location: {
            province: 'Gandaki',
            district: 'Kaski'
        }
    },
    {
        name: 'Medical Emergency Response Unit',
        description: 'Specialized medical emergency response team',
        type: 'medical',
        active: true,
        location: {
            province: 'Bagmati',
            district: 'Kathmandu'
        }
    },
    {
        name: 'Fire Brigade Team',
        description: 'Professional firefighting team for emergency response',
        type: 'firefighting',
        active: true,
        location: {
            province: 'Bagmati',
            district: 'Lalitpur'
        }
    },
    {
        name: 'Logistics Coordination Team',
        description: 'Team responsible for resource and logistics coordination',
        type: 'logistics',
        active: true,
        location: {
            province: 'Bagmati',
            district: 'Kathmandu'
        }
    }
];

const sampleIncidents = [
    {
        title: 'Major Earthquake - Sindhupalchok District',
        description: 'Magnitude 6.2 earthquake struck at 14:30 local time causing significant structural damage and casualties',
        type: 'earthquake',
        location: {
            coordinates: [85.6344, 27.6644], // [longitude, latitude] for GeoJSON
            province: 'Bagmati',
            district: 'Sindhupalchok',
            municipality: 'Chautara Sangachokgadhi'
        },
        severity: 'critical',
        status: 'active'
    },
    {
        title: 'Flash Flood - Karnali River Basin',
        description: 'Heavy monsoon rains causing flash flooding along Karnali River affecting multiple communities',
        type: 'flood',
        location: {
            coordinates: [81.6344, 28.6044],
            province: 'Karnali',
            district: 'Surkhet',
            municipality: 'Birendranagar'
        },
        severity: 'high',
        status: 'active'
    },
    {
        title: 'Landslide - Prithvi Highway',
        description: 'Major landslide blocked Prithvi Highway disrupting transportation between Kathmandu and Pokhara',
        type: 'landslide',
        location: {
            coordinates: [84.6244, 28.0044],
            province: 'Gandaki',
            district: 'Gorkha',
            municipality: 'Gorkha'
        },
        severity: 'medium',
        status: 'resolved'
    },
    {
        title: 'Forest Fire - Shivapuri National Park',
        description: 'Forest fire spreading across 200 hectares threatening nearby communities and wildlife',
        type: 'fire',
        location: {
            coordinates: [85.3706, 27.7804],
            province: 'Bagmati',
            district: 'Kathmandu',
            municipality: 'Kathmandu Metropolitan City'
        },
        severity: 'high',
        status: 'active'
    }
];

const sampleAlerts = [
    {
        type: 'Earthquake Aftershock Warning',
        message: 'Strong aftershocks (magnitude 5.0-5.8) expected in central Nepal over next 72 hours. Citizens advised to stay away from damaged buildings and follow safety protocols.',
        severity: 'Critical',
        status: 'Active',
        location: 'Central Nepal - Bagmati and Gandaki Provinces',
        affected: 2500000,
        issuedAt: new Date(),
        responseTime: 15
    },
    {
        type: 'Flash Flood Warning',
        message: 'Heavy rainfall forecast for next 24 hours. Flash flood warning for rivers in Terai region. Immediate evacuation recommended for low-lying areas.',
        severity: 'High',
        status: 'Active',
        location: 'Terai Region - Madhesh and Lumbini Provinces',
        affected: 800000,
        issuedAt: new Date(),
        responseTime: 30
    },
    {
        type: 'Health Advisory',
        message: 'Health advisory issued for flood-affected areas. Risk of water-borne diseases. Boil water before drinking and maintain hygiene.',
        severity: 'Medium',
        status: 'Advisory',
        location: 'Karnali Province - Surkhet District',
        affected: 50000,
        issuedAt: new Date(),
        responseTime: 60
    }
];

const sampleResources = [
    {
        name: 'Emergency Medical Kit - Type A',
        category: 'medical_supplies',
        type: 'Medical Kit',
        description: 'Comprehensive medical kit for emergency response including trauma care supplies',
        quantity: {
            total: 200,
            available: 156,
            unit: 'pieces',
            reserved: 24,
            inUse: 20
        },
        location: {
            name: 'Central Medical Warehouse',
            province: 'Bagmati',
            district: 'Kathmandu',
            municipality: 'Kathmandu Metropolitan City',
            coordinates: {
                latitude: 27.7172,
                longitude: 85.3240
            },
            facilityType: 'warehouse'
        },
        status: 'available',
        provider: {
            organization: 'Nepal Medical Supplies Ltd.',
            contactPerson: {
                name: 'Dr. Ramesh Adhikari',
                phone: '+977-1-4567890',
                email: 'ramesh@nepalmedical.com'
            },
            type: 'private'
        },
        specifications: {
            brand: 'MedKit Pro',
            condition: 'new',
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            technicalSpecs: {
                contents: ['Bandages', 'Antiseptics', 'Pain medication', 'Splints', 'IV fluids'],
                capacity: '50 patients',
                weight: '15 kg',
                dimensions: '60x40x30 cm'
            }
        },
        priority: 'high',
        tags: ['medical', 'emergency', 'trauma care', 'first aid']
    },
    {
        name: 'Rescue Boat - Zodiac Pro',
        category: 'transportation',
        type: 'Rescue Boat',
        description: 'Professional rescue boat for flood response and water rescues',
        quantity: {
            total: 15,
            available: 12,
            unit: 'vehicles',
            reserved: 1,
            inUse: 2
        },
        location: {
            name: 'Terai Flood Response Station',
            province: 'Madhesh',
            district: 'Saptari',
            municipality: 'Saptakoshi Municipality',
            coordinates: {
                latitude: 26.6644,
                longitude: 86.8344
            },
            facilityType: 'field_station'
        },
        status: 'available',
        provider: {
            organization: 'Nepal Disaster Management Authority',
            contactPerson: {
                name: 'Captain Rajesh Kumar',
                phone: '+977-33-520123',
                email: 'rajesh@ndma.gov.np'
            },
            type: 'government'
        },
        specifications: {
            brand: 'Zodiac',
            model: 'Pro 450',
            condition: 'good',
            technicalSpecs: {
                capacity: '12 persons',
                engine: '40 HP Outboard',
                length: '4.2 meters',
                material: 'Heavy-duty PVC'
            }
        },
        priority: 'high',
        tags: ['boat', 'rescue', 'flood response', 'transportation']
    },
    {
        name: 'Emergency Generator - 50KW',
        category: 'emergency_services',
        type: 'Generator',
        description: 'Portable diesel generator for emergency power supply during disasters',
        quantity: {
            total: 25,
            available: 18,
            unit: 'pieces',
            reserved: 3,
            inUse: 4
        },
        location: {
            name: 'Regional Equipment Depot',
            province: 'Gandaki',
            district: 'Kaski',
            municipality: 'Pokhara Metropolitan City',
            coordinates: {
                latitude: 28.2096,
                longitude: 83.9856
            },
            facilityType: 'warehouse'
        },
        status: 'available',
        provider: {
            organization: 'Ministry of Energy, Water Resources and Irrigation',
            contactPerson: {
                name: 'Eng. Pradeep Sharma',
                phone: '+977-61-520789',
                email: 'pradeep@energy.gov.np'
            },
            type: 'government'
        },
        specifications: {
            brand: 'Cummins',
            model: 'C55D5',
            condition: 'good',
            technicalSpecs: {
                power: '50 KW',
                fuel: 'Diesel',
                runtime: '24 hours continuous',
                weight: '850 kg'
            }
        },
        priority: 'medium',
        tags: ['generator', 'power', 'infrastructure', 'emergency']
    },
    {
        name: 'Relief Food Package - Family Pack',
        category: 'food_water',
        type: 'Food Package',
        description: 'Complete food package for family of 5 for 7 days during emergency',
        quantity: {
            total: 5000,
            available: 4200,
            unit: 'boxes',
            reserved: 500,
            inUse: 300
        },
        location: {
            name: 'Regional Food Storage Facility',
            province: 'Karnali',
            district: 'Surkhet',
            municipality: 'Birendranagar Municipality',
            coordinates: {
                latitude: 28.6044,
                longitude: 81.6344
            },
            facilityType: 'warehouse'
        },
        status: 'available',
        provider: {
            organization: 'Nepal Food Corporation',
            contactPerson: {
                name: 'Ram Kumar Thapa',
                phone: '+977-83-520456',
                email: 'ram@nfc.gov.np'
            },
            type: 'government'
        },
        specifications: {
            brand: 'NFC Relief',
            condition: 'good',
            expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
            technicalSpecs: {
                contents: ['Rice 10kg', 'Lentils 2kg', 'Oil 1L', 'Salt 1kg', 'Sugar 1kg'],
                familySize: '5 members',
                duration: '7 days',
                weight: '18 kg'
            }
        },
        priority: 'medium',
        tags: ['food', 'relief', 'family package', 'nutrition']
    },
    {
        name: 'Emergency Tent - Family Size',
        category: 'shelter_materials',
        type: 'Tent',
        description: 'Waterproof family-size emergency tent for disaster victims',
        quantity: {
            total: 1000,
            available: 820,
            unit: 'pieces',
            reserved: 100,
            inUse: 80
        },
        location: {
            name: 'Emergency Shelter Warehouse',
            province: 'Lumbini',
            district: 'Rupandehi',
            municipality: 'Butwal Sub-Metropolitan City',
            coordinates: {
                latitude: 27.7000,
                longitude: 83.4500
            },
            facilityType: 'warehouse'
        },
        status: 'available',
        provider: {
            organization: 'UNHCR Nepal',
            contactPerson: {
                name: 'Sarah Johnson',
                phone: '+977-1-5542244',
                email: 'johnson@unhcr.org'
            },
            type: 'international'
        },
        specifications: {
            brand: 'Coleman Emergency',
            model: 'Family Pro',
            condition: 'new',
            technicalSpecs: {
                capacity: '6 persons',
                material: 'Waterproof canvas',
                dimensions: '4m x 3m x 2.2m',
                weight: '25 kg'
            }
        },
        priority: 'high',
        tags: ['tent', 'shelter', 'emergency', 'waterproof', 'family']
    }
];

const sampleResourceRequests = [
    {
        title: 'Urgent Medical Supplies for Earthquake Victims',
        description: 'Immediate need for medical supplies including trauma care equipment, surgical supplies, and medications for treating earthquake casualties in remote mountain areas.',
        category: 'Medical',
        priority: 'Critical',
        status: 'Pending',
        location: {
            province: 'Bagmati',
            district: 'Sindhupalchok',
            municipality: 'Chautara Sangachokgadhi',
            coordinates: { latitude: 27.6644, longitude: 85.6344 },
            address: 'Chautara District Hospital'
        },
        requiredQuantity: 50,
        fulfilledQuantity: 0,
        unit: 'medical kits',
        urgentBy: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
        estimatedCost: { amount: 5000000, currency: 'NPR' },
        contactPerson: {
            name: 'Dr. Rajesh Kumar Shrestha',
            phone: '+977-9841234567',
            email: 'rajesh.cmo@health.gov.np',
            organization: 'Chautara District Hospital'
        },
        notes: 'Hospital overwhelmed with earthquake casualties. Current supplies depleted. Critical patients need immediate care. Helicopter transport required due to road blockage.'
    },
    {
        title: 'Emergency Food Distribution for Flood Victims',
        description: 'Large-scale food distribution required for families displaced by flooding in Karnali River basin. Immediate need for ready-to-eat meals and clean drinking water.',
        category: 'Food',
        priority: 'High',
        status: 'In Progress',
        location: {
            province: 'Karnali',
            district: 'Surkhet',
            municipality: 'Birendranagar',
            coordinates: { latitude: 28.6044, longitude: 81.6344 },
            address: 'Birendranagar Relief Distribution Center'
        },
        requiredQuantity: 2000,
        fulfilledQuantity: 600,
        unit: 'family food packages',
        urgentBy: new Date(Date.now() + 18 * 60 * 60 * 1000), // 18 hours from now
        estimatedCost: { amount: 12000000, currency: 'NPR' },
        contactPerson: {
            name: 'Ram Bahadur Thapa',
            phone: '+977-9851234567',
            organization: 'Surkhet District Administration'
        },
        notes: '2000 families affected by flooding. 600 packages already distributed. Need remaining 1400 packages urgently for families in temporary shelters.'
    },
    {
        title: 'Temporary Shelter Materials for Landslide Victims',
        description: 'Temporary housing materials needed for families whose homes were destroyed by landslide. Weather protection urgent as monsoon season continues.',
        category: 'Shelter',
        priority: 'High',
        status: 'Pending',
        location: {
            province: 'Gandaki',
            district: 'Gorkha',
            municipality: 'Gorkha',
            coordinates: { latitude: 28.0044, longitude: 84.6244 },
            address: 'Gorkha Municipality Relief Camp'
        },
        requiredQuantity: 200,
        fulfilledQuantity: 0,
        unit: 'emergency tents',
        urgentBy: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        estimatedCost: { amount: 8000000, currency: 'NPR' },
        contactPerson: {
            name: 'Sita Gurung',
            phone: '+977-9861234567',
            organization: 'Red Cross Society - Gorkha Branch'
        },
        notes: '200 families displaced by landslide. Currently staying in community hall without proper shelter. Monsoon season makes waterproof tents critical.'
    },
    {
        title: 'Clean Water Supply for Cholera Prevention',
        description: 'Emergency clean water supply needed to prevent cholera outbreak in flood-affected areas where water sources have been contaminated.',
        category: 'Water',
        priority: 'Critical',
        status: 'Pending',
        location: {
            province: 'Madhesh',
            district: 'Saptari',
            municipality: 'Saptakoshi Municipality',
            coordinates: { latitude: 26.6644, longitude: 86.8344 },
            address: 'Saptakoshi Health Post'
        },
        requiredQuantity: 50000,
        fulfilledQuantity: 0,
        unit: 'liters',
        urgentBy: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
        estimatedCost: { amount: 2000000, currency: 'NPR' },
        contactPerson: {
            name: 'Dr. Sunita Yadav',
            phone: '+977-9812345678',
            email: 'sunita@health.gov.np',
            organization: 'Saptakoshi Health Post'
        },
        notes: 'Water sources contaminated by flood. 3 suspected cholera cases reported. Immediate clean water supply critical to prevent outbreak in 10,000 population area.'
    },
    {
        title: 'Transportation Vehicles for Mountain Rescue',
        description: 'All-terrain vehicles needed for rescue operations in mountainous areas where roads have been damaged by earthquake-triggered landslides.',
        category: 'Transportation',
        priority: 'High',
        status: 'Pending',
        location: {
            province: 'Bagmati',
            district: 'Rasuwa',
            municipality: 'Kalika Rural Municipality',
            coordinates: { latitude: 28.1044, longitude: 85.3244 },
            address: 'Rasuwa District Emergency Operations Center'
        },
        requiredQuantity: 5,
        fulfilledQuantity: 0,
        unit: 'vehicles',
        urgentBy: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
        estimatedCost: { amount: 15000000, currency: 'NPR' },
        contactPerson: {
            name: 'Pemba Sherpa',
            phone: '+977-9823456789',
            organization: 'Rasuwa District Emergency Operations Center'
        },
        notes: 'Multiple villages cut off due to landslides. Existing vehicles cannot navigate damaged mountain roads. Need all-terrain vehicles for search and rescue operations.'
    }
];

const sampleNews = [
    {
        title: 'Major Earthquake Strikes Central Nepal: Emergency Response Activated',
        content: `A powerful magnitude 6.2 earthquake struck Sindhupalchok district in central Nepal today at 14:30 local time, causing significant casualties and infrastructure damage. The epicenter was located approximately 75 kilometers northeast of Kathmandu.

        Initial reports indicate at least 15 fatalities and 67 people injured, with numbers expected to rise as communication is restored with remote areas. The earthquake has caused widespread damage to buildings, with over 450 homes completely destroyed and 1,200 others sustaining various degrees of damage.

        The National Emergency Operations Center has been activated, and emergency response teams from the Nepal Army, Armed Police Force, and various humanitarian organizations have been deployed to the affected areas. Helicopters are being used to reach remote villages where road access has been blocked by landslides triggered by the earthquake.

        Prime Minister's Office has declared the affected areas as crisis zones and announced immediate relief measures. The government has allocated NPR 100 million for immediate relief and rescue operations.

        Citizens are advised to stay away from damaged buildings and be prepared for aftershocks. Emergency shelters have been established in schools and community centers in the affected areas.

        International assistance has been offered by neighboring countries, and the UN Office for the Coordination of Humanitarian Affairs is closely monitoring the situation.`,
        excerpt: 'Magnitude 6.2 earthquake hits Sindhupalchok district causing casualties and widespread damage. Emergency response teams deployed.',
        category: 'Breaking',
        priority: 'Critical',
        tags: ['earthquake', 'emergency response', 'casualties', 'sindhupalchok', 'relief operations'],
        location: {
            province: 'Bagmati',
            district: 'Sindhupalchok',
            coordinates: { latitude: 27.6644, longitude: 85.6344 }
        },
        source: {
            name: 'National Emergency Operations Center',
            type: 'Official',
            contact: '+977-1-4211984'
        },
        isVerified: true,
        isFeatured: true,
        views: 15420,
        shares: 892
    },
    {
        title: 'Monsoon Update: Heavy Rainfall Warning for Western and Central Nepal',
        content: `The Department of Hydrology and Meteorology has issued a comprehensive weather bulletin warning of heavy to very heavy rainfall across western and central regions of Nepal over the next 72 hours. The meteorological conditions indicate an active monsoon system moving towards Nepal from the Bay of Bengal.

        Areas likely to be most affected include the entire Terai region, with particular concern for districts along major river systems including the Koshi, Gandaki, and Karnali basins. Rainfall intensity is expected to reach 150-200mm in 24 hours in some areas.

        District administration offices in Saptari, Siraha, Kapilvastu, Rupandehi, and Banke have been placed on high alert. Flood early warning systems have been activated along major rivers, and evacuation plans are being reviewed.

        The Department has advised:
        - Citizens in flood-prone areas to remain vigilant
        - Local authorities to prepare for possible evacuations
        - Farmers to take precautionary measures for crops
        - Travelers to avoid unnecessary journeys in affected areas

        Emergency response teams have been pre-positioned in strategic locations, and helicopter rescue services are on standby. The National Emergency Operations Center is coordinating with provincial and local governments to ensure rapid response capabilities.

        This monsoon season has already been more active than usual, with several districts having already experienced flooding and landslides. Citizens are urged to follow official advisories and evacuation orders if issued.`,
        excerpt: 'Heavy rainfall warning issued for western and central Nepal as active monsoon system approaches.',
        category: 'Update',
        priority: 'High',
        tags: ['monsoon', 'rainfall', 'flood warning', 'weather alert', 'evacuation'],
        location: {
            province: 'Multiple',
            districts: ['Saptari', 'Siraha', 'Kapilvastu', 'Rupandehi', 'Banke']
        },
        source: {
            name: 'Department of Hydrology and Meteorology',
            type: 'Official',
            contact: '+977-1-4489000'
        },
        isVerified: true,
        isUrgent: true,
        views: 8930,
        shares: 445
    },
    {
        title: 'Nepal Launches Advanced Disaster Risk Management System with International Support',
        content: `The Government of Nepal, in partnership with the United Nations Development Programme (UNDP) and the World Bank, today launched an advanced Disaster Risk Management System designed to enhance the country's resilience against natural disasters.

        The comprehensive system includes early warning mechanisms, community-based disaster preparedness programs, and advanced risk assessment tools. The initiative represents a significant step forward in Nepal's disaster management capabilities, incorporating lessons learned from the 2015 earthquake and subsequent disasters.

        Key components of the new system include:

        1. Multi-hazard Early Warning System: Integrated monitoring for earthquakes, floods, landslides, and climate-related disasters
        2. Community Resilience Program: Training and capacity building at the grassroots level
        3. Digital Information Management: Real-time data collection and analysis for better decision making
        4. Emergency Communication Network: Improved coordination between agencies and communities

        The Minister of Home Affairs emphasized that this system represents a paradigm shift from reactive disaster response to proactive risk management. "We are moving from managing disasters to managing risks," the Minister stated during the launch ceremony.

        The project has received funding support of USD 50 million from international partners and will be implemented over the next five years. Training programs for local officials and community volunteers will begin immediately in earthquake-prone districts.

        International experts have praised Nepal's commitment to building forward better, noting that the new system incorporates global best practices while addressing Nepal's specific geographical and social challenges.

        The system will be piloted in 10 districts initially, with plans for nationwide implementation by 2026.`,
        excerpt: 'Nepal launches advanced disaster risk management system with international support to enhance resilience.',
        category: 'Prevention',
        priority: 'Medium',
        tags: ['disaster management', 'early warning', 'international cooperation', 'resilience', 'technology'],
        location: {
            province: 'All Provinces'
        },
        source: {
            name: 'Ministry of Home Affairs',
            type: 'Official',
            contact: '+977-1-4211011'
        },
        isVerified: true,
        isFeatured: true,
        views: 5420,
        shares: 234
    }
];

const sampleWeatherData = [
    {
        location: {
            name: 'Kathmandu',
            province: 'Bagmati',
            district: 'Kathmandu',
            coordinates: { latitude: 27.7172, longitude: 85.3240 }
        },
        current: {
            temperature: 24.5,
            humidity: 72,
            pressure: 1013.2,
            windSpeed: 8.5,
            windDirection: 225, // degrees (Southwest = 225°)
            visibility: 6.2,
            condition: 'Partly Cloudy',
            uvIndex: 6,
            cloudCover: 40,
            description: 'Partly cloudy with scattered clouds'
        },
        precipitation: {
            current: 0,
            daily: 2.3,
            weekly: 15.7
        },
        forecast: [
            {
                date: new Date(Date.now() + 24 * 60 * 60 * 1000),
                temperature: {
                    min: 18,
                    max: 28
                },
                precipitation: {
                    probability: 85,
                    amount: 25.5
                },
                condition: 'Heavy Rain',
                windSpeed: 15
            },
            {
                date: new Date(Date.now() + 48 * 60 * 60 * 1000),
                temperature: {
                    min: 17,
                    max: 26
                },
                precipitation: {
                    probability: 90,
                    amount: 35.2
                },
                condition: 'Thunderstorms',
                windSpeed: 18
            }
        ],
        alerts: [
            {
                type: 'flood_warning',
                severity: 'high',
                description: 'Heavy rainfall expected, flash flood warning issued',
                issuedAt: new Date(),
                expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000)
            }
        ],
        dataSource: {
            provider: 'Department of Hydrology and Meteorology',
            lastUpdated: new Date()
        },
        riskAssessment: {
            floodRisk: 'high',
            landslideRisk: 'moderate',
            overallRisk: 'high'
        }
    },
    {
        location: {
            name: 'Pokhara',
            province: 'Gandaki',
            district: 'Kaski',
            coordinates: { latitude: 28.2096, longitude: 83.9856 }
        },
        current: {
            temperature: 22.8,
            humidity: 78,
            pressure: 1008.5,
            windSpeed: 12.3,
            windDirection: 180, // degrees (South = 180°)
            visibility: 4.8,
            condition: 'Light Rain',
            uvIndex: 3,
            cloudCover: 80,
            description: 'Light rain with overcast conditions'
        },
        precipitation: {
            current: 5.2,
            daily: 15.8,
            weekly: 125.6
        },
        forecast: [
            {
                date: new Date(Date.now() + 24 * 60 * 60 * 1000),
                temperature: {
                    min: 16,
                    max: 25
                },
                precipitation: {
                    probability: 75,
                    amount: 18.3
                },
                condition: 'Heavy Rain',
                windSpeed: 20
            }
        ],
        alerts: [
            {
                type: 'storm_warning',
                severity: 'moderate',
                description: 'Landslide risk due to heavy rainfall in mountainous areas',
                issuedAt: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            }
        ],
        dataSource: {
            provider: 'Department of Hydrology and Meteorology',
            lastUpdated: new Date()
        },
        riskAssessment: {
            floodRisk: 'moderate',
            landslideRisk: 'high',
            overallRisk: 'high'
        }
    }
];

const sampleFloodPredictions = [
    {
        location: {
            name: 'Koshi River Basin - Dharan',
            province: 'Koshi',
            district: 'Sunsari',
            municipality: 'Dharan Sub-Metropolitan City',
            coordinates: {
                latitude: 26.6469,
                longitude: 87.0845
            },
            riverBasin: 'Koshi',
            elevation: 349
        },
        prediction: {
            riskLevel: 'high',
            confidence: 85,
            probability: 75,
            predictedDate: new Date(Date.now() + 6 * 60 * 60 * 1000),
            validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
            severity: {
                waterLevel: 2.3,
                affectedArea: 45.7,
                estimatedDuration: 12,
                populationAtRisk: 45000
            }
        },
        inputData: {
            weatherData: {
                currentPrecipitation: 25.4,
                forecastPrecipitation: 125.5,
                temperature: 25.5,
                humidity: 78,
                windSpeed: 12.3,
                pressure: 1008.5
            },
            historicalData: {
                avgRainfall: 65.2,
                maxRecordedRainfall: 245.8,
                previousFloodEvents: 3,
                seasonalPattern: 'monsoon_peak'
            },
            geographicalFactors: {
                soilSaturation: 78,
                snowMelt: 12.4,
                riverLevel: 245.8,
                damStatus: 'normal',
                deforestation: 15.2
            },
            humanFactors: {
                urbanization: 45.7,
                drainageCapacity: 65.3,
                populationDensity: 892
            }
        },
        modelInfo: {
            version: '2.1.3',
            algorithm: 'Ensemble Neural Network',
            trainingData: {
                startDate: new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000),
                endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                recordCount: 8760
            },
            accuracy: {
                overall: 87.5,
                precision: 85.2,
                recall: 89.3,
                f1Score: 87.2
            },
            processingTime: 2345
        },
        alerts: [
            {
                level: 'warning',
                message: 'High flood risk predicted within next 6 hours. Evacuation recommended for low-lying areas.',
                actionRequired: ['Evacuate low-lying areas', 'Monitor river levels', 'Prepare emergency supplies'],
                targetAudience: ['public', 'responders', 'authorities'],
                issuedAt: new Date(),
                expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
                sent: false,
                channels: ['sms', 'app', 'radio']
            }
        ],
        verification: {
            actualEvent: {
                occurred: false
            },
            accuracy: {},
            feedback: []
        },
        status: 'active',
        tags: ['koshi_basin', 'monsoon', 'high_risk', 'urban_area'],
        createdBy: 'AI_FLOOD_SYSTEM',
        metadata: {
            dataQuality: {
                completeness: 92.5,
                reliability: 89.3,
                timeliness: 5
            },
            computationMetrics: {
                cpuUsage: 67.2,
                memoryUsage: 78.9,
                executionTime: 2345
            }
        }
    },
    {
        location: {
            name: 'Bagmati River Basin - Kathmandu',
            province: 'Bagmati',
            district: 'Kathmandu',
            municipality: 'Kathmandu Metropolitan City',
            coordinates: {
                latitude: 27.7172,
                longitude: 85.3240
            },
            riverBasin: 'Bagmati',
            elevation: 1400
        },
        prediction: {
            riskLevel: 'moderate',
            confidence: 78,
            probability: 45,
            predictedDate: new Date(Date.now() + 12 * 60 * 60 * 1000),
            validUntil: new Date(Date.now() + 48 * 60 * 60 * 1000),
            severity: {
                waterLevel: 1.2,
                affectedArea: 15.3,
                estimatedDuration: 8,
                populationAtRisk: 25000
            }
        },
        inputData: {
            weatherData: {
                currentPrecipitation: 12.7,
                forecastPrecipitation: 85.3,
                temperature: 24.5,
                humidity: 72,
                windSpeed: 8.5,
                pressure: 1013.2
            },
            historicalData: {
                avgRainfall: 45.8,
                maxRecordedRainfall: 156.3,
                previousFloodEvents: 2,
                seasonalPattern: 'monsoon_moderate'
            },
            geographicalFactors: {
                soilSaturation: 65,
                snowMelt: 0,
                riverLevel: 112.3,
                damStatus: 'controlled',
                deforestation: 8.7
            },
            humanFactors: {
                urbanization: 85.4,
                drainageCapacity: 45.2,
                populationDensity: 4416
            }
        },
        modelInfo: {
            version: '2.1.3',
            algorithm: 'Ensemble Neural Network',
            trainingData: {
                startDate: new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000),
                endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                recordCount: 8760
            },
            accuracy: {
                overall: 87.5,
                precision: 85.2,
                recall: 89.3,
                f1Score: 87.2
            },
            processingTime: 1876
        },
        alerts: [
            {
                level: 'watch',
                message: 'Moderate flood risk possible within next 12 hours. Stay alert for changing conditions.',
                actionRequired: ['Monitor weather conditions', 'Review evacuation plans', 'Check drainage systems'],
                targetAudience: ['authorities', 'responders'],
                issuedAt: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                sent: false,
                channels: ['app', 'email']
            }
        ],
        verification: {
            actualEvent: {
                occurred: false
            },
            accuracy: {},
            feedback: []
        },
        status: 'active',
        tags: ['bagmati_basin', 'urban_flooding', 'moderate_risk', 'kathmandu_valley'],
        createdBy: 'AI_FLOOD_SYSTEM',
        metadata: {
            dataQuality: {
                completeness: 89.7,
                reliability: 85.6,
                timeliness: 8
            },
            computationMetrics: {
                cpuUsage: 52.3,
                memoryUsage: 61.4,
                executionTime: 1876
            }
        }
    }
];

const sampleEmergencyContacts = [
    {
        name: 'National Emergency Number',
        organization: 'National Emergency Operations Center',
        category: 'Government',
        phones: [
            { number: '103', type: 'Hotline', isActive: true },
            { number: '+977-1-4211984', type: 'Primary', isActive: true }
        ],
        email: 'emergency@neoc.gov.np',
        address: {
            province: 'Bagmati',
            district: 'Kathmandu',
            municipality: 'Kathmandu Metropolitan City',
            street: 'Singha Durbar',
            coordinates: {
                latitude: 27.7172,
                longitude: 85.3240
            }
        },
        serviceArea: [
            { province: 'Bagmati' },
            { province: 'Gandaki' },
            { province: 'Koshi' },
            { province: 'Madhesh' },
            { province: 'Lumbini' },
            { province: 'Karnali' },
            { province: 'Sudurpashchim' }
        ],
        availability: {
            is24x7: true
        },
        services: [
            { name: 'Emergency Coordination', description: 'Central coordination of all emergency responses', isActive: true },
            { name: 'Disaster Information', description: 'Official disaster information and updates', isActive: true },
            { name: 'Resource Coordination', description: 'Emergency resource allocation', isActive: true }
        ],
        priority: 5,
        isActive: true,
        lastVerified: new Date()
    },
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
            street: 'Naxal',
            coordinates: {
                latitude: 27.7172,
                longitude: 85.3240
            }
        },
        serviceArea: [
            { province: 'Bagmati' },
            { province: 'Gandaki' },
            { province: 'Koshi' },
            { province: 'Madhesh' },
            { province: 'Lumbini' },
            { province: 'Karnali' },
            { province: 'Sudurpashchim' }
        ],
        availability: {
            is24x7: true
        },
        services: [
            { name: 'Emergency Response', isActive: true },
            { name: 'Crime Reporting', isActive: true },
            { name: 'Traffic Control', isActive: true },
            { name: 'Disaster Support', isActive: true }
        ],
        priority: 5,
        isActive: true
    },
    {
        name: 'Fire Emergency Service',
        organization: 'Metropolitan Fire Brigade',
        category: 'Fire',
        phones: [
            { number: '101', type: 'Hotline', isActive: true }
        ],
        address: {
            province: 'Bagmati',
            district: 'Kathmandu',
            coordinates: {
                latitude: 27.7172,
                longitude: 85.3240
            }
        },
        serviceArea: [
            { province: 'Bagmati', district: 'Kathmandu' },
            { province: 'Bagmati', district: 'Lalitpur' },
            { province: 'Bagmati', district: 'Bhaktapur' }
        ],
        availability: {
            is24x7: true
        },
        services: [
            { name: 'Fire Fighting', isActive: true },
            { name: 'Rescue Operations', isActive: true },
            { name: 'Emergency Medical Response', isActive: true }
        ],
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
            coordinates: {
                latitude: 27.7172,
                longitude: 85.3240
            }
        },
        serviceArea: [
            { province: 'Bagmati' },
            { province: 'Gandaki' },
            { province: 'Koshi' },
            { province: 'Madhesh' },
            { province: 'Lumbini' },
            { province: 'Karnali' },
            { province: 'Sudurpashchim' }
        ],
        availability: {
            is24x7: true
        },
        services: [
            { name: 'Ambulance Service', isActive: true },
            { name: 'Emergency Medical Care', isActive: true },
            { name: 'Medical Consultation', isActive: true }
        ],
        priority: 5,
        isActive: true
    }
];

const sampleSystemConfigs = [
    {
        key: 'ALERT_SYSTEM',
        category: 'Notifications',
        value: {
            enabled: true,
            autoAlert: true,
            severityLevels: ['Low', 'Medium', 'High', 'Critical'],
            notificationChannels: ['SMS', 'Email', 'Push', 'Radio'],
            defaultLanguage: 'nepali'
        },
        description: 'Alert system configuration and notification settings'
    },
    {
        key: 'EMERGENCY_CONTACTS',
        category: 'Contacts',
        value: {
            autoUpdate: true,
            verificationInterval: 30,
            backupSources: ['Manual', 'Government API'],
            displayLanguages: ['nepali', 'english']
        },
        description: 'Emergency contact management configuration'
    },
    {
        key: 'WEATHER_INTEGRATION',
        category: 'Weather',
        value: {
            provider: 'DHM_NEPAL',
            updateInterval: 60,
            forecastDays: 7,
            alertThresholds: {
                rainfall: 100,
                windSpeed: 50,
                temperature: 40
            }
        },
        description: 'Weather service integration settings'
    }
];

async function seedDatabase() {
    try {
        console.log('🌱 Starting comprehensive database seeding...');
        
        // Connect to database
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully');

        // Clear existing data
        console.log('🧹 Clearing existing data...');
        await Promise.all([
            User.deleteMany({}),
            Team.deleteMany({}),
            Incident.deleteMany({}),
            Alert.deleteMany({}),
            Resource.deleteMany({}),
            ResourceRequest.deleteMany({}),
            NewsArticle.deleteMany({}),
            WeatherData.deleteMany({}),
            FloodPrediction.deleteMany({}),
            EmergencyContact.deleteMany({}),
            SystemConfig.deleteMany({}),
            ActivityLog.deleteMany({}),
            ChatConversation.deleteMany({})
        ]);
        console.log('✅ Existing data cleared');

        // Create users first
        console.log('👥 Creating users...');
        const users = [];
        for (const userData of sampleUsers) {
            const user = await User.create(userData);
            users.push(user);
            console.log(`   ✅ Created user: ${user.name} (${user.email})`);
        }

        const [adminUser, coordinatorUser, responderUser, medicUser] = users;

        // Create teams
        console.log('👨‍👩‍👧‍👦 Creating teams...');
        const teams = [];
        for (const teamData of sampleTeams) {
            const team = await Team.create({
                ...teamData,
                members: [
                    { user: responderUser._id, role: 'leader' },
                    { user: medicUser._id, role: 'member' }
                ]
            });
            teams.push(team);
            console.log(`   ✅ Created team: ${team.name}`);
        }

        // Create incidents
        console.log('🚨 Creating incidents...');
        const incidents = [];
        for (let i = 0; i < sampleIncidents.length; i++) {
            const incidentData = sampleIncidents[i];
            const incident = await Incident.create({
                ...incidentData,
                reportedBy: i < users.length ? users[i]._id : coordinatorUser._id,
                assignedTeam: i < teams.length ? teams[i]._id : teams[0]._id,
                verifiedBy: adminUser._id
            });
            incidents.push(incident);
            console.log(`   ✅ Created incident: ${incident.title}`);
        }

        // Create alerts
        console.log('⚠️ Creating alerts...');
        for (let i = 0; i < sampleAlerts.length; i++) {
            const alertData = sampleAlerts[i];
            const alert = await Alert.create({
                ...alertData,
                createdBy: coordinatorUser._id,
                relatedIncident: i < incidents.length ? incidents[i]._id : null
            });
            console.log(`   ✅ Created alert: ${alert.type}`);
        }

        // Create resources
        console.log('📦 Creating resources...');
        const resources = [];
        for (const resourceData of sampleResources) {
            const resource = await Resource.create({
                ...resourceData,
                createdBy: adminUser._id,
                lastUpdatedBy: adminUser._id
            });
            resources.push(resource);
            console.log(`   ✅ Created resource: ${resource.name}`);
        }

        // Create resource requests
        console.log('📋 Creating resource requests...');
        for (let i = 0; i < sampleResourceRequests.length; i++) {
            const requestData = sampleResourceRequests[i];
            const resourceRequest = await ResourceRequest.create({
                ...requestData,
                createdBy: i < users.length ? users[i + 1]._id : coordinatorUser._id,
                relatedIncident: i < incidents.length ? incidents[i]._id : incidents[0]._id,
                isVerified: true,
                verifiedBy: coordinatorUser._id
            });
            console.log(`   ✅ Created resource request: ${resourceRequest.title}`);
        }

        // Create news articles
        console.log('📰 Creating news articles...');
        for (let i = 0; i < sampleNews.length; i++) {
            const newsData = sampleNews[i];
            const news = await NewsArticle.create({
                ...newsData,
                createdBy: coordinatorUser._id,
                verifiedBy: adminUser._id,
                relatedIncidents: i < incidents.length ? [incidents[i]._id] : []
            });
            console.log(`   ✅ Created news: ${news.title}`);
        }

        // Create weather data
        console.log('🌤️ Creating weather data...');
        for (const weatherData of sampleWeatherData) {
            const weather = await WeatherData.create({
                ...weatherData,
                createdBy: adminUser._id
            });
            console.log(`   ✅ Created weather data: ${weather.location.name}`);
        }

        // Create flood predictions
        console.log('🌊 Creating flood predictions...');
        for (const floodData of sampleFloodPredictions) {
            const flood = await FloodPrediction.create({
                ...floodData,
                createdBy: adminUser._id
            });
            console.log(`   ✅ Created flood prediction: ${flood.location.name}`);
        }

        // Create emergency contacts
        console.log('📞 Creating emergency contacts...');
        for (const contactData of sampleEmergencyContacts) {
            const contact = await EmergencyContact.create({
                ...contactData,
                createdBy: adminUser._id,
                verifiedBy: adminUser._id,
                lastVerified: new Date()
            });
            console.log(`   ✅ Created emergency contact: ${contact.name}`);
        }

        // Create system configurations
        console.log('⚙️ Creating system configurations...');
        for (const configData of sampleSystemConfigs) {
            const config = await SystemConfig.create({
                ...configData,
                createdBy: adminUser._id,
                lastModifiedBy: adminUser._id
            });
            console.log(`   ✅ Created system config: ${config.key}`);
        }

        // Create some activity logs
        console.log('📊 Creating activity logs...');
        const activities = [
            {
                user: adminUser._id,
                action: 'USER_LOGIN',
                type: 'info',
                details: { description: 'User logged into the system', ip: '192.168.1.100' },
                ip: '192.168.1.100',
                userAgent: 'Mozilla/5.0'
            },
            {
                user: coordinatorUser._id,
                action: 'INCIDENT_CREATED',
                type: 'success',
                details: { 
                    description: 'New earthquake incident reported',
                    incidentId: incidents[0]._id,
                    incidentTitle: incidents[0].title
                }
            },
            {
                user: coordinatorUser._id,
                action: 'ALERT_SENT',
                type: 'success',
                details: { 
                    description: 'Emergency alert broadcast to affected areas',
                    recipients: 50000, 
                    channels: ['SMS', 'Radio'] 
                }
            }
        ];

        for (const activityData of activities) {
            await ActivityLog.create(activityData);
        }
        console.log(`   ✅ Created ${activities.length} activity logs`);

        // Final summary
        console.log('\n🎉 Database seeding completed successfully!');
        console.log('\n📊 Summary:');
        console.log(`   👥 Users: ${users.length}`);
        console.log(`   👨‍👩‍👧‍👦 Teams: ${teams.length}`);
        console.log(`   🚨 Incidents: ${incidents.length}`);
        console.log(`   ⚠️ Alerts: ${sampleAlerts.length}`);
        console.log(`   📦 Resources: ${resources.length}`);
        console.log(`   📋 Resource Requests: ${sampleResourceRequests.length}`);
        console.log(`   📰 News Articles: ${sampleNews.length}`);
        console.log(`   🌤️ Weather Data: ${sampleWeatherData.length}`);
        console.log(`   🌊 Flood Predictions: ${sampleFloodPredictions.length}`);
        console.log(`   📞 Emergency Contacts: ${sampleEmergencyContacts.length}`);
        console.log(`   ⚙️ System Configs: ${sampleSystemConfigs.length}`);
        console.log(`   📊 Activity Logs: ${activities.length}`);

        console.log('\n🔐 Test Login Credentials:');
        console.log('   Admin: admin@nepaldisaster.gov.np / admin123');
        console.log('   Coordinator: krishna.coordinator@neoc.gov.np / coord123');
        console.log('   Responder: ram.responder@nepalarmy.mil.np / resp123');
        console.log('   Medical: sita.medic@mohp.gov.np / medic123');
        console.log('   Coordinator: hari.analyst@drrportal.gov.np / analyst123');
        console.log('   Viewer: maya.observer@undp.org / observer123');
        console.log('   Viewer: viewer@example.com / viewer123');

        console.log('\n🌐 Access URLs:');
        console.log('   Frontend: http://localhost:3000');
        console.log('   Backend API: http://localhost:5000/api');
        console.log('   API Documentation: http://localhost:5000/api-docs');

    } catch (error) {
        console.error('❌ Database seeding failed:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
        process.exit(0);
    }
}

// Run the seeding
seedDatabase();
