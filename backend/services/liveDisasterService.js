import fetch from 'node-fetch';

/**
 * Live Disaster Service
 * Fetches real-time disaster data from external APIs
 * - USGS: Earthquakes
 * - NASA EONET: Natural events (fires, storms, volcanoes, etc.)
 */
class LiveDisasterService {
    constructor() {
        this.cache = {
            earthquakes: { data: [], lastFetch: null },
            eonetEvents: { data: [], lastFetch: null }
        };
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
        this.FETCH_TIMEOUT = 10000; // 10 second timeout
        
        // India bounding box (stricter - India only, not neighboring countries)
        this.INDIA_BOUNDS = {
            minLat: 8.0,    // Southern tip (Kanyakumari)
            maxLat: 35.5,   // Northern border (Kashmir)
            minLon: 68.5,   // Western border (Gujarat)
            maxLon: 97.5    // Eastern border (Arunachal Pradesh)
        };
    }

    // Check if coordinates are within India
    isInIndia(lat, lon) {
        return lat >= this.INDIA_BOUNDS.minLat && 
               lat <= this.INDIA_BOUNDS.maxLat &&
               lon >= this.INDIA_BOUNDS.minLon && 
               lon <= this.INDIA_BOUNDS.maxLon;
    }

    // Helper to fetch with timeout
    async fetchWithTimeout(url, options = {}) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.FETCH_TIMEOUT);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeout);
            return response;
        } catch (error) {
            clearTimeout(timeout);
            if (error.name === 'AbortError') {
                throw new Error('Request timed out');
            }
            throw error;
        }
    }

    /**
     * Fetch earthquakes from USGS API
     * https://earthquake.usgs.gov/fdsnws/event/1/
     */
    async fetchEarthquakes(options = {}) {
        const {
            minMagnitude = 4.0,
            days = 7,
            limit = 100
        } = options;

        // Check cache
        if (this.cache.earthquakes.lastFetch && 
            Date.now() - this.cache.earthquakes.lastFetch < this.CACHE_DURATION) {
            console.log('📦 Returning cached earthquake data');
            return this.cache.earthquakes.data;
        }

        try {
            const endTime = new Date().toISOString();
            const startTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
            
            // Use India bounding box for USGS query
            const { minLat, maxLat, minLon, maxLon } = this.INDIA_BOUNDS;
            const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${startTime}&endtime=${endTime}&minmagnitude=${minMagnitude}&limit=${limit}&orderby=time&minlatitude=${minLat}&maxlatitude=${maxLat}&minlongitude=${minLon}&maxlongitude=${maxLon}`;
            
            console.log('🌍 Fetching earthquakes from USGS...');
            const response = await this.fetchWithTimeout(url);
            
            if (!response.ok) {
                throw new Error(`USGS API error: ${response.status}`);
            }

            const data = await response.json();
            
            const earthquakes = data.features.map(eq => ({
                id: eq.id,
                type: 'earthquake',
                title: eq.properties.title,
                place: eq.properties.place,
                magnitude: eq.properties.mag,
                severity: this.getMagnitudeSeverity(eq.properties.mag),
                location: {
                    lat: eq.geometry.coordinates[1],
                    lon: eq.geometry.coordinates[0],
                    depth: eq.geometry.coordinates[2]
                },
                time: new Date(eq.properties.time),
                updated: new Date(eq.properties.updated),
                url: eq.properties.url,
                tsunami: eq.properties.tsunami === 1,
                felt: eq.properties.felt,
                alert: eq.properties.alert,
                status: eq.properties.status,
                source: 'USGS'
            }));

            // Update cache
            this.cache.earthquakes = { data: earthquakes, lastFetch: Date.now() };
            console.log(`✅ Fetched ${earthquakes.length} earthquakes`);
            
            return earthquakes;
        } catch (error) {
            console.error('❌ Error fetching earthquakes:', error.message);
            return this.cache.earthquakes.data || [];
        }
    }

    /**
     * Fetch natural events from NASA EONET API
     * https://eonet.gsfc.nasa.gov/docs/v3
     */
    async fetchEONETEvents(options = {}) {
        const { days = 30, status = 'open', limit = 50 } = options;

        // Check cache
        if (this.cache.eonetEvents.lastFetch && 
            Date.now() - this.cache.eonetEvents.lastFetch < this.CACHE_DURATION) {
            console.log('📦 Returning cached EONET data');
            return this.cache.eonetEvents.data;
        }

        try {
            const url = `https://eonet.gsfc.nasa.gov/api/v3/events?status=${status}&limit=${limit}&days=${days}`;
            
            console.log('🛰️ Fetching events from NASA EONET...');
            const response = await this.fetchWithTimeout(url);
            
            if (!response.ok) {
                throw new Error(`EONET API error: ${response.status}`);
            }

            const data = await response.json();
            
            const events = data.events
                .map(event => {
                    const latestGeometry = event.geometry[event.geometry.length - 1];
                    const coordinates = latestGeometry?.coordinates || [0, 0];
                    
                    return {
                        id: event.id,
                        type: this.mapEONETCategory(event.categories[0]?.id),
                        title: event.title,
                        description: event.description || event.title,
                        severity: this.getEventSeverity(event),
                        location: {
                            lat: coordinates[1],
                            lon: coordinates[0]
                        },
                        time: new Date(latestGeometry?.date || event.geometry[0]?.date),
                        closed: event.closed,
                        categories: event.categories.map(c => c.title),
                        sources: event.sources.map(s => ({ id: s.id, url: s.url })),
                        source: 'NASA_EONET'
                    };
                })
                // Filter to India region only
                .filter(event => this.isInIndia(event.location.lat, event.location.lon));

            // Update cache
            this.cache.eonetEvents = { data: events, lastFetch: Date.now() };
            console.log(`✅ Fetched ${events.length} EONET events`);
            
            return events;
        } catch (error) {
            console.error('❌ Error fetching EONET events:', error.message);
            return this.cache.eonetEvents.data || [];
        }
    }

    /**
     * Get all live disasters combined
     */
    async getAllLiveDisasters(options = {}) {
        // Fetch both in parallel, but don't fail if one fails
        const results = await Promise.allSettled([
            this.fetchEarthquakes(options),
            this.fetchEONETEvents(options)
        ]);

        const earthquakes = results[0].status === 'fulfilled' ? results[0].value : [];
        const eonetEvents = results[1].status === 'fulfilled' ? results[1].value : [];

        if (results[0].status === 'rejected') {
            console.warn('⚠️ Earthquake fetch failed:', results[0].reason?.message);
        }
        if (results[1].status === 'rejected') {
            console.warn('⚠️ EONET fetch failed:', results[1].reason?.message);
        }

        const allDisasters = [
            ...earthquakes,
            ...eonetEvents
        ].sort((a, b) => new Date(b.time) - new Date(a.time));

        return {
            total: allDisasters.length,
            earthquakes: earthquakes.length,
            naturalEvents: eonetEvents.length,
            disasters: allDisasters,
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Get disasters near a specific location
     */
    async getDisastersNearLocation(lat, lon, radiusKm = 500) {
        const allData = await this.getAllLiveDisasters();
        
        const nearby = allData.disasters.filter(disaster => {
            const distance = this.calculateDistance(
                lat, lon,
                disaster.location.lat, disaster.location.lon
            );
            disaster.distanceKm = Math.round(distance);
            return distance <= radiusKm;
        });

        return {
            total: nearby.length,
            radiusKm,
            center: { lat, lon },
            disasters: nearby.sort((a, b) => a.distanceKm - b.distanceKm)
        };
    }

    // Helper: Map earthquake magnitude to severity
    getMagnitudeSeverity(magnitude) {
        if (magnitude >= 7.0) return 'critical';
        if (magnitude >= 6.0) return 'high';
        if (magnitude >= 5.0) return 'medium';
        return 'low';
    }

    // Helper: Map EONET category to disaster type
    mapEONETCategory(categoryId) {
        const mapping = {
            'wildfires': 'fire',
            'severeStorms': 'storm',
            'volcanoes': 'volcano',
            'floods': 'flood',
            'landslides': 'landslide',
            'seaLakeIce': 'ice',
            'earthquakes': 'earthquake',
            'drought': 'drought',
            'dustHaze': 'dust',
            'tempExtremes': 'extreme_temp',
            'waterColor': 'water_event',
            'manmade': 'manmade'
        };
        return mapping[categoryId] || 'other';
    }

    // Helper: Estimate event severity from EONET data
    getEventSeverity(event) {
        // EONET doesn't provide severity, so we estimate based on category
        const highSeverityCategories = ['volcanoes', 'severeStorms'];
        const criticalCategories = ['earthquakes'];
        
        const categoryId = event.categories[0]?.id;
        
        if (criticalCategories.includes(categoryId)) return 'critical';
        if (highSeverityCategories.includes(categoryId)) return 'high';
        if (event.geometry.length > 5) return 'high'; // Long-running event
        return 'medium';
    }

    // Helper: Calculate distance between two points (Haversine formula)
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    toRad(deg) {
        return deg * (Math.PI / 180);
    }

    // Clear cache (useful for forcing refresh)
    clearCache() {
        this.cache = {
            earthquakes: { data: [], lastFetch: null },
            eonetEvents: { data: [], lastFetch: null }
        };
        console.log('🗑️ Cache cleared');
    }
}

export default new LiveDisasterService();
