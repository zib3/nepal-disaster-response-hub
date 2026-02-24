# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## 🛠️ Development Commands

### Initial Setup
```bash
# Install server dependencies
cd server && npm install

# Install client dependencies
cd client && npm install

# Copy and configure environment files
cp server/.env.example server/.env
```

### Database Setup
```bash
# Start MongoDB (platform specific)
brew services start mongodb-community  # macOS with Homebrew
sudo systemctl start mongod           # Linux
net start MongoDB                     # Windows

# Seed database (from server directory)
cd server && npm run seed             # Default seeding
cd server && npm run seed:dev         # Development data seeding
```

### Development
```bash
# Start backend development server (from server directory)
cd server && npm run dev              # Uses nodemon for hot reload

# Start frontend development server (from client directory)
cd client && npm run dev              # Starts Vite dev server

# Run frontend linter
cd client && npm run lint             # ESLint checks

# Build frontend for development
cd client && npm run build:dev        # Development build
```

### Production
```bash
# Build frontend for production (from client directory)
cd client && npm run build            # Production build
cd client && npm run preview          # Preview production build

# Start production server (from server directory)
cd server && npm start                # Runs Node.js directly
```

## 🏗️ Project Architecture

### System Overview
- **Full Stack**: Node.js/Express backend + React/Vite frontend
- **Real-time Communication**: Socket.IO for live updates
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with role-based access

### Backend Design
- Express.js REST API with real-time Socket.IO events
- MongoDB for disaster records, users, and resource tracking
- Winston logging and error handling middleware
- Rate limiting and security headers with express-rate-limit and helmet

### Frontend Design
- React 18 with TypeScript and Vite build system
- TailwindCSS + shadcn/ui (Radix UI) for components
- React Query for data fetching and caching
- React Router v6 for navigation

## 🔐 Authentication

### Overview
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Rate limiting on auth endpoints
- Session handling with Socket.IO

### User Roles & Access
```typescript
type UserRole = 'admin' | 'coordinator' | 'responder' | 'viewer'

interface AccessLevels {
  admin: '*'                         // Full system access
  coordinator: 'resources,teams,ops'  // Resource and team management
  responder: 'field,status'          // Field operations
  viewer: 'public'                   // Public information only
}
```

### Development Accounts
```bash
# Admin user (full access)
curl -X POST http://localhost:5001/api/auth/login \
  -d '{"email":"admin@nepaldisaster.gov.np","password":"admin123"}'  

# Coordinator (resource management)
curl -X POST http://localhost:5001/api/auth/login \
  -d '{"email":"coordinator@neoc.gov.np","password":"coordinator123"}'  
```

## 🔌 Integration Points

### Core API Routes
```typescript
interface APIRoutes {
  auth:      '/api/auth/*'      // Authentication & user management
  disasters: '/api/disasters/*'  // Disaster tracking and updates
  alerts:    '/api/alerts/*'     // Emergency alert system
  resources: '/api/resources/*'  // Resource management
  stats:     '/api/stats/*'      // Analytics and reporting
}
```

### Socket.IO Events 
```typescript
interface SocketEvents {
  // Real-time monitoring
  'disaster-monitoring': DisasterUpdate
  'breaking-news': NewsAlert
  'emergency-sos': SOSSignal
  
  // Resource tracking
  'resource-request-updated': ResourceStatus
  'team-coordination': TeamMessage
}
```

## ⚙️ Configuration

### Development Environment
```bash
# server/.env
NODE_ENV=development
PORT=5001
CLIENT_URL=http://localhost:8080
MONGODB_URI=mongodb://localhost:27017/nepal-disaster-response
JWT_SECRET=your_secure_secret_here
JWT_EXPIRE=30d

# client/.env
VITE_API_URL=http://localhost:5001
VITE_SOCKET_URL=ws://localhost:5001
VITE_MAPBOX_TOKEN=your_mapbox_token_here
```

## 📁 Project Structure

### Core Server Components
```bash
server/src/
├── config/        # App configuration and environment setup
├── controllers/   # Route handlers and business logic
├── middleware/    # Auth, validation, error handling
├── models/        # MongoDB/Mongoose schemas
├── routes/        # API route definitions
├── sockets/       # Socket.IO event handlers
└── utils/         # Shared utilities
```

### Core Client Components
```bash
client/src/
├── components/    # Reusable UI components
├── hooks/         # Custom React hooks
├── pages/         # Route components
├── services/      # API and socket clients
├── store/         # Global state management
└── utils/         # Shared utilities
```

## 🧪 Development Workflow

### Testing APIs
```bash
# Health check
curl http://localhost:5001/api/health

# Protected route example
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nepaldisaster.gov.np","password":"admin123"}' \
  | jq -r .token)

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5001/api/stats/dashboard
```

### Common Workflows
1. **Feature Development**
   - Branch naming: `feature/description`
   - Update both API and UI components
   - Add tests for new endpoints
   - Update Socket.IO events if needed

2. **Real-time Features**
   - Register events in `server/src/sockets`
   - Add handlers in `client/src/hooks/useSocket`
   - Test with multiple connected clients

3. **Protected Routes**
   - Add role checks in API middleware
   - Update frontend route guards
   - Test with different user roles
