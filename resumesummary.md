# AidFlow – AI-Assisted Disaster Response System

**Stack:** MERN (MongoDB, Express, React, Node.js) · Python · Groq LLM · HuggingFace Transformers · EfficientNet B3 · Leaflet.js · OSRM  
**Timeline:** Aug 2025 – Dec 2025

---

## Resume Bullet Points (polished)

> **Copy-paste ready** — consistent, quantified, and technically accurate:

- Developed a full-stack AI-driven disaster response platform (MERN) with real-time emergency triage, resource routing, and multi-modal disaster detection across a role-based user system (admin, branch manager, volunteer, refugee).
- Architected a 3-agent agentic AI pipeline: **Agent 1** (NLP urgency/sentiment classification via HuggingFace Transformers — `twitter-roberta`, `distilroberta`, BERT-NER), **Agent 2** (image-based scene classification using EfficientNet B3 + NASA FIRMS/EONET satellite corroboration), and **Agent 3** (smart routing with OSRM, disaster-zone avoidance, and live weather/traffic factors).
- Built RESTful API backend in Node.js/Express (ES Modules) with JWT-based RBAC, Mongoose ODM, and `node-cron` scheduled jobs; connected to MongoDB Atlas with 9 data models spanning emergencies, inventory, dispatch, routing, and agent outputs.
- Implemented NLP text classification engine pipeline — sentiment analysis, emotion detection, named-entity recognition, urgency scoring, and linguistic feature extraction — with graceful fallback to rule-based patterns when HuggingFace API is unavailable.
- Deployed CNN inference pipeline for disaster scene understanding (fire, flood, earthquake damage, landslide, storm, building collapse) using EfficientNet B3 with a Python subprocess bridge for local inference, NASA FIRMS fire data enrichment, and severity thresholding.
- Enabled intelligent multi-modal resource routing: auto-selects dispatch resources based on NLP urgency score + CNN disaster type, geocodes locations via OSM Nominatim, calculates OSRM road-network routes, and adjusts ETA for traffic/weather/disaster-zone intersections.
- Built 34-component React 19 frontend with React Router v7 (protected role-gated routes), Recharts analytics dashboards, Leaflet/react-leaflet disaster maps, Framer Motion animations, and Axios API integration.
- Integrated real-time live disaster feeds: USGS earthquake API (India bounding-box filtered, ≥M4.0), NASA EONET natural events API, with 5-minute server-side caching and fallback handling.
- Seeded system with production-grade data scripts (`seed.js`, `seedAll.js`) and implemented a Python agent (`disaster_agent.py`) for periodic ingestion of USGS + NASA FIRMS data into MongoDB (hourly polling loop).

---

## Full Tech Stack

### Backend

| Layer | Technology |
|---|---|
| Runtime | Node.js ≥18 (ES Modules) |
| Framework | Express 5 |
| Database | MongoDB Atlas + Mongoose 8 |
| Auth | JWT (`jsonwebtoken`) + bcryptjs, RBAC middleware |
| AI / LLM | Groq SDK (`groq-sdk`) — LLM orchestration |
| NLP Models | HuggingFace Inference API — twitter-roberta (sentiment), distilroberta (emotion), BERT-NER (entities) |
| CV Model | EfficientNet B3 (Python, PyTorch) via subprocess + REST fallback |
| Routing | OSRM (Open Source Routing Machine) + OSM Nominatim geocoding |
| External APIs | NASA FIRMS (fire), NASA EONET (natural events), USGS (earthquakes), OpenWeatherMap |
| Scheduling | `node-cron` for periodic tasks |
| Python Agent | `disaster_agent.py` (pymongo, requests) — hourly USGS + FIRMS ingestion |

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 19, Create React App |
| Routing | React Router DOM v7 |
| Maps | Leaflet 1.9 + react-leaflet 5 |
| Charts | Recharts 3 |
| HTTP | Axios |
| Icons | FontAwesome, Lucide React |
| Animation | Framer Motion 12 |
| Auth | jwt-decode, UserContext (React Context API) |
| Styling | Vanilla CSS (modular per component) + Tailwind (config present) |

### Data Models (MongoDB / Mongoose)

| Model | Purpose |
|---|---|
| `User` | RBAC user accounts (admin, branch manager, volunteer, refugee) |
| `Emergency` | Emergency request records with NLP + AI analysis results |
| `AgentOutput` | Stored outputs from the 3-agent AI pipeline |
| `Inventory` + `InventoryItem` | Relief supply tracking across locations |
| `Donation` / `Request` | Volunteer donations and refugee resource requests |
| `DisasterZone` | Active disaster zones used by routing for avoidance |
| `RoutingHistory` | Persisted optimal route calculations with factors |
| `SeverityLog` | Time-series severity tracking per event |
| `Disaster` | Live disaster events fetched and stored from external APIs |

---

## System Architecture & Data Flow

```
User (Browser)
    │
    ├── [Public] Home Page
    │       └─ Disaster prediction map (CNN output CSV → /api/disaster-predictions)
    │
    ├── [Auth] Login / Register (/api/login, /api/register)
    │
    └── [Protected by JWT + Role]
            │
            ├── Emergency Request Form (/emergency)
            │       └─ POST /api/emergency/request
            │               │
            │               ▼
            │         EmergencyAIAgent (aiAgent.js)
            │               ├── Agent 1: NLPEngine (nlpEngine.js)
            │               │     └─ Sentiment + Emotion + NER + Urgency Score
            │               ├── Agent 2: ImageDisasterDetectionAgent (imageDisasterDetection.js)
            │               │     └─ EfficientNet B3 + NASA FIRMS/EONET corroboration
            │               └── Agent 3: SmartRoutingAgent (smartRouting.js)
            │                     └─ Resource selection + OSRM route + ETA
            │
            ├── Emergency Dashboard (/emergency-dashboard) [Admin/Manager]
            ├── Dispatch Tracker (/dispatch-tracker)        [Admin/Manager]
            ├── Routing Visualization (/routing)             [Admin/Manager]
            ├── Inventory Management (/inventory)            [Admin/Volunteer]
            ├── Live Disasters Map (/live-disasters)         [Admin/Manager/Volunteer]
            │       └─ USGS earthquakes + NASA EONET events (India-filtered)
            ├── Image Reporting (/image-report)              [All authenticated]
            │       └─ Upload → Agent 2 CNN pipeline
            ├── Volunteer Dashboard (/volunteer)             [Volunteer]
            ├── Refugee Dashboard (/refugee)                 [Refugee]
            └── Analytics (/analytics)                      [Admin/Manager]
```

---

## API Routes Summary

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/register` | POST | Public | User registration (volunteer/refugee only) |
| `/api/login` | POST | Public | JWT login |
| `/api/disaster-predictions` | GET | Public | CNN prediction CSV served as JSON |
| `/api/emergency/public-request` | POST | Public | Basic emergency intake (no AI) |
| `/api/emergency/*` | ALL | JWT | Full AI-powered emergency pipeline |
| `/api/agents/*` | ALL | JWT | Agent output CRUD |
| `/api/inventory/*` | ALL | JWT | Inventory management |
| `/api/disasters/*` | ALL | JWT | Live disaster feeds (USGS + EONET) |
| `/api/data/*` | ALL | JWT | Data management utilities |
| `/api/volunteer/donate` | POST | Volunteer/Admin | Submit donation |
| `/api/admin/requests` | GET | Admin/Manager | View all resource requests |

---

## Key Features

1. **Agentic Decision Pipeline** — Three specialized AI agents run in sequence for each emergency: NLP urgency triage → CNN scene classification → smart routing.
2. **Multi-modal Input** — Text messages (NLP), uploaded images (EfficientNet B3 CNN), geolocation (lat/lon), and real satellite/sensor data (NASA FIRMS, USGS) all feed into the decision engine.
3. **Role-Based Access Control (RBAC)** — JWT + middleware-enforced roles; each frontend route and API endpoint restricts access by role.
4. **Live Disaster Feed** — Real-time USGS earthquake data (India-filtered, magnitude ≥4.0) and NASA EONET natural events with server-side 5-minute caching.
5. **Intelligent Routing** — OSRM road-network routing with real weather impact (OpenWeatherMap), time-of-day traffic estimation, and disaster-zone intersection detection for ETA adjustment.
6. **Inventory & Dispatch** — Full donation/request lifecycle: volunteer donates → admin approves → inventory updated → dispatch triggered → refugee confirmed fulfilled.
7. **Image-Based Scene Understanding** — EfficientNet B3 classifies satellite/drone imagery into 7 disaster types (fire, flood, earthquake damage, landslide, storm damage, building collapse, normal); cross-validated with NASA satellite data.
8. **NLP Text Analysis** — Parallel HuggingFace API calls for sentiment, emotion, and NER with urgency scoring, linguistic feature extraction (caps ratio, exclamation count, repeated words), and keyword-phrase rule-based fallback.
