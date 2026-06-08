# Environment Variables Usage Guide

This document shows where each environment variable is used in the AidFlow application.

---

## 🔴 REQUIRED Variables

### `MONGO_URI`
**Purpose:** MongoDB Atlas connection string  
**Used in:**
- `backend/config/db.js` (line 12, 18) - Database connection
- `backend/db.js` (line 12, 18) - Database connection (duplicate)
- `backend/tests/test.js` (line 11) - Test database connection
- `backend/tests/testearthquakes.js` (line 8) - Test database connection
- `agents/disaster_agent.py` (line 9) - Python agent database connection

**Format:**
```
mongodb+srv://username:password@cluster-name.xxxxx.mongodb.net/database-name?retryWrites=true&w=majority
```

**Critical:** Application will exit if not defined!

---

### `JWT_SECRET`
**Purpose:** Secret key for JWT token generation and verification  
**Used in:**
- `backend/utils/tokenGenerator.js` (line 16, 22) - Token generation
- `backend/middleware/auth.js` (line 13) - Token verification

**Critical:** Authentication will fail if not defined!

**Generate a secure key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### `GROQ_API_KEY`
**Purpose:** Groq Cloud API Key for ultra-fast Llama-based decision agent and routing refinements  
**Used in:**
- `backend/services/emergencyDecisionAgent.js` (line 15) - Autonomous emergency dispatch reasoning
- `backend/services/realisticTimingService.js` (line 13) - AI-powered ETA refinement
- **Get from:** https://console.groq.com/keys

---

### `GROQ_MODEL`
**Purpose:** Model identifier for Groq reasoning tasks  
**Used in:**
- `backend/services/emergencyDecisionAgent.js` (line 16) - LLM Model designation (default: `llama-3.1-70b-versatile`)
- `backend/services/realisticTimingService.js` (line 386) - LLM Model designation (default: `llama-3.1-8b-instant`)

---

## 🟡 Optional Variables

### `PORT`
**Purpose:** Server port number  
**Used in:**
- `backend/server.js` (line 32) - Server startup
- **Default:** `5000`

---

### `NODE_ENV`
**Purpose:** Environment mode (development/production)  
**Used in:**
- `backend/server.js` (line 378) - Frontend serving logic
- `backend/routes/agents.js` (line 474) - Error stack trace display
- **Default:** `development`

---

### `JWT_EXPIRES_IN`
**Purpose:** JWT token expiration time  
**Used in:**
- `backend/utils/tokenGenerator.js` (line 23) - Token expiration
- **Default:** `30d` (30 days)

---

## 🔵 External API Keys

### `OPENWEATHER_API_KEY`
**Purpose:** OpenWeatherMap API for weather data  
**Used in:**
- `backend/services/aiAgent.js` (line 110) - Weather intelligence gathering
- **Fallback:** Uses `'demo'` if not set
- **Get from:** https://openweathermap.org/api

---

### `FIRMS_API_KEY`
**Purpose:** NASA FIRMS API for fire detection  
**Used in:**
- `backend/services/aiAgent.js` (line 117) - Fire data from NASA satellites
- `backend/services/imageDisasterDetection.js` (line 16) - Fire detection service
- **Fallback:** Uses `'demo'` if not set
- **Get from:** https://firms.modaps.eosdis.nasa.gov/api/

---

### `GOOGLE_MAPS_API_KEY`
**Purpose:** Google Maps API for real-time traffic data  
**Used in:**
- `backend/services/trafficService.js` (line 9) - Real-time traffic calculations
- **Fallback:** Uses time-based estimation if not set
- **Get from:** https://console.cloud.google.com/

---

### `HUGGINGFACE_API_KEY`
**Purpose:** Hugging Face API key for transformer-based NLP extraction (RoBERTa sentiment/emotion, BERT NER)  
**Used in:**
- `backend/services/nlpEngine.js` (line 17) - Sentiment analysis, emotion detection, NER
- **Fallback:** If not set, the system falls back to a deterministic, offline rule-based extraction system (using local dictionary lookups and keyword/phrase matching).
- **Get from:** https://huggingface.co/settings/tokens

---

### `GRAPHHOPPER_API_KEY`
**Purpose:** GraphHopper API for routing optimization  
**Used in:**
- `backend/services/smartRouting.js` (line 14) - Alternative routing service
- **Fallback:** `null` if not set
- **Get from:** https://www.graphhopper.com/

---

### `TOMTOM_API_KEY`
**Purpose:** TomTom API for routing (alternative)  
**Used in:**
- Referenced in documentation but not directly in code
- **Get from:** https://developer.tomtom.com/

---

### `HERE_API_KEY`
**Purpose:** HERE API for routing (alternative)  
**Used in:**
- Referenced in documentation but not directly in code
- **Get from:** https://developer.here.com/

---

### `EFFICIENTNET_API_URL`
**Purpose:** EfficientNet model endpoint for image disaster detection  
**Used in:**
- `backend/services/imageDisasterDetection.js` (line 22) - Image classification endpoint
- **Fallback:** `null` if not set

---

### `ROUTING_MODEL_URL`
**Purpose:** Custom routing model API endpoint  
**Used in:**
- `backend/services/routingService.js` (line 16) - Python routing model endpoint
- **Fallback:** `null` if not set

---

## 📋 Summary by File

### `backend/config/db.js` & `backend/db.js`
- `MONGO_URI` (required)

### `backend/server.js`
- `PORT` (optional, default: 5000)
- `NODE_ENV` (optional, default: development)

### `backend/utils/tokenGenerator.js`
- `JWT_SECRET` (required)
- `JWT_EXPIRES_IN` (optional, default: 30d)

### `backend/middleware/auth.js`
- `JWT_SECRET` (required)

### `backend/services/aiAgent.js`
- `OPENWEATHER_API_KEY` (optional)
- `FIRMS_API_KEY` (optional)

### `backend/services/trafficService.js`
- `GOOGLE_MAPS_API_KEY` (optional)

### `backend/services/nlpEngine.js`
- `HUGGINGFACE_API_KEY` (optional)

### `backend/services/smartRouting.js`
- `GRAPHHOPPER_API_KEY` (optional)

### `backend/services/imageDisasterDetection.js`
- `FIRMS_API_KEY` (optional)
- `EFFICIENTNET_API_URL` (optional)

### `backend/services/routingService.js`
- `ROUTING_MODEL_URL` (optional)

### `backend/routes/agents.js`
- `NODE_ENV` (optional, for error stack traces)

### `agents/disaster_agent.py`
- `MONGO_URI` (required for Python agent)

---

## 🚀 Quick Setup

1. Copy `backend/env.template` to `backend/.env`
2. Fill in **REQUIRED** variables:
   - `MONGO_URI` - Your MongoDB Atlas connection string
   - `JWT_SECRET` - Generate a secure random string
3. Optionally add API keys for enhanced features
4. Never commit `.env` to version control!

---

## 🔍 Finding Your MongoDB Atlas Connection String

1. Go to https://cloud.mongodb.com/
2. Log in to your account
3. Select your cluster
4. Click "Connect"
5. Choose "Connect your application"
6. Copy the connection string
7. Replace `<password>` with your actual password
8. Replace `<database>` with your database name (e.g., `aidflow`)

Example:
```
mongodb+srv://myuser:mypassword@cluster0.abc123.mongodb.net/aidflow?retryWrites=true&w=majority
```

