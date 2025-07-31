#!/usr/bin/env node

import { spawn } from 'child_process';
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5001';

// Colors for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

const log = (color, message) => console.log(`${colors[color]}${message}${colors.reset}`);

async function testEndpoint(name, url, options = {}) {
    try {
        const response = await fetch(url, options);
        const data = await response.text();
        
        if (response.ok) {
            log('green', `✅ ${name}: PASSED`);
            console.log(`   Status: ${response.status}`);
            console.log(`   Response: ${data.substring(0, 100)}${data.length > 100 ? '...' : ''}`);
        } else {
            log('yellow', `⚠️  ${name}: WARNING`);
            console.log(`   Status: ${response.status}`);
            console.log(`   Response: ${data.substring(0, 100)}${data.length > 100 ? '...' : ''}`);
        }
    } catch (error) {
        log('red', `❌ ${name}: FAILED`);
        console.log(`   Error: ${error.message}`);
    }
    console.log('');
}

async function runTests() {
    log('blue', '🚀 Starting API Tests for Nepal Disaster Response Server');
    console.log('');

    // Test health endpoint
    await testEndpoint('Health Check', `${BASE_URL}/health`);

    // Test 404 handling
    await testEndpoint('404 Handler', `${BASE_URL}/nonexistent`);

    // Test CORS headers
    await testEndpoint('CORS Preflight', `${BASE_URL}/api/auth/login`, {
        method: 'OPTIONS',
        headers: {
            'Origin': 'http://localhost:8080',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type'
        }
    });

    // Test auth endpoints (these will fail without MongoDB but we can check they're reachable)
    await testEndpoint('Auth Register (No DB)', `${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123'
        })
    });

    await testEndpoint('Auth Login (No DB)', `${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123'
        })
    });

    // Test protected endpoints without auth
    await testEndpoint('Stats Endpoint (No Auth)', `${BASE_URL}/api/stats/dashboard`);

    await testEndpoint('Disasters Endpoint (No Auth)', `${BASE_URL}/api/disasters`);

    log('blue', '🏁 API Tests Completed');
}

// Run the tests
runTests().catch(console.error);
