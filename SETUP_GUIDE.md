# AidFlow Setup Guide

Complete setup guide for the AidFlow Emergency Response System with Groq AI integration.

## 📋 Prerequisites

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **MongoDB**: Atlas account or local MongoDB instance
- **Groq API Key**: Free account at [console.groq.com](https://console.groq.com/keys)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/aidflow.git
cd aidflow
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file in the `backend` directory:

```env
# Database
MONGO_URI=your_mongodb_connection_string

# Server
PORT=5000

# Authentication
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# External APIs
FIRMS_API_KEY=your_firms_api_key

# Groq AI (Ultra-fast AI Decision Making)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
```

**Get your Groq API key:**
1. Visit [console.groq.com/keys](https://console.groq.com/keys)
2. Sign up for a free account
3. Create an API key (starts with `gsk_...`)
4. Add it to your `.env` file

### 3. Frontend Setup

```bash
cd frontend
npm install
```

### 4. Seed the Database

```bash
cd backend
npm run seed-all
```

This will populate the database with:
- Sample users (all roles)
- Inventory items
- Locations
- Emergency requests
- Donations

### 5. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## 📦 Package.json Files

### Backend Dependencies

All required dependencies are included in `backend/package.json`:

```json
{
  "dependencies": {
    "bcryptjs": "^3.0.2",           // Password hashing
    "cors": "^2.8.5",               // CORS middleware
    "csvtojson": "^2.0.13",         // CSV parsing
    "dotenv": "^17.2.3",            // Environment variables
    "express": "^5.1.0",            // Web framework
    "groq-sdk": "^0.37.0",          // Groq AI SDK
    "jsonwebtoken": "^9.0.2",       // JWT authentication
    "mongoose": "^8.19.2",          // MongoDB ODM
    "node-cron": "^4.2.1",          // Scheduled tasks
    "node-fetch": "^3.3.2"          // HTTP requests
  },
  "devDependencies": {
    "nodemon": "^3.1.10"            // Development server
  }
}
```

### Frontend Dependencies

All required dependencies are included in `frontend/package.json`:

```json
{
  "dependencies": {
    "@fortawesome/fontawesome-svg-core": "^7.0.1",
    "@fortawesome/free-solid-svg-icons": "^7.0.1",
    "@fortawesome/react-fontawesome": "^3.0.2",
    "axios": "^1.13.1",             // HTTP client
    "framer-motion": "^12.23.12",   // Animations
    "jwt-decode": "^4.0.0",         // JWT decoding
    "leaflet": "^1.9.4",            // Maps
    "lucide-react": "^0.548.0",     // Icons
    "react": "^19.1.1",             // React framework
    "react-dom": "^19.1.1",
    "react-leaflet": "^5.0.0",      // React Leaflet wrapper
    "react-router-dom": "^7.9.5",   // Routing
    "react-scripts": "5.0.1",       // Build tools
    "recharts": "^3.3.0",           // Charts
    "web-vitals": "^2.1.4"          // Performance metrics
  }
}
```

## 🔐 Default User Credentials

After seeding, you can login with these accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@aidflow.com | admin123 |
| Branch Manager | manager@aidflow.com | manager123 |
| Dispatcher | dispatcher@aidflow.com | dispatcher123 |
| Volunteer | volunteer@aidflow.com | volunteer123 |
| Affected Citizen | citizen@aidflow.com | citizen123 |

## 🤖 Groq AI Features

The system uses Groq AI for ultra-fast emergency decision making:

- **Model**: `llama-3.1-8b-instant` (2-3 second response time)
- **Capabilities**:
  - Autonomous emergency assessment
  - Resource allocation decisions
  - Risk analysis
  - Priority classification
  - Intelligent dispatch recommendations

**Without Groq API Key:**
- System falls back to rule-based decision making
- All features remain functional
- Slightly less sophisticated analysis

## 📁 Project Structure

```
aidflow/
├── backend/                 # Node.js Express backend
│   ├── config/              # Database and key configurations
│   ├── data/                # Seed JSON data
│   ├── library/             # Library & helper scripts
│   ├── middleware/          # JWT auth & role validation middleware
│   ├── models/              # Mongoose database models
│   ├── routes/              # Express API route files
│   ├── scripts/             # Utility seeding & setup scripts
│   ├── services/            # Core business logic & AI services
│   ├── tests/               # Backend tests
│   ├── utils/               # Utility helper modules
│   ├── .env                 # Environment variables (create this)
│   ├── server.js            # Main Express entry point
│   └── package.json         # Backend dependencies
│
├── frontend/                # React single page application
│   ├── public/              # Public HTML templates & static files
│   ├── src/
│   │   ├── assets/          # Static media assets (e.g. images)
│   │   ├── components/      # React functional components
│   │   ├── css/             # Stylesheets (vanilla CSS files)
│   │   ├── utils/           # Frontend API and RBAC helpers
│   │   ├── App.js           # React router & core wrapper
│   │   └── index.js         # Frontend entry point
│   └── package.json         # Frontend dependencies
│
├── agents/                  # Python Agent 4 (USGS/FIRMS Disaster Monitor)
│   ├── disaster_agent.py    # Main monitoring execution script
│   └── requirements.txt     # Python requirements for monitoring agent
│
├── ml_server/               # FastAPI EfficientNet Inference Microservice
│   ├── app.py               # FastAPI entry point & API endpoints
│   ├── model_loader.py      # EfficientNet model loader helper
│   ├── requirements.txt     # Python requirements for ML service
│   └── best_effnet_b3_multilabel.pth # Pre-trained model weights
│
├── docs/                    # Architectural & module documentation
├── .gitignore              # Git ignore patterns
└── README.md               # Main project overview README
```

## 🔧 Available Scripts

### Backend

```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm run seed       # Seed basic data
npm run seed-all   # Seed all data (recommended)
npm run seed-users # Seed only users
```

### Frontend

```bash
npm start          # Start development server
npm run build      # Build for production
npm test           # Run tests
```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Emergency
- `GET /api/emergency/requests` - Get all emergencies
- `POST /api/emergency/request` - Create emergency request
- `POST /api/emergency/public-request` - Public emergency request
- `GET /api/emergency/ai-capabilities` - Check AI status

### Inventory
- `GET /api/inventory/items` - Get inventory items
- `POST /api/inventory/items` - Add inventory item
- `PUT /api/inventory/items/:id` - Update inventory item
- `DELETE /api/inventory/items/:id` - Delete inventory item

### Routing
- `POST /api/routing/optimize` - Get optimized route
- `GET /api/routing/history` - Get routing history

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Verify your `MONGO_URI` in `.env`
- Check if your IP is whitelisted in MongoDB Atlas
- Ensure network connectivity

### Groq API Issues
- Verify your `GROQ_API_KEY` is correct
- Check if you have API quota remaining
- System will fallback to rule-based decisions if Groq fails

### Port Already in Use
```bash
# Kill process on port 5000 (backend)
npx kill-port 5000

# Kill process on port 3000 (frontend)
npx kill-port 3000
```

### Node Modules Issues
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

## 📊 System Requirements

### Minimum
- 4GB RAM
- 2 CPU cores
- 10GB disk space

### Recommended
- 8GB RAM
- 4 CPU cores
- 20GB disk space
- SSD storage

## 🔒 Security Notes

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Change default passwords** - Update all default user passwords in production
3. **Use strong JWT secrets** - Generate secure random strings
4. **Enable HTTPS** - Use SSL certificates in production
5. **Keep dependencies updated** - Regularly run `npm audit fix`

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📧 Support

For issues and questions:
- GitHub Issues: https://github.com/your-username/aidflow/issues
- Email: support@aidflow.com

---

**Built with ❤️ for emergency response and disaster management in Punjab, India**
