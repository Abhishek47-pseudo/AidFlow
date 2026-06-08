# 🏗️ AidFlow AI - Project Structure

## 📁 Complete Project Organization

```
AidFlow/
│
├── 📂 backend/                          # Backend Server (Node.js + Express)
│   ├── 📂 config/                       # Configuration files
│   │   └── db.js                        # Database connection setup
│   │
│   ├── 📂 data/                         # Seed & CSV prediction files
│   │   ├── disasters.json               # Seed disaster zones
│   │   └── inventory.json               # Seed inventory items
│   │
│   ├── 📂 library/                      # Helper library files
│   │   └── helper.js                    # Utility helper methods
│   │
│   ├── 📂 middleware/                   # Authentication & authorization middleware
│   │   ├── auth.js                      # JWT validation middleware
│   │   └── rbac.js                      # Role-Based Access Control middleware
│   │
│   ├── 📂 models/                       # MongoDB Models (Mongoose Schemas)
│   │   ├── User.js                      # User database model & credentials
│   │   ├── Emergency.js                 # Emergency request reports & AI analysis
│   │   ├── Inventory.js                 # Inventory, donations & assistance requests
│   │   ├── Disaster.js                  # Disaster database model
│   │   ├── DisasterZone.js              # Geographic disaster tracking zones
│   │   ├── AgentOutput.js               # Multi-agent analysis outputs & execution logs
│   │   ├── DispatchRequest.js           # Resource dispatch transaction details
│   │   ├── RoutingHistory.js            # Calculated response routing paths
│   │   └── SeverityLog.js               # Audit log of emergency severity updates
│   │
│   ├── 📂 routes/                       # Express API Route Handlers
│   │   ├── emergency.js                 # Emergency submission, updates, analysis
│   │   ├── agents.js                    # Route optimization and agent performance endpoints
│   │   ├── inventory.js                 # Inventory, donation & request actions
│   │   ├── disasters.js                 # Active disaster zone management
│   │   └── dataManagement.js            # Database seeding and state control APIs
│   │
│   ├── 📂 scripts/                      # Database & tool setup scripts
│   │   └── setupOllama.js               # Local Ollama LLM setup helper
│   │
│   ├── 📂 services/                     # Business Logic & AI Services
│   │   ├── aiAgent.js                   # Core AI coordinator & decision engine
│   │   ├── nlpEngine.js                 # NLP processing (Agent 1)
│   │   ├── imageDisasterDetection.js    # Image analysis (Agent 2)
│   │   ├── smartRouting.js              # Route optimization agent (Agent 3)
│   │   ├── dispatchService.js           # Automated resource dispatch engine
│   │   ├── routingService.js            # OSRM router integration wrapper
│   │   ├── emergencyDecisionAgent.js    # Automated emergency dispatch decision agent
│   │   ├── liveDisasterService.js       # Live disaster feeds synchronization
│   │   ├── notificationService.js       # Outbound SMS/Email notification handling
│   │   ├── realisticTimingService.js    # Dynamic eta updates & routing metrics
│   │   ├── trafficService.js            # Live/simulated traffic updates
│   │   └── weatherService.js            # OpenWeather integration for routing
│   │
│   ├── 📂 tests/                        # Backend tests
│   ├── 📂 utils/                        # Utility functions
│   │
│   ├── .env                             # Local environment configuration
│   ├── db.js                            # DB initialization helper
│   ├── migrateInventoryLocations.js     # Data migration helper script
│   ├── route_optimizer.py               # Python-based route solver
│   ├── seedAll.js                       # Seeding entry point
│   ├── server.js                        # Express app initialization & root endpoints
│   ├── package.json                     # Node backend dependencies
│   └── README.md                        # Backend architectural overview
│
├── 📂 frontend/                         # React Frontend Application
│   ├── 📂 public/                       # Static public files & assets
│   │   ├── index.html                   # HTML template
│   │   └── favicon.ico                  # Favicon
│   │
│   ├── 📂 src/                          # Application source code
│   │   ├── 📂 assets/                   # Static media assets
│   │   │   └── heroimg.jpg              # Home page hero background
│   │   │
│   │   ├── 📂 components/               # React functional views
│   │   │   ├── EmergencyRequest.jsx     # Incident submission view
│   │   │   ├── EmergencyDashboard.jsx   # Administrative dashboard
│   │   │   ├── DispatchTracker.jsx      # Response en-route map tracker
│   │   │   ├── InventoryPage.jsx        # Resource inventory editor
│   │   │   ├── LiveDisasters.jsx        # Disaster monitor dashboard
│   │   │   ├── VolunteerPage.jsx        # Volunteer action dashboard
│   │   │   ├── RecipientPage.jsx        # Affected citizen request view
│   │   │   ├── ReliefAnalytics.jsx      # Operations metrics dashboard
│   │   │   ├── RoutingVisualization.jsx # Map routing control panel
│   │   │   ├── Login.jsx                # Session start form
│   │   │   ├── Register.jsx             # User creation form
│   │   │   └── [22+ more UI components]
│   │   │
│   │   ├── 📂 css/                      # vanilla CSS stylesheet modules (24 files)
│   │   │
│   │   ├── 📂 utils/                    # Common frontend helper code
│   │   │   ├── api.js                   # Axios HTTP interceptor & config
│   │   │   └── rbac.js                  # Frontend client permission checks
│   │   │
│   │   ├── App.js                       # Router configuration component
│   │   ├── index.js                     # React bootstrapping script
│   │   └── index.css                    # Global baseline css styles
│   │
│   ├── package.json                     # Frontend npm packages
│   ├── tailwind.config.js               # Tailwind configuration file
│   └── README.md                        # Frontend documentation
│
├── 📂 agents/                           # Python USGS/NASA Disaster Monitoring Agent
│   ├── disaster_agent.py                # Live event fetching & syncing script
│   └── requirements.txt                 # Agent requirements
│
├── 📂 ml_server/                        # FastAPI EfficientNet Inference Microservice
│   ├── app.py                           # Web application & prediction routes
│   ├── model_loader.py                  # PyTorch model load utility
│   ├── requirements.txt                 # Service requirements
│   └── best_effnet_b3_multilabel.pth    # Deep learning weights file
│
├── 📂 docs/                             # Comprehensive Documentation
│   ├── 📂 audits/                       # AI Agent validation & logging files
│   │   ├── nlp-system-before.md         # Audit file (before)
│   │   ├── nlp-system-after.md          # Audit file (after)
│   │   └── walkthrough.md               # Audit walkthrough
│   ├── PROJECT_OVERVIEW.md              # High-level overview
│   ├── SYSTEM_ARCHITECTURE.md           # System design & component interaction
│   ├── AI_AGENTS_DOCUMENTATION.md       # AI capabilities detailed specifications
│   ├── DATABASE_SCHEMA.md               # Mongoose schemas details
│   ├── API_ROUTES.md                    # REST endpoint reference
│   ├── FEATURES.md                      # Detailed features explanation
│   └── [10+ other documentation guides]
│
├── CONSISTENCY_IMPLEMENTATION_SUMMARY.md # Summary of system consistency updates
├── PROJECT_SUMMARY.md                  # Executive system summary
├── REALISTIC_TIMING_IMPROVEMENTS.md    # Timing optimization summary
├── SETUP_GUIDE.md                      # Full setup instructions
├── README.md                           # Core workspace README file
└── .gitignore                          # Root ignore patterns
```

---

## 🎯 Key Features by Module

### 🚨 Emergency Response System
**Location:** `frontend/src/components/Emergency*.jsx` + `backend/routes/emergency.js`

**Components:**
- `EmergencyRequest.jsx` - User submits emergency
- `EmergencyDashboard.jsx` - Admin views all emergencies
- `DispatchControl.jsx` - One-click automated dispatch
- `DispatchTracker.jsx` - Real-time tracking map

**Backend:**
- `routes/emergency.js` - Emergency API endpoints
- `services/aiAgent.js` - AI emergency processing
- `services/dispatchService.js` - Automated dispatch logic

**Features:**
- ✅ AI-powered emergency analysis
- ✅ Automated resource allocation
- ✅ Real-time dispatch tracking
- ✅ Live map with routes

---

### 📦 Inventory Management
**Location:** `frontend/src/components/Inventory*.jsx` + `backend/routes/inventory.js`

**Components:**
- `InventoryPage.jsx` - Full inventory dashboard
- `InventoryIntegration.jsx` - Live inventory view

**Backend:**
- `routes/inventory.js` - Inventory CRUD API
- `models/Inventory.js` - Inventory data models

**Features:**
- ✅ Real-time stock tracking
- ✅ Low stock alerts
- ✅ Multi-location management
- ✅ Transaction history

---

### 🗺️ Smart Routing System
**Location:** `frontend/src/components/RoutingVisualization.jsx` + `backend/services/routingService.js`

**Components:**
- `RoutingVisualization.jsx` - Interactive routing UI

**Backend:**
- `services/routingService.js` - OSRM integration
- `services/smartRouting.js` - AI routing agent

**Features:**
- ✅ Real road-following routes
- ✅ Disaster zone avoidance
- ✅ Multi-factor optimization
- ✅ Alternative routes

---

### 🤖 AI Agents System
**Location:** `backend/services/`

**Agents:**
1. **NLP Agent** (`nlpEngine.js`) - Sentiment analysis
2. **Image Agent** (`imageDisasterDetection.js`) - Visual analysis
3. **Routing Agent** (`smartRouting.js`) - Route optimization

**Main Controller:**
- `aiAgent.js` - Orchestrates all 3 agents

**Features:**
- ✅ Natural language processing
- ✅ Disaster type detection
- ✅ Severity classification
- ✅ Resource recommendation

---

## 🚀 Quick Start Guide

### Backend Setup
```bash
cd backend
npm install
# Create .env file with MongoDB URI
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

### Access Points
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **Emergency System:** http://localhost:3000/emergency
- **Dispatch Tracker:** http://localhost:3000/dispatch-tracker
- **Admin Dashboard:** http://localhost:3000/emergency-dashboard

---

## 📊 Data Flow

```
User Submits Emergency
        ↓
AI Agent Analyzes (3 agents)
        ↓
Emergency Saved to DB
        ↓
Admin Views Dashboard
        ↓
Admin Clicks Dispatch
        ↓
Dispatch Service:
  - Checks Inventory
  - Allocates Resources
  - Calculates Routes
  - Updates Inventory
        ↓
Real-Time Tracking Map
        ↓
Status Updates (En Route → Delivered)
```

---

## 🎨 Styling System

**Theme Variables:** `frontend/src/css/style.css`
- Dark mode (default)
- Light mode (toggle)
- CSS variables for consistency

**Component Styles:**
- Each component has its own CSS file
- Follows BEM naming convention
- Responsive design (mobile-first)

---

## 🔧 Configuration Files

### Backend
- `.env` - Environment variables (MongoDB, API keys)
- `package.json` - Dependencies and scripts
- `server.js` - Express server configuration

### Frontend
- `package.json` - React dependencies
- `tailwind.config.js` - Tailwind CSS config
- `src/App.js` - Route configuration

---

## 📝 API Endpoints

### Emergency System
- `POST /api/emergency/request` - Submit emergency
- `GET /api/emergency/active` - Get active emergencies
- `POST /api/emergency/dispatch/:id` - Dispatch resources
- `GET /api/emergency/active-dispatches` - Track dispatches
- `PUT /api/emergency/update-status/:id` - Update status

### Inventory
- `GET /api/inventory/items` - Get all items
- `POST /api/inventory/items` - Add item
- `PUT /api/inventory/items/:id` - Update item
- `DELETE /api/inventory/items/:id` - Delete item

### Routing
- `POST /api/agents/calculate-route` - Calculate route
- `GET /api/agents/disaster-zones` - Get disaster zones

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user

---

## 🎯 Next Steps for Organization

1. ✅ Move documentation to `docs/` folder
2. ✅ Create `backend/config/` for configuration
3. ✅ Organize test files in `backend/tests/`
4. ✅ Group related components in subfolders
5. ✅ Add API documentation (Swagger/OpenAPI)

---

## 📚 Additional Resources

- **AI Agents:** See `AI_AGENTS_DOCUMENTATION.md`
- **System Design:** See `IMPROVED_3_AGENTS_SYSTEM.md`
- **API Docs:** Coming soon
- **Deployment Guide:** Coming soon

---

**Last Updated:** November 2024
**Version:** 1.0.0
**Status:** Production Ready ✅
