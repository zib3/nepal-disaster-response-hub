# Nepal Disaster Response Server

A Node.js/Express API server for the Nepal Disaster Response System, providing backend services for disaster management, alert systems, and real-time monitoring.

## 🚀 Features

- **User Authentication**: JWT-based auth with role-based access control
- **Disaster Management**: CRUD operations for disaster tracking
- **Alert System**: Real-time emergency alerts
- **Statistics Dashboard**: Comprehensive statistics for the dashboard
- **Real-time Updates**: Socket.IO for live data updates
- **Security**: Helmet, CORS, rate limiting, and input validation
- **Logging**: Winston-based logging system
- **Database**: MongoDB with Mongoose ODM

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (for production)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd "Nepal Disaster Response/server"
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   NODE_ENV=development
   PORT=5001
   CLIENT_URL=http://localhost:8080
   MONGODB_URI=mongodb://localhost:27017/nepal-disaster-response
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRE=30d
   ```

## 🏃‍♂️ Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## 🧪 Testing

### Manual API Testing
```bash
# Test health endpoint
curl http://localhost:5001/health

# Run automated tests (server must be running)
node test-api.js
```

### Example API Calls

1. **Register User**:
   ```bash
   curl -X POST http://localhost:5001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "name": "John Doe",
       "email": "john@example.com",
       "password": "password123",
       "role": "responder",
       "organization": "Nepal Red Cross"
     }'
   ```

2. **Login**:
   ```bash
   curl -X POST http://localhost:5001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "john@example.com",
       "password": "password123"
     }'
   ```

3. **Get Dashboard Stats** (requires auth token):
   ```bash
   curl -X GET http://localhost:5001/api/stats/dashboard \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info

### Disasters
- `GET /api/disasters` - Get all disasters
- `POST /api/disasters` - Create new disaster
- `GET /api/disasters/:id` - Get specific disaster

### Alerts
- `GET /api/alerts` - Get all alerts
- `POST /api/alerts` - Create new alert
- `GET /api/alerts/recent` - Get recent alerts

### Statistics
- `GET /api/stats/dashboard` - Dashboard statistics
- `GET /api/stats/disasters-by-type` - Disaster statistics by type

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get specific user

### System
- `GET /health` - Health check endpoint

## 🏗️ Architecture

```
src/
├── config/
│   ├── database.js      # MongoDB connection
│   └── logger.js        # Winston logging setup
├── controllers/
│   ├── authController.js    # Authentication logic
│   └── statsController.js   # Statistics logic
├── middleware/
│   ├── auth.js              # JWT authentication
│   └── errorHandler.js      # Global error handling
├── models/
│   ├── User.js             # User model
│   ├── Disaster.js         # Disaster model
│   └── Alert.js            # Alert model
├── routes/
│   ├── auth.js             # Auth routes
│   ├── disasters.js        # Disaster routes
│   ├── alerts.js           # Alert routes
│   ├── stats.js            # Statistics routes
│   └── users.js            # User routes
└── index.js                # Main server file
```

## 🔧 Configuration

### Environment Variables
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 5001)
- `CLIENT_URL`: Frontend URL for CORS
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: JWT signing secret
- `JWT_EXPIRE`: JWT expiration time

### Security Features
- Helmet for security headers
- CORS configured for client communication
- Rate limiting (100 requests per 15 minutes)
- Input validation with express-validator
- Password hashing with bcryptjs

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**:
   ```bash
   lsof -ti:5001 | xargs kill -9
   ```

2. **MongoDB connection timeout**:
   - Ensure MongoDB is running
   - Check MONGODB_URI in .env
   - For development without MongoDB, expect timeout errors in auth endpoints

3. **CORS issues**:
   - Verify CLIENT_URL matches your frontend URL
   - Check browser console for CORS errors

## 📝 Development Notes

- The server uses ES6 modules (`"type": "module"` in package.json)
- All routes require authentication except `/health` and auth endpoints
- Real-time features use Socket.IO for live updates
- Logging is configured with Winston (console output in development)
- MongoDB models use Mongoose with built-in validation

## 🤝 Integration with Client

This server is designed to work with the React client in the `../client` directory. The client expects:

- Health check at `/health`
- Auth endpoints for login/register
- Dashboard stats at `/api/stats/dashboard`
- Real-time updates via Socket.IO
- CORS enabled for `http://localhost:8080`

## 🚀 Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Configure MongoDB URI for production database
3. Set strong JWT_SECRET
4. Configure proper CLIENT_URL
5. Consider using PM2 or similar process manager
6. Set up proper logging (file-based)
7. Configure reverse proxy (nginx) if needed

---

**Status**: ✅ Server tested and functional. Ready for integration with client application.
