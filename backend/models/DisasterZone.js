import mongoose from 'mongoose';

/**
 * Disaster Zone Model
 * Tracks active disaster zones for routing and resource allocation
 */
const disasterZoneSchema = new mongoose.Schema({
    zoneId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    disasterType: {
        type: String,
        required: true,
        enum: ['fire', 'flood', 'earthquake', 'landslide', 'storm', 'cyclone', 'tsunami', 'multiple']
    },
    severity: {
        type: String,
        required: true,
        enum: ['low', 'medium', 'high', 'critical']
    },
    status: {
        type: String,
        enum: ['active', 'monitoring', 'contained', 'resolved', 'archived'],
        default: 'active'
    },
    location: {
        center: {
            lat: { type: Number, required: true },
            lon: { type: Number, required: true }
        },
        radius: { type: Number, required: true }, // in kilometers
        affectedArea: Number, // in square kilometers
        polygon: [[Number]] // Array of [lat, lon] coordinates for boundary
    },
    affectedPopulation: {
        estimated: Number,
        evacuated: Number,
        casualties: Number,
        injured: Number
    },
    resources: {
        required: [String],
        allocated: [String],
        deployed: [String],
        shortfall: [String]
    },
    accessibilityStatus: {
        roadAccess: { type: String, enum: ['open', 'restricted', 'blocked', 'unknown'], default: 'unknown' },
        airAccess: { type: String, enum: ['available', 'limited', 'unavailable', 'unknown'], default: 'unknown' },
        waterAccess: { type: String, enum: ['available', 'limited', 'unavailable', 'unknown'], default: 'unknown' },
        hazards: [String]
    },
    detectedBy: {
        agents: [String], // ['nlp_agent', 'cv_agent']
        sources: [String], // ['satellite', 'drone', 'ground_report', 'social_media']
        firstDetected: Date,
        lastUpdated: Date
    },
    alerts: [{
        level: { type: String, enum: ['info', 'warning', 'danger', 'critical'] },
        message: String,
        timestamp: { type: Date, default: Date.now }
    }],
    metadata: mongoose.Schema.Types.Mixed
}, {
    timestamps: true
});

// Indexes
disasterZoneSchema.index({ status: 1, severity: 1 });
disasterZoneSchema.index({ 'location.center.lat': 1, 'location.center.lon': 1 });
disasterZoneSchema.index({ disasterType: 1, status: 1 });

const DisasterZone = mongoose.model('DisasterZone', disasterZoneSchema);
export default DisasterZone;