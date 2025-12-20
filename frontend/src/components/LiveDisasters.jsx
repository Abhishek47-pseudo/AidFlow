import React, { useState, useEffect, useContext } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import {
    AlertTriangle,
    MapPin,
    Clock,
    Users,
    Plus,
    Zap,
    CheckCircle,
    Activity,
    Package,
    TrendingUp,
    Navigation,
    Globe,
    Radio,
    Download,
    RefreshCw,
    Filter,
    Flame,
    CloudLightning,
    Mountain
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from './UserContext';
import { createAuthenticatedAxios } from '../utils/api';
import 'leaflet/dist/leaflet.css';
import '../css/LiveDisasters.css';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle map center changes
const MapCenterHandler = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
};

/**
 * Live Disasters Dashboard
 * Real-time disaster monitoring integrated with Emergency & Dispatch systems
 * Now with LIVE feeds from USGS Earthquakes and NASA EONET
 */
const LiveDisasters = () => {
    const navigate = useNavigate();
    const { token } = useContext(UserContext);
    const [disasters, setDisasters] = useState([]);
    const [selectedDisaster, setSelectedDisaster] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [inventoryImpact, setInventoryImpact] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [mapCenter, setMapCenter] = useState([22.5, 82.5]); // India center
    const [mapZoom, setMapZoom] = useState(2);

    // Live feed state
    const [activeTab, setActiveTab] = useState('live'); // 'live' or 'local'
    const [liveDisasters, setLiveDisasters] = useState([]);
    const [liveLoading, setLiveLoading] = useState(false);
    const [liveStats, setLiveStats] = useState({ earthquakes: 0, naturalEvents: 0, total: 0 });
    const [selectedLiveDisaster, setSelectedLiveDisaster] = useState(null);
    const [liveFilters, setLiveFilters] = useState({
        minMagnitude: 2.5,  // Lower threshold for India region
        days: 30,           // Longer time range
        types: ['earthquake', 'fire', 'storm', 'volcano', 'flood'],
        indiaOnly: true     // Filter to India only
    });
    const [lastUpdated, setLastUpdated] = useState(null);

    const [newDisaster, setNewDisaster] = useState({
        name: '',
        type: 'flood',
        severity: 'medium',
        location: { lat: 30.7171, lon: 76.8537, address: '' },
        radius: 1000,
        description: '',
        affectedPopulation: 0,
        estimatedDamage: 'unknown'
    });

    useEffect(() => {
        if (token) {
            fetchDisasters();
            fetchAnalytics();
            fetchInventoryImpact();

            // Refresh every 30 seconds
            const interval = setInterval(() => {
                fetchDisasters();
                fetchAnalytics();
                fetchInventoryImpact();
            }, 30000);

            return () => clearInterval(interval);
        }
    }, [token]);

    // Fetch live disasters when filters change
    useEffect(() => {
        if (activeTab === 'live') {
            fetchLiveDisasters();
        }
    }, [liveFilters, activeTab]);

    const fetchLiveDisasters = async () => {
        setLiveLoading(true);
        try {
            const response = await axios.get('http://localhost:5000/api/disasters/live', {
                params: {
                    minMagnitude: liveFilters.minMagnitude,
                    days: liveFilters.days
                }
            });

            if (response.data.success) {
                // Filter by selected types and optionally by India
                let filtered = response.data.disasters.filter(d =>
                    liveFilters.types.includes(d.type)
                );

                // Apply India-only filter if enabled
                if (liveFilters.indiaOnly) {
                    filtered = filtered.filter(d => {
                        const place = (d.place || d.title || '').toLowerCase();
                        return place.includes('india') ||
                            place.includes('delhi') ||
                            place.includes('mumbai') ||
                            place.includes('chennai') ||
                            place.includes('kolkata') ||
                            place.includes('bangalore') ||
                            place.includes('hyderabad') ||
                            place.includes('kashmir') ||
                            place.includes('gujarat') ||
                            place.includes('rajasthan') ||
                            place.includes('punjab') ||
                            place.includes('uttarakhand') ||
                            place.includes('himachal') ||
                            place.includes('assam') ||
                            place.includes('bihar') ||
                            place.includes('odisha') ||
                            place.includes('andaman');
                    });
                }

                setLiveDisasters(filtered);
                setLiveStats({
                    earthquakes: liveFilters.indiaOnly ? filtered.filter(d => d.type === 'earthquake').length : response.data.earthquakes,
                    naturalEvents: liveFilters.indiaOnly ? filtered.filter(d => d.type !== 'earthquake').length : response.data.naturalEvents,
                    total: filtered.length
                });
                setLastUpdated(new Date(response.data.lastUpdated));
            }
        } catch (error) {
            console.error('Failed to fetch live disasters:', error);
        } finally {
            setLiveLoading(false);
        }
    };

    const importLiveDisaster = async (disaster) => {
        try {
            const response = await axios.post(`http://localhost:5000/api/disasters/live/import/${disaster.id}`, {
                disaster
            });

            if (response.data.success) {
                alert(`✅ Imported: ${disaster.title}\nZone ID: ${response.data.zone.zoneId}`);
                fetchDisasters();
                fetchAnalytics();
            }
        } catch (error) {
            if (error.response?.data?.error?.includes('already been imported')) {
                alert('⚠️ This disaster has already been imported to local zones.');
            } else {
                console.error('Failed to import disaster:', error);
                alert('Failed to import disaster: ' + (error.response?.data?.error || error.message));
            }
        }
    };

    const createEmergencyFromLive = async (disaster) => {
        try {
            const response = await axios.post('http://localhost:5000/api/emergency/request', {
                lat: disaster.location.lat,
                lon: disaster.location.lon,
                message: `LIVE ALERT: ${disaster.title}. ${disaster.type.toUpperCase()} detected. Severity: ${disaster.severity}. Source: ${disaster.source}`,
                userId: 'live_disaster_system',
                address: disaster.place || disaster.title
            });

            if (response.data.success) {
                alert(`🚨 Emergency ${response.data.emergencyId} created from live disaster!\nRedirecting to Emergency Dashboard...`);
                navigate('/emergency-dashboard');
            }
        } catch (error) {
            console.error('Failed to create emergency:', error);
            alert('Failed to create emergency: ' + (error.response?.data?.error || error.message));
        }
    };

    const fetchDisasters = async () => {
        try {
            const api = createAuthenticatedAxios(token);
            const response = await api.get('/api/disasters/zones');
            setDisasters(response.data.zones || []);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch disasters:', error);
            setLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const api = createAuthenticatedAxios(token);
            const response = await api.get('/api/disasters/analytics');
            setAnalytics(response.data.analytics);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        }
    };

    const fetchInventoryImpact = async () => {
        try {
            const api = createAuthenticatedAxios(token);
            const response = await api.get('/api/inventory/items');
            setInventoryImpact(response.data || []);
        } catch (error) {
            console.error('Failed to fetch inventory:', error);
        }
    };

    const createDisaster = async () => {
        try {
            const api = createAuthenticatedAxios(token);
            await api.post('/api/disasters/zones', {
                ...newDisaster,
                createdBy: 'admin'
            });
            setShowCreateModal(false);
            setNewDisaster({
                name: '',
                type: 'flood',
                severity: 'medium',
                location: { lat: 30.7171, lon: 76.8537, address: '' },
                radius: 1000,
                description: '',
                affectedPopulation: 0,
                estimatedDamage: 'unknown'
            });
            fetchDisasters();
            fetchAnalytics();
        } catch (error) {
            console.error('Failed to create disaster:', error);
            alert('Failed to create disaster zone');
        }
    };

    const createEmergencyFromDisaster = async (disaster) => {
        try {
            const lat = getDisasterProp(disaster, 'lat');
            const lon = getDisasterProp(disaster, 'lon');
            const type = getDisasterProp(disaster, 'type');
            const description = getDisasterProp(disaster, 'description');
            const address = getDisasterProp(disaster, 'address');

            // Create emergency request from disaster zone
            const api = createAuthenticatedAxios(token);
            const response = await api.post('/api/emergency/request', {
                lat,
                lon,
                message: `Emergency in ${disaster.name} disaster zone. ${type} disaster with ${disaster.severity} severity. ${description}`,
                userId: 'disaster_system',
                address: address || disaster.name
            });

            if (response.data.success) {
                alert(`Emergency ${response.data.emergencyId} created! Redirecting to Emergency Dashboard...`);
                navigate('/emergency-dashboard');
            }
        } catch (error) {
            console.error('Failed to create emergency:', error);
            alert('Failed to create emergency from disaster zone');
        }
    };

    const resolveDisaster = async (zoneId) => {
        if (!window.confirm('Mark this disaster zone as resolved?')) return;

        try {
            const api = createAuthenticatedAxios(token);
            await api.delete(`/api/disasters/zones/${zoneId}`, {
                data: {
                    resolvedBy: 'admin',
                    resolutionNotes: 'Disaster situation resolved'
                }
            });
            fetchDisasters();
            fetchAnalytics();
            setSelectedDisaster(null);
        } catch (error) {
            console.error('Failed to resolve disaster:', error);
            alert('Failed to resolve disaster');
        }
    };

    const getSeverityColor = (severity) => {
        const colors = {
            'critical': '#DC2626',
            'high': '#EA580C',
            'medium': '#D97706',
            'low': '#65A30D'
        };
        return colors[severity] || '#6B7280';
    };

    const getTypeIcon = (type) => {
        const icons = {
            flood: '🌊',
            fire: '🔥',
            earthquake: '🌍',
            storm: '⛈️',
            landslide: '🏔️',
            drought: '🏜️',
            cyclone: '🌀',
            volcano: '🌋',
            ice: '🧊',
            dust: '💨',
            extreme_temp: '🌡️',
            water_event: '💧',
            other: '⚠️'
        };
        return icons[type] || '⚠️';
    };

    const getTimeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    const getMagnitudeColor = (magnitude) => {
        if (magnitude >= 7.0) return '#DC2626';
        if (magnitude >= 6.0) return '#EA580C';
        if (magnitude >= 5.0) return '#D97706';
        return '#65A30D';
    };

    const getResourcesForDisasterType = (type) => {
        const resourceMap = {
            flood: ['Water Pumps', 'Boats', 'Life Jackets', 'Medical Kit'],
            fire: ['Fire Extinguishers', 'Water Tanks', 'Protective Gear'],
            earthquake: ['Search Equipment', 'Medical Kit', 'Shelter', 'Food'],
            storm: ['Shelter Materials', 'Medical Kit', 'Food', 'Water'],
            landslide: ['Search Equipment', 'Medical Kit', 'Heavy Machinery'],
            drought: ['Water Tanks', 'Food', 'Medical Kit'],
            cyclone: ['Shelter Materials', 'Medical Kit', 'Communication Equipment']
        };
        return resourceMap[type.toLowerCase()] || ['Medical Kit', 'Food', 'Water'];
    };

    const getInventoryStatus = (resourceName) => {
        const item = inventoryImpact.find(i =>
            i.name.toLowerCase().includes(resourceName.toLowerCase()) ||
            resourceName.toLowerCase().includes(i.name.toLowerCase())
        );

        if (!item) return { status: 'unknown', stock: 0 };
        return { status: item.status, stock: item.currentStock, unit: item.unit };
    };

    if (loading) {
        return (
            <div className="disasters-loading">
                <div className="spinner-large" />
                <p>Loading disaster data...</p>
            </div>
        );
    }

    const activeDisasters = disasters.filter(d => d.status === 'active');

    // Helper to get disaster properties from the model
    const getDisasterProp = (disaster, prop) => {
        switch (prop) {
            case 'type':
                return disaster.disasterType || disaster.type;
            case 'lat':
                return disaster.location?.center?.lat || disaster.location?.lat;
            case 'lon':
                return disaster.location?.center?.lon || disaster.location?.lon;
            case 'address':
                return disaster.metadata?.address || disaster.location?.address;
            case 'affectedPopulation':
                return disaster.affectedPopulation?.estimated || disaster.affectedPopulation || 0;
            case 'radius':
                return (disaster.location?.radius || 1) * 1000; // Convert km to meters
            case 'description':
                return disaster.metadata?.description || disaster.alerts?.[0]?.message || '';
            default:
                return disaster[prop];
        }
    };

    return (
        <div className="live-disasters">
            {/* Header */}
            <div className="disasters-header">
                <div className="header-content">
                    <Activity className="header-icon" />
                    <div>
                        <h2>🌍 Live Disasters Dashboard</h2>
                        <p>Real-time disaster monitoring from USGS & NASA</p>
                    </div>
                </div>
                <div className="header-actions">
                    <button
                        className="nav-btn"
                        onClick={() => navigate('/emergency-dashboard')}
                    >
                        <AlertTriangle size={20} />
                        <span>Emergency Dashboard</span>
                    </button>
                    <button
                        className="nav-btn"
                        onClick={() => navigate('/dispatch-tracker')}
                    >
                        <Navigation size={20} />
                        <span>Dispatch Tracker</span>
                    </button>
                    <button
                        className="create-disaster-btn"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <Plus size={20} />
                        <span>Create Disaster Zone</span>
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="tab-navigation">
                <button
                    className={`tab-btn ${activeTab === 'live' ? 'active' : ''}`}
                    onClick={() => setActiveTab('live')}
                >
                    <Radio size={18} />
                    <span>Live Feed</span>
                    <span className="tab-badge">{liveStats.total}</span>
                </button>
                <button
                    className={`tab-btn ${activeTab === 'local' ? 'active' : ''}`}
                    onClick={() => setActiveTab('local')}
                >
                    <MapPin size={18} />
                    <span>Local Zones</span>
                    <span className="tab-badge">{disasters.filter(d => d.status === 'active').length}</span>
                </button>
                {activeTab === 'live' && (
                    <div className="live-controls">
                        <button
                            className="refresh-btn"
                            onClick={fetchLiveDisasters}
                            disabled={liveLoading}
                        >
                            <RefreshCw size={16} className={liveLoading ? 'spinning' : ''} />
                            Refresh
                        </button>
                        {lastUpdated && (
                            <span className="last-updated">
                                Updated: {getTimeAgo(lastUpdated)}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Live Feed Filters */}
            {activeTab === 'live' && (
                <div className="live-filters">
                    <div className="filter-group">
                        <label><Filter size={14} /> Min Magnitude:</label>
                        <select
                            value={liveFilters.minMagnitude}
                            onChange={(e) => setLiveFilters({ ...liveFilters, minMagnitude: parseFloat(e.target.value) })}
                        >
                            <option value="2.0">2.0+</option>
                            <option value="2.5">2.5+</option>
                            <option value="3.0">3.0+</option>
                            <option value="4.0">4.0+</option>
                            <option value="5.0">5.0+</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Time Range:</label>
                        <select
                            value={liveFilters.days}
                            onChange={(e) => setLiveFilters({ ...liveFilters, days: parseInt(e.target.value) })}
                        >
                            <option value="1">Last 24 hours</option>
                            <option value="7">Last 7 days</option>
                            <option value="14">Last 14 days</option>
                            <option value="30">Last 30 days</option>
                        </select>
                    </div>
                    <div className="filter-group type-filters">
                        <label>Types:</label>
                        <div className="type-checkboxes">
                            {['earthquake', 'fire', 'storm', 'volcano', 'flood'].map(type => (
                                <label key={type} className="type-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={liveFilters.types.includes(type)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setLiveFilters({ ...liveFilters, types: [...liveFilters.types, type] });
                                            } else {
                                                setLiveFilters({ ...liveFilters, types: liveFilters.types.filter(t => t !== type) });
                                            }
                                        }}
                                    />
                                    {getTypeIcon(type)} {type}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="filter-group india-filter">
                        <label className="india-toggle">
                            <input
                                type="checkbox"
                                checked={liveFilters.indiaOnly}
                                onChange={(e) => setLiveFilters({ ...liveFilters, indiaOnly: e.target.checked })}
                            />
                            🇮🇳 India Only
                        </label>
                    </div>
                </div>
            )}

            {/* Analytics Cards */}
            {activeTab === 'live' ? (
                <div className="analytics-grid">
                    <div className="analytics-card critical">
                        <div className="card-icon">
                            <Globe size={24} />
                        </div>
                        <div className="card-content">
                            <h3>{liveStats.total}</h3>
                            <p>Live Events</p>
                        </div>
                    </div>
                    <div className="analytics-card warning">
                        <div className="card-icon">
                            <Mountain size={24} />
                        </div>
                        <div className="card-content">
                            <h3>{liveStats.earthquakes}</h3>
                            <p>Earthquakes</p>
                        </div>
                    </div>
                    <div className="analytics-card info">
                        <div className="card-icon">
                            <Flame size={24} />
                        </div>
                        <div className="card-content">
                            <h3>{liveStats.naturalEvents}</h3>
                            <p>Natural Events</p>
                        </div>
                    </div>
                    <div className="analytics-card success">
                        <div className="card-icon">
                            <Radio size={24} />
                        </div>
                        <div className="card-content">
                            <h3>LIVE</h3>
                            <p>USGS + NASA</p>
                        </div>
                    </div>
                </div>
            ) : analytics && (
                <div className="analytics-grid">
                    <div className="analytics-card critical">
                        <div className="card-icon">
                            <AlertTriangle size={24} />
                        </div>
                        <div className="card-content">
                            <h3>{analytics.activeZones}</h3>
                            <p>Active Zones</p>
                        </div>
                    </div>
                    <div className="analytics-card success">
                        <div className="card-icon">
                            <CheckCircle size={24} />
                        </div>
                        <div className="card-content">
                            <h3>{analytics.resolvedZones}</h3>
                            <p>Resolved Zones</p>
                        </div>
                    </div>
                    <div className="analytics-card info">
                        <div className="card-icon">
                            <Users size={24} />
                        </div>
                        <div className="card-content">
                            <h3>{analytics.totalAffectedPopulation.toLocaleString()}</h3>
                            <p>People Affected</p>
                        </div>
                    </div>
                    <div className="analytics-card warning">
                        <div className="card-icon">
                            <TrendingUp size={24} />
                        </div>
                        <div className="card-content">
                            <h3>{analytics.recentZones}</h3>
                            <p>This Week</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="disasters-content">
                {/* Disasters List */}
                <div className="disasters-list">
                    {activeTab === 'live' ? (
                        <>
                            <h3>
                                <Radio size={18} className="live-indicator" />
                                Live Disasters ({liveDisasters.length})
                            </h3>
                            {liveLoading ? (
                                <div className="no-disasters">
                                    <RefreshCw className="empty-icon spinning" />
                                    <p>Fetching live data...</p>
                                </div>
                            ) : liveDisasters.length === 0 ? (
                                <div className="no-disasters">
                                    <CheckCircle className="empty-icon" />
                                    <p>No disasters matching filters</p>
                                </div>
                            ) : (
                                liveDisasters.map((disaster) => (
                                    <div
                                        key={disaster.id}
                                        className={`disaster-card live-card ${selectedLiveDisaster?.id === disaster.id ? 'selected' : ''}`}
                                        onClick={() => {
                                            setSelectedLiveDisaster(disaster);
                                            setSelectedDisaster(null);
                                            setMapCenter([disaster.location.lat, disaster.location.lon]);
                                        }}
                                    >
                                        <div className="disaster-header">
                                            <div className="disaster-type">
                                                <span className="type-icon">{getTypeIcon(disaster.type)}</span>
                                                <span className="type-name">{disaster.type}</span>
                                            </div>
                                            <div
                                                className="severity-badge"
                                                style={{ backgroundColor: getSeverityColor(disaster.severity) }}
                                            >
                                                {disaster.severity}
                                            </div>
                                        </div>
                                        <h4>{disaster.title}</h4>
                                        {disaster.magnitude && (
                                            <div className="magnitude-display" style={{ color: getMagnitudeColor(disaster.magnitude) }}>
                                                <strong>M{disaster.magnitude.toFixed(1)}</strong>
                                                {disaster.location.depth && <span> • Depth: {disaster.location.depth.toFixed(1)}km</span>}
                                            </div>
                                        )}
                                        <div className="disaster-stats">
                                            <div className="stat">
                                                <MapPin size={16} />
                                                <span>{disaster.place || `${disaster.location.lat.toFixed(2)}, ${disaster.location.lon.toFixed(2)}`}</span>
                                            </div>
                                            <div className="stat">
                                                <Clock size={16} />
                                                <span>{getTimeAgo(disaster.time)}</span>
                                            </div>
                                            <div className="stat source-badge">
                                                <Globe size={14} />
                                                <span>{disaster.source}</span>
                                            </div>
                                        </div>
                                        <div className="disaster-actions">
                                            <button
                                                className="action-btn emergency-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    createEmergencyFromLive(disaster);
                                                }}
                                            >
                                                <Zap size={16} />
                                                Create Emergency
                                            </button>
                                            <button
                                                className="action-btn import-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    importLiveDisaster(disaster);
                                                }}
                                            >
                                                <Download size={16} />
                                                Import
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </>
                    ) : (
                        <>
                            <h3>Active Disaster Zones ({activeDisasters.length})</h3>
                            {activeDisasters.length === 0 ? (
                                <div className="no-disasters">
                                    <CheckCircle className="empty-icon" />
                                    <p>No active disasters</p>
                                </div>
                            ) : (
                                activeDisasters.map((disaster) => {
                                    const type = getDisasterProp(disaster, 'type');
                                    const lat = getDisasterProp(disaster, 'lat');
                                    const lon = getDisasterProp(disaster, 'lon');
                                    const address = getDisasterProp(disaster, 'address');
                                    const affectedPop = getDisasterProp(disaster, 'affectedPopulation');
                                    const description = getDisasterProp(disaster, 'description');

                                    return (
                                        <div
                                            key={disaster.zoneId}
                                            className={`disaster-card ${selectedDisaster?.zoneId === disaster.zoneId ? 'selected' : ''}`}
                                            onClick={() => {
                                                setSelectedDisaster(disaster);
                                                setSelectedLiveDisaster(null);
                                                setMapCenter([lat, lon]);
                                            }}
                                        >
                                            <div className="disaster-header">
                                                <div className="disaster-type">
                                                    <span className="type-icon">{getTypeIcon(type)}</span>
                                                    <span className="type-name">{type}</span>
                                                </div>
                                                <div
                                                    className="severity-badge"
                                                    style={{ backgroundColor: getSeverityColor(disaster.severity) }}
                                                >
                                                    {disaster.severity}
                                                </div>
                                            </div>
                                            <h4>{disaster.name}</h4>
                                            <p className="disaster-description">{description}</p>
                                            <div className="disaster-stats">
                                                <div className="stat">
                                                    <MapPin size={16} />
                                                    <span>{address || 'Location set'}</span>
                                                </div>
                                                <div className="stat">
                                                    <Users size={16} />
                                                    <span>{affectedPop.toLocaleString()} affected</span>
                                                </div>
                                                <div className="stat">
                                                    <Clock size={16} />
                                                    <span>{new Date(disaster.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <div className="disaster-actions">
                                                <button
                                                    className="action-btn emergency-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        createEmergencyFromDisaster(disaster);
                                                    }}
                                                >
                                                    <Zap size={16} />
                                                    Create Emergency
                                                </button>
                                                <button
                                                    className="action-btn resolve-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        resolveDisaster(disaster.zoneId);
                                                    }}
                                                >
                                                    <CheckCircle size={16} />
                                                    Resolve
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </>
                    )}
                </div>

                {/* Map View */}
                <div className="disasters-map">
                    <MapContainer
                        center={mapCenter}
                        zoom={activeTab === 'live' ? 5 : 12}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <MapCenterHandler center={mapCenter} />
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        />

                        {/* Live Disasters Markers */}
                        {activeTab === 'live' && liveDisasters.map((disaster) => (
                            <React.Fragment key={disaster.id}>
                                <Marker
                                    position={[disaster.location.lat, disaster.location.lon]}
                                    eventHandlers={{
                                        click: () => {
                                            setSelectedLiveDisaster(disaster);
                                            setSelectedDisaster(null);
                                        }
                                    }}
                                >
                                    <Popup>
                                        <div className="map-popup">
                                            <strong>{getTypeIcon(disaster.type)} {disaster.title}</strong>
                                            {disaster.magnitude && (
                                                <p style={{ color: getMagnitudeColor(disaster.magnitude), fontWeight: 'bold' }}>
                                                    Magnitude: {disaster.magnitude.toFixed(1)}
                                                </p>
                                            )}
                                            <p>Type: {disaster.type}</p>
                                            <p>Severity: {disaster.severity}</p>
                                            <p>Time: {getTimeAgo(disaster.time)}</p>
                                            <p>Source: {disaster.source}</p>
                                        </div>
                                    </Popup>
                                </Marker>
                                <Circle
                                    center={[disaster.location.lat, disaster.location.lon]}
                                    radius={disaster.type === 'earthquake' ?
                                        Math.max(50000, (disaster.magnitude || 4) * 20000) :
                                        100000}
                                    pathOptions={{
                                        color: getSeverityColor(disaster.severity),
                                        fillColor: getSeverityColor(disaster.severity),
                                        fillOpacity: 0.15,
                                        weight: 1
                                    }}
                                />
                            </React.Fragment>
                        ))}

                        {/* Local Disaster Zones Markers */}
                        {activeTab === 'local' && activeDisasters.map((disaster) => {
                            const lat = getDisasterProp(disaster, 'lat');
                            const lon = getDisasterProp(disaster, 'lon');
                            const type = getDisasterProp(disaster, 'type');
                            const affectedPop = getDisasterProp(disaster, 'affectedPopulation');
                            const radius = getDisasterProp(disaster, 'radius');

                            return (
                                <React.Fragment key={disaster.zoneId}>
                                    <Marker position={[lat, lon]}>
                                        <Popup>
                                            <div className="map-popup">
                                                <strong>{disaster.name}</strong>
                                                <p>Type: {type}</p>
                                                <p>Severity: {disaster.severity}</p>
                                                <p>Affected: {affectedPop}</p>
                                            </div>
                                        </Popup>
                                    </Marker>
                                    <Circle
                                        center={[lat, lon]}
                                        radius={radius}
                                        pathOptions={{
                                            color: getSeverityColor(disaster.severity),
                                            fillColor: getSeverityColor(disaster.severity),
                                            fillOpacity: 0.2
                                        }}
                                    />
                                </React.Fragment>
                            );
                        })}
                    </MapContainer>
                </div>

                {/* Live Disaster Detail Panel */}
                {selectedLiveDisaster && activeTab === 'live' && (
                    <div className="disaster-detail live-detail">
                        <div className="detail-header">
                            <h3>{getTypeIcon(selectedLiveDisaster.type)} {selectedLiveDisaster.title}</h3>
                            <button
                                className="close-detail"
                                onClick={() => setSelectedLiveDisaster(null)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="detail-content">
                            <div className="detail-section">
                                <h4>Event Information</h4>
                                <p><strong>Type:</strong> {selectedLiveDisaster.type}</p>
                                <p><strong>Severity:</strong>
                                    <span
                                        className="severity-inline"
                                        style={{ color: getSeverityColor(selectedLiveDisaster.severity) }}
                                    >
                                        {selectedLiveDisaster.severity}
                                    </span>
                                </p>
                                {selectedLiveDisaster.magnitude && (
                                    <>
                                        <p><strong>Magnitude:</strong>
                                            <span style={{ color: getMagnitudeColor(selectedLiveDisaster.magnitude), fontWeight: 'bold' }}>
                                                {selectedLiveDisaster.magnitude.toFixed(1)}
                                            </span>
                                        </p>
                                        {selectedLiveDisaster.location.depth && (
                                            <p><strong>Depth:</strong> {selectedLiveDisaster.location.depth.toFixed(1)} km</p>
                                        )}
                                    </>
                                )}
                                <p><strong>Time:</strong> {new Date(selectedLiveDisaster.time).toLocaleString()}</p>
                                <p><strong>Source:</strong> {selectedLiveDisaster.source}</p>
                            </div>

                            <div className="detail-section">
                                <h4>Location</h4>
                                <p><strong>Place:</strong> {selectedLiveDisaster.place || 'N/A'}</p>
                                <p><strong>Coordinates:</strong> {selectedLiveDisaster.location.lat.toFixed(4)}, {selectedLiveDisaster.location.lon.toFixed(4)}</p>
                            </div>

                            {selectedLiveDisaster.tsunami && (
                                <div className="detail-section tsunami-warning">
                                    <h4>⚠️ Tsunami Warning</h4>
                                    <p>This earthquake may have triggered a tsunami alert.</p>
                                </div>
                            )}

                            {selectedLiveDisaster.url && (
                                <div className="detail-section">
                                    <h4>More Information</h4>
                                    <a
                                        href={selectedLiveDisaster.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="external-link"
                                    >
                                        View on {selectedLiveDisaster.source} →
                                    </a>
                                </div>
                            )}

                            {selectedLiveDisaster.sources && selectedLiveDisaster.sources.length > 0 && (
                                <div className="detail-section">
                                    <h4>Data Sources</h4>
                                    {selectedLiveDisaster.sources.map((source, idx) => (
                                        <a
                                            key={idx}
                                            href={source.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="external-link"
                                        >
                                            {source.id} →
                                        </a>
                                    ))}
                                </div>
                            )}

                            <div className="detail-section">
                                <h4>Quick Actions</h4>
                                <div className="quick-actions">
                                    <button
                                        className="quick-action emergency"
                                        onClick={() => createEmergencyFromLive(selectedLiveDisaster)}
                                    >
                                        <Zap size={20} />
                                        Create Emergency
                                    </button>
                                    <button
                                        className="quick-action import"
                                        onClick={() => importLiveDisaster(selectedLiveDisaster)}
                                    >
                                        <Download size={20} />
                                        Import to Local
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Local Disaster Detail Panel */}
                {selectedDisaster && activeTab === 'local' && (
                    <div className="disaster-detail">
                        <div className="detail-header">
                            <h3>{selectedDisaster.name}</h3>
                            <button
                                className="close-detail"
                                onClick={() => setSelectedDisaster(null)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="detail-content">
                            <div className="detail-section">
                                <h4>Disaster Information</h4>
                                <p><strong>Type:</strong> {getTypeIcon(getDisasterProp(selectedDisaster, 'type'))} {getDisasterProp(selectedDisaster, 'type')}</p>
                                <p><strong>Severity:</strong>
                                    <span
                                        className="severity-inline"
                                        style={{ color: getSeverityColor(selectedDisaster.severity) }}
                                    >
                                        {selectedDisaster.severity}
                                    </span>
                                </p>
                                <p><strong>Description:</strong> {getDisasterProp(selectedDisaster, 'description')}</p>
                                <p><strong>Affected Radius:</strong> {(getDisasterProp(selectedDisaster, 'radius') / 1000).toFixed(1)} km</p>
                            </div>

                            <div className="detail-section">
                                <h4>Impact Assessment</h4>
                                <p><strong>Affected Population:</strong> {getDisasterProp(selectedDisaster, 'affectedPopulation').toLocaleString()}</p>
                                <p><strong>Estimated Damage:</strong> {selectedDisaster.metadata?.estimatedDamage || 'unknown'}</p>
                                <p><strong>Created:</strong> {new Date(selectedDisaster.createdAt).toLocaleString()}</p>
                            </div>

                            <div className="detail-section">
                                <h4>Required Resources</h4>
                                <div className="resources-list">
                                    {getResourcesForDisasterType(getDisasterProp(selectedDisaster, 'type')).map((resource, idx) => {
                                        const inventoryStatus = getInventoryStatus(resource);
                                        return (
                                            <div key={idx} className="resource-item">
                                                <Package size={16} />
                                                <span className="resource-name">{resource}</span>
                                                <span className={`resource-status ${inventoryStatus.status}`}>
                                                    {inventoryStatus.stock > 0
                                                        ? `${inventoryStatus.stock} ${inventoryStatus.unit || 'units'}`
                                                        : 'Out of stock'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="detail-section">
                                <h4>Quick Actions</h4>
                                <div className="quick-actions">
                                    <button
                                        className="quick-action emergency"
                                        onClick={() => createEmergencyFromDisaster(selectedDisaster)}
                                    >
                                        <Zap size={20} />
                                        Create Emergency
                                    </button>
                                    <button
                                        className="quick-action resolve"
                                        onClick={() => resolveDisaster(selectedDisaster.zoneId)}
                                    >
                                        <CheckCircle size={20} />
                                        Mark Resolved
                                    </button>
                                </div>
                            </div>

                            {selectedDisaster.alerts && selectedDisaster.alerts.length > 0 && (
                                <div className="detail-section">
                                    <h4>Timeline & Alerts</h4>
                                    <div className="timeline">
                                        {selectedDisaster.alerts.map((alert, idx) => (
                                            <div key={idx} className="timeline-event">
                                                <div className="timeline-time">
                                                    {new Date(alert.timestamp).toLocaleString()}
                                                </div>
                                                <div className="timeline-description">
                                                    <span className={`alert-level ${alert.level}`}>{alert.level.toUpperCase()}</span>: {alert.message}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Create Disaster Modal */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal-content create-modal">
                        <div className="modal-header">
                            <h3>Create New Disaster Zone</h3>
                            <button
                                className="close-modal"
                                onClick={() => setShowCreateModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Disaster Name</label>
                                    <input
                                        type="text"
                                        value={newDisaster.name}
                                        onChange={(e) => setNewDisaster({ ...newDisaster, name: e.target.value })}
                                        placeholder="e.g., Downtown Flood Zone"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Type</label>
                                    <select
                                        value={newDisaster.type}
                                        onChange={(e) => setNewDisaster({ ...newDisaster, type: e.target.value })}
                                    >
                                        <option value="flood">🌊 Flood</option>
                                        <option value="fire">🔥 Fire</option>
                                        <option value="earthquake">🌍 Earthquake</option>
                                        <option value="storm">⛈️ Storm</option>
                                        <option value="landslide">🏔️ Landslide</option>
                                        <option value="drought">🏜️ Drought</option>
                                        <option value="cyclone">🌀 Cyclone</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Severity</label>
                                    <select
                                        value={newDisaster.severity}
                                        onChange={(e) => setNewDisaster({ ...newDisaster, severity: e.target.value })}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Affected Population</label>
                                    <input
                                        type="number"
                                        value={newDisaster.affectedPopulation}
                                        onChange={(e) => setNewDisaster({ ...newDisaster, affectedPopulation: parseInt(e.target.value) || 0 })}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="form-group full-width">
                                    <label>Location</label>
                                    <div className="location-input-group">
                                        <input
                                            type="text"
                                            value={newDisaster.location.address}
                                            onChange={(e) => setNewDisaster({
                                                ...newDisaster,
                                                location: { ...newDisaster.location, address: e.target.value }
                                            })}
                                            placeholder="Enter location or use current location"
                                            className="location-input"
                                        />
                                        <button
                                            type="button"
                                            className="location-btn"
                                            onClick={() => {
                                                if (navigator.geolocation) {
                                                    navigator.geolocation.getCurrentPosition(
                                                        (position) => {
                                                            setNewDisaster({
                                                                ...newDisaster,
                                                                location: {
                                                                    ...newDisaster.location,
                                                                    lat: position.coords.latitude,
                                                                    lon: position.coords.longitude,
                                                                    address: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`
                                                                }
                                                            });
                                                        },
                                                        (error) => {
                                                            alert('Unable to get location: ' + error.message);
                                                        }
                                                    );
                                                } else {
                                                    alert('Geolocation is not supported by your browser');
                                                }
                                            }}
                                            title="Use current location"
                                        >
                                            <MapPin size={18} />
                                            Use My Location
                                        </button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Latitude</label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        value={newDisaster.location.lat}
                                        onChange={(e) => setNewDisaster({
                                            ...newDisaster,
                                            location: { ...newDisaster.location, lat: parseFloat(e.target.value) }
                                        })}
                                        placeholder="30.7171"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Longitude</label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        value={newDisaster.location.lon}
                                        onChange={(e) => setNewDisaster({
                                            ...newDisaster,
                                            location: { ...newDisaster.location, lon: parseFloat(e.target.value) }
                                        })}
                                        placeholder="76.8537"
                                    />
                                </div>
                                <div className="form-group full-width">
                                    <label>Description</label>
                                    <textarea
                                        value={newDisaster.description}
                                        onChange={(e) => setNewDisaster({ ...newDisaster, description: e.target.value })}
                                        placeholder="Describe the disaster situation..."
                                        rows="3"
                                    />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button
                                    className="btn-secondary"
                                    onClick={() => setShowCreateModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn-primary"
                                    onClick={createDisaster}
                                    disabled={!newDisaster.name || !newDisaster.description}
                                >
                                    Create Disaster Zone
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LiveDisasters;
