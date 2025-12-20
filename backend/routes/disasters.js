import express from 'express';
import DisasterZone from '../models/DisasterZone.js';
import Emergency from '../models/Emergency.js';
import liveDisasterService from '../services/liveDisasterService.js';

const router = express.Router();

console.log('📡 Disasters routes initializing...');

// ============================================
// TEST ROUTE
// ============================================
router.get('/test', (req, res) => {
    console.log('🧪 Test route hit');
    res.json({ message: 'Disasters route working!', timestamp: new Date() });
});

// ============================================
// LIVE DISASTER FEEDS (External APIs)
// ============================================

/**
 * GET /api/disasters/live
 * Get all live disasters from external sources (USGS + NASA EONET)
 */
router.get('/live', async (req, res) => {
    console.log('🔍 /live endpoint hit');
    try {
        const { minMagnitude, days } = req.query;
        const options = {
            minMagnitude: parseFloat(minMagnitude) || 2.5,  // Lower for India
            days: parseInt(days) || 30  // Longer range for India
        };
        
        const liveData = await liveDisasterService.getAllLiveDisasters(options);
        
        res.json({
            success: true,
            ...liveData
        });
    } catch (error) {
        console.error('Error fetching live disasters:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/disasters/live/earthquakes
 * Get live earthquakes from USGS
 */
router.get('/live/earthquakes', async (req, res) => {
    try {
        const { minMagnitude, days, limit } = req.query;
        const options = {
            minMagnitude: parseFloat(minMagnitude) || 4.0,
            days: parseInt(days) || 7,
            limit: parseInt(limit) || 100
        };
        
        const earthquakes = await liveDisasterService.fetchEarthquakes(options);
        
        res.json({
            success: true,
            count: earthquakes.length,
            source: 'USGS',
            earthquakes
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/disasters/live/events
 * Get live natural events from NASA EONET
 */
router.get('/live/events', async (req, res) => {
    try {
        const { days, status, limit } = req.query;
        const options = {
            days: parseInt(days) || 30,
            status: status || 'open',
            limit: parseInt(limit) || 50
        };
        
        const events = await liveDisasterService.fetchEONETEvents(options);
        
        res.json({
            success: true,
            count: events.length,
            source: 'NASA_EONET',
            events
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/disasters/live/import/:id
 * Import a live disaster into the local disaster zones
 */
router.post('/live/import/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { disaster } = req.body;
        
        if (!disaster) {
            return res.status(400).json({ error: 'Disaster data is required' });
        }
        
        const existing = await DisasterZone.findOne({ 'metadata.externalId': id });
        if (existing) {
            return res.status(400).json({ 
                error: 'This disaster has already been imported',
                existingZoneId: existing.zoneId
            });
        }
        
        // Map disaster type to valid enum values
        const typeMapping = {
            'volcano': 'fire',
            'ice': 'flood',
            'dust': 'storm',
            'extreme_temp': 'storm',
            'water_event': 'flood',
            'other': 'multiple'
        };
        const validTypes = ['fire', 'flood', 'earthquake', 'landslide', 'storm', 'cyclone', 'tsunami', 'multiple'];
        const mappedType = typeMapping[disaster.type] || (validTypes.includes(disaster.type) ? disaster.type : 'multiple');
        
        const zone = new DisasterZone({
            zoneId: `ZONE_${Date.now()}`,
            name: disaster.title || disaster.place || `${disaster.type} Event`,
            disasterType: mappedType,
            severity: disaster.severity || 'medium',
            status: 'active',
            location: {
                center: {
                    lat: disaster.location.lat,
                    lon: disaster.location.lon
                },
                radius: disaster.type === 'earthquake' ? 
                    Math.max(10, disaster.magnitude * 10) : 50,
                affectedArea: 0
            },
            affectedPopulation: { estimated: 0 },
            detectedBy: {
                agents: ['live_feed'],
                sources: [disaster.source],
                firstDetected: new Date(disaster.time),
                lastUpdated: new Date()
            },
            alerts: [{
                level: disaster.severity === 'critical' ? 'critical' : 
                       disaster.severity === 'high' ? 'danger' : 'warning',
                message: `Imported from ${disaster.source}: ${disaster.title}`,
                timestamp: new Date()
            }],
            metadata: {
                externalId: id,
                source: disaster.source,
                originalData: disaster,
                magnitude: disaster.magnitude,
                importedAt: new Date()
            }
        });
        
        await zone.save();
        
        res.status(201).json({
            success: true,
            message: 'Live disaster imported successfully',
            zone
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// DISASTER ZONES CRUD
// ============================================

router.get('/zones', async (req, res) => {
    try {
        const { status, type, severity } = req.query;
        const query = {};
        
        if (status) query.status = status;
        if (type) query.type = type;
        if (severity) query.severity = severity;

        const zones = await DisasterZone.find(query).sort({ createdAt: -1 });
        
        res.json({
            success: true,
            count: zones.length,
            zones
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/zones', async (req, res) => {
    try {
        const { name, type, severity, location, radius, description, affectedPopulation, estimatedDamage, weatherConditions, createdBy } = req.body;

        const zone = new DisasterZone({
            zoneId: `ZONE_${Date.now()}`,
            name,
            disasterType: type,
            severity,
            location: {
                center: { lat: location.lat, lon: location.lon },
                radius: (radius || 1000) / 1000,
                affectedArea: Math.PI * Math.pow((radius || 1000) / 1000, 2)
            },
            affectedPopulation: { estimated: affectedPopulation || 0 },
            status: 'active',
            detectedBy: {
                agents: ['admin_system'],
                sources: ['manual_entry'],
                firstDetected: new Date(),
                lastUpdated: new Date()
            },
            alerts: [{
                level: severity === 'critical' ? 'critical' : severity === 'high' ? 'danger' : 'warning',
                message: description || `${type} disaster zone created`,
                timestamp: new Date()
            }],
            metadata: { description, estimatedDamage, weatherConditions, createdBy: createdBy || 'admin', address: location.address }
        });

        await zone.save();
        res.status(201).json({ success: true, message: 'Disaster zone created successfully', zone });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/zones/:zoneId', async (req, res) => {
    try {
        const { zoneId } = req.params;
        const { resolvedBy, resolutionNotes } = req.body;

        const zone = await DisasterZone.findOne({ zoneId });
        if (!zone) {
            return res.status(404).json({ error: 'Disaster zone not found' });
        }

        zone.status = 'resolved';
        zone.detectedBy.lastUpdated = new Date();
        if (!zone.metadata) zone.metadata = {};
        zone.metadata.resolvedAt = new Date();
        zone.metadata.resolvedBy = resolvedBy || 'admin';
        zone.metadata.resolutionNotes = resolutionNotes || 'Disaster zone resolved';
        
        zone.alerts.push({
            level: 'info',
            message: resolutionNotes || 'Disaster zone marked as resolved',
            timestamp: new Date()
        });

        await zone.save();
        res.json({ success: true, message: 'Disaster zone resolved successfully', zone });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// DISASTER ANALYTICS
// ============================================

router.get('/analytics', async (req, res) => {
    try {
        const totalZones = await DisasterZone.countDocuments();
        const activeZones = await DisasterZone.countDocuments({ status: 'active' });
        const resolvedZones = await DisasterZone.countDocuments({ status: 'resolved' });

        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentZones = await DisasterZone.countDocuments({ createdAt: { $gte: weekAgo } });

        const populationStats = await DisasterZone.aggregate([
            { $group: { _id: null, total: { $sum: '$affectedPopulation.estimated' } } }
        ]);

        res.json({
            success: true,
            analytics: {
                totalZones,
                activeZones,
                resolvedZones,
                recentZones,
                totalAffectedPopulation: populationStats[0]?.total || 0
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

console.log('✅ Disasters routes initialized');

export default router;
