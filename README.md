# Nepal Disaster Response System

A comprehensive emergency management platform designed for Nepal's unique geographical challenges, providing real-time disaster monitoring, response coordination, and community-driven disaster preparedness.

## 🌟 Features

### Core Functionality
- **Real-time News Management** - Breaking news, disaster updates, and preventive information
- **Resource Request System** - Medical supplies, food distribution, and shelter resources tracking
- **Emergency Contacts Directory** - Comprehensive database of emergency services and hotlines
- **Disaster Monitoring & Alerts** - Advanced monitoring across all 77 districts of Nepal
- **Response Team Coordination** - Seamless coordination between agencies and volunteers
- **Interactive GIS Mapping** - Real-time disaster impact visualization

### Technical Features
- **JWT Authentication & Authorization** - Secure role-based access control
- **Socket.IO Real-time Updates** - Live disaster monitoring and communications
- **RESTful API Design** - Comprehensive API for all operations
- **MongoDB Database** - Scalable document-based data storage
- **React Frontend** - Modern, responsive user interface
- **Express.js Backend** - Robust server-side architecture

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "Nepal Disaster Response"
   ```

2. **Setup Backend**
   ```bash
   cd server
   npm install
   cp .env.example .env  # Configure your environment variables
   ```

3. **Setup Frontend**
   ```bash
   cd ../client
   npm install
   ```

4. **Start MongoDB**
   ```bash
   # On macOS with Homebrew
   brew services start mongodb-community
   
   # On Linux
   sudo systemctl start mongod
   
   # On Windows
   net start MongoDB
   ```

5. **Seed Database with Sample Data**
   ```bash
   cd ../server
   npm run seed
   ```

6. **Start the Servers**
   ```bash
   # Terminal 1: Backend
   cd server
   npm run dev
   
   # Terminal 2: Frontend
   cd client
   npm run dev
   ```

## 🔧 Configuration

### Environment Variables (.env)
```env
# Server Configuration
NODE_ENV=development
PORT=5001
CLIENT_URL=http://localhost:8080

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/nepal-disaster-response

# JWT Configuration
JWT_SECRET=nepal_disaster_response_jwt_secret_key_2024
JWT_EXPIRE=30d

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

## 🔑 Authentication

### Test Credentials
- **Admin**: admin@nepaldisaster.gov.np / admin123
- **Coordinator**: coordinator@neoc.gov.np / coordinator123
- **Responder**: responder@nepal.army.mil.np / responder123

Note: The seeded admin user is created with email `admin@nepaldisaster.gov.np`. If you encounter login issues, ensure the database has been properly seeded.

### User Roles
- **Admin**: Full system access, user management, system configuration
- **Coordinator**: Disaster coordination, resource management, team assignments
- **Responder**: Field operations, status updates, resource requests
- **Viewer**: Read-only access to public information

## 📊 API Documentation

### Base URL
- Development: `http://localhost:5001/api`
- Production: `https://your-domain.com/api`

### Public Endpoints
```http
GET /api/health                    # System health check
GET /api/news                      # News articles with filtering
GET /api/news/breaking             # Breaking news only
GET /api/news/search?q=<query>     # Search news articles
GET /api/emergency-contacts        # Emergency contacts directory
GET /api/emergency-contacts/hotlines # Emergency hotlines only
```

### Protected Endpoints
```http
POST /api/auth/login               # User authentication
POST /api/auth/register            # User registration
GET  /api/auth/me                  # Current user info

GET  /api/stats/dashboard          # Dashboard statistics
GET  /api/disasters                # Disaster records
GET  /api/alerts                   # Alert system
GET  /api/resources                # Resource requests
GET  /api/users                    # User management
```

### Request/Response Examples

#### Login
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@nepaldisaster.gov.np",
    "password": "admin123"
  }'
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Protected Request
```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:5001/api/stats/dashboard
```

## 🏗️ Architecture

### Backend Structure
```
server/
├── src/
│   ├── config/         # Database and logging configuration
│   ├── controllers/    # Business logic
│   ├── middleware/     # Authentication and error handling
│   ├── models/         # Mongoose schemas
│   ├── routes/         # API route definitions
│   ├── seeders/        # Database seeding scripts
│   └── index.js        # Server entry point
├── .env                # Environment variables
└── package.json        # Dependencies and scripts
```

### Frontend Structure
```
client/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Application pages
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions
│   └── main.tsx        # Application entry point
├── public/             # Static assets
└── package.json        # Dependencies and scripts
```

## 🗄️ Database Schema

### Key Collections
- **Users**: Authentication and user management
- **Disasters**: Disaster records with location and impact data
- **NewsArticles**: News and updates with verification status
- **ResourceRequests**: Resource needs and fulfillment tracking
- **EmergencyContacts**: Emergency service contact information
- **Alerts**: Real-time alerts and notifications

## 🔄 Real-time Features

### Socket.IO Events
- `disaster-monitoring`: General disaster updates
- `new-news`: New news article published
- `breaking-news`: Critical news updates
- `resource-request-updated`: Resource status changes
- `emergency-sos`: Emergency distress signals
- `team-coordination`: Team communication

## 🧪 Testing

### Backend Testing
```bash
cd server
npm test
```

### API Testing with curl
```bash
# Test health endpoint
curl http://localhost:5001/api/health

# Test news endpoint
curl http://localhost:5001/api/news

# Test login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nepaldisaster.gov.np","password":"admin123"}'
```

## 🚀 Deployment

### Production Considerations
1. **Environment Variables**: Update all production URLs and secrets
2. **Database**: Use MongoDB Atlas or dedicated MongoDB server
3. **SSL/TLS**: Enable HTTPS for security
4. **Process Management**: Use PM2 or similar for process management
5. **Reverse Proxy**: Configure nginx for load balancing
6. **Monitoring**: Implement logging and error tracking

### Docker Deployment (Optional)
```dockerfile
# Example Dockerfile for backend
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5001
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Review the API documentation

## 🏥 Emergency Contacts

**This is a development system. For real emergencies:**
- **Nepal Police**: 100
- **Fire Service**: 101
- **Ambulance**: 102
- **Nepal Army**: +977-1-4261945
- **NEOC**: +977-1-4260402

---

**⚠️ Important**: This system is designed for disaster response coordination. In case of actual emergencies, always contact official emergency services first.
