import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * AI Agent 2: Image-Based Disaster Detection
 * Combines EfficientNet B3 model predictions with NASA satellite data
 */
class ImageDisasterDetectionAgent {
    constructor() {
        this.nasaAPIs = {
            firms: process.env.FIRMS_API_KEY || 'demo',
            eonet: 'https://eonet.gsfc.nasa.gov/api/v3/events',
            modis: 'https://firms.modaps.eosdis.nasa.gov/api/area/csv'
        };

        // EfficientNet B3 model endpoint (if you have it deployed)
        this.efficientNetEndpoint = process.env.EFFICIENTNET_API_URL || null;

        // Python inference script path
        this.pythonScriptPath = path.join(__dirname, 'python', 'predict_disaster.py');

        // Determine Python executable path (Prioritize local .venv)
        const venvPythonKey = process.platform === 'win32' ? 'Scripts' : 'bin';
        const venvPython = path.join(__dirname, '..', '..', '.venv', venvPythonKey, 'python' + (process.platform === 'win32' ? '.exe' : ''));
        this.pythonExecutable = fs.existsSync(venvPython) ? venvPython : 'python';

        // Disaster labels from your trained model
        this.disasterLabels = {
            0: 'fire',
            1: 'flood',
            2: 'earthquake_damage',
            3: 'landslide',
            4: 'storm_damage',
            5: 'building_collapse',
            6: 'infrastructure_damage',
            7: 'normal'
        };

        // Severity thresholds
        this.severityThresholds = {
            critical: 0.85,
            high: 0.70,
            medium: 0.50,
            low: 0.30
        };
    }

    /**
     * Main detection pipeline - combines model + NASA data
     */
    async detectDisasterFromImage(imageData, location) {
        console.log('🖼️ Agent 2: Starting image-based disaster detection...');

        const detection = {
            agentId: 'agent_2_image_detection',
            timestamp: new Date().toISOString(),
            location: location,
            modelPrediction: null,
            nasaData: null,
            combinedAnalysis: null,
            confidence: 0,
            processingTime: Date.now()
        };

        try {
            // Step 1: Run EfficientNet B3 model prediction
            detection.modelPrediction = await this.runEfficientNetPrediction(imageData);

            // Step 2: Get NASA satellite data for the location
            detection.nasaData = await this.getNASADisasterData(location);

            // Step 3: Combine both sources for final analysis
            detection.combinedAnalysis = this.combineDetections(
                detection.modelPrediction,
                detection.nasaData
            );

            // Step 4: Calculate overall confidence
            detection.confidence = this.calculateConfidence(detection);

            detection.processingTime = Date.now() - detection.processingTime;
            console.log(`✅ Image detection complete in ${detection.processingTime}ms`);

            return detection;

        } catch (error) {
            console.error('❌ Image detection error:', error.message);
            return this.fallbackDetection(location);
        }
    }

    /**
     * Run EfficientNet B3 model prediction on drone/satellite image
     */
    async runEfficientNetPrediction(imageData) {
        try {
            // 1. Try Remote API
            if (this.efficientNetEndpoint) {
                const response = await fetch(this.efficientNetEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: imageData })
                });

                if (response.ok) {
                    const result = await response.json();
                    return this.processModelOutput(result);
                }
            }

            // 2. Try Local Python Script
            if (fs.existsSync(this.pythonScriptPath)) {
                try {
                    const result = await this.runPythonInference(imageData);
                    if (result && !result.error) {
                        return this.processPythonOutput(result);
                    } else {
                        console.warn('⚠️ Python inference returned error:', result?.error);
                    }
                } catch (pyError) {
                    console.warn('⚠️ Python inference failed (check torch/torchvision installation):', pyError.message);
                }
            }

            // 3. Fallback: Simulate EfficientNet B3 predictions
            return this.simulateEfficientNetPrediction(imageData);

        } catch (error) {
            console.warn('⚠️ EfficientNet prediction failed, using simulation');
            return this.simulateEfficientNetPrediction(imageData);
        }
    }

    /**
     * Execute Python script for inference
     */
    runPythonInference(imageData) {
        return new Promise((resolve, reject) => {
            const pythonProcess = spawn(this.pythonExecutable, [this.pythonScriptPath]);

            let output = '';
            let errorOutput = '';

            // Send image data to stdin
            pythonProcess.stdin.write(JSON.stringify({ image: imageData }));
            pythonProcess.stdin.end();

            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Python script exited with code ${code}: ${errorOutput}`));
                    return;
                }

                try {
                    const result = JSON.parse(output);
                    resolve(result);
                } catch (e) {
                    reject(new Error('Failed to parse Python output'));
                }
            });
        });
    }

    /**
     * Process Output from Python Script
     */
    processPythonOutput(result) {
        // Map Python result format to internal format if needed
        return {
            source: 'efficientnet_b3_local',
            primaryDisaster: result.primary_disaster,
            topPredictions: result.top_predictions,
            rawPredictions: result.predictions,
            confidence: result.primary_disaster.probability,
            severity: this.calculateSeverityFromProbability(result.primary_disaster.probability)
        };
    }

    /**
     * Process EfficientNet B3 model output
     */
    processModelOutput(modelResult) {
        let predictions = [];

        // Check if it's the 15-class dictionary from FastAPI
        if (modelResult && typeof modelResult === 'object' && !modelResult.predictions) {
            const p = modelResult;
            
            // Map the 15 LADI classes to the 8 backend categories
            const mapped = {
                'fire': (p.trees_damage > 0.6 && p.flooding_any < 0.2) ? p.trees_damage * 0.5 : 0.0,
                'flood': Math.max(p.flooding_any || 0, p.flooding_structures || 0, p.water_any || 0),
                'earthquake_damage': Math.max(p.buildings_affected || 0, p.buildings_destroyed || 0, p.bridges_damage || 0, p.roads_damage || 0),
                'landslide': Math.max(p.debris_any || 0, p.roads_damage || 0),
                'storm_damage': Math.max(p.trees_damage || 0, p.buildings_minor || 0, p.buildings_major || 0),
                'building_collapse': p.buildings_destroyed || 0,
                'infrastructure_damage': Math.max(p.roads_damage || 0, p.bridges_damage || 0, p.flooding_structures || 0, p.debris_any || 0),
            };

            const maxDamage = Math.max(
                mapped.flood,
                mapped.earthquake_damage,
                mapped.landslide,
                mapped.storm_damage,
                mapped.building_collapse,
                mapped.infrastructure_damage
            );
            mapped['normal'] = Math.max(0, 1.0 - maxDamage);

            const labelOrder = ['fire', 'flood', 'earthquake_damage', 'landslide', 'storm_damage', 'building_collapse', 'infrastructure_damage', 'normal'];
            predictions = labelOrder.map(label => mapped[label]);
        } else if (modelResult && modelResult.predictions) {
            // Backward compatibility for raw arrays
            predictions = modelResult.predictions[0] || [];
        }

        // Get top 3 predictions
        const sortedPredictions = predictions
            .map((prob, idx) => ({
                label: this.disasterLabels[idx] || 'unknown',
                probability: prob,
                class: idx
            }))
            .sort((a, b) => b.probability - a.probability)
            .slice(0, 3);

        return {
            source: 'efficientnet_b3',
            primaryDisaster: sortedPredictions[0],
            topPredictions: sortedPredictions,
            rawPredictions: predictions,
            confidence: sortedPredictions[0].probability,
            severity: this.calculateSeverityFromProbability(sortedPredictions[0].probability)
        };
    }


    /**
     * Simulate EfficientNet B3 predictions (for demo/testing)
     * Uses a hash of the image data to produce deterministic results
     */
    simulateEfficientNetPrediction(imageData) {
        // Simple hash function to make simulation deterministic
        let hash = 0;
        const str = imageData.toString().substring(0, 100); // Use first 100 chars
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }

        // Use hash to select a primary disaster index
        const disasterTypes = Object.values(this.disasterLabels);
        const primaryIndex = Math.abs(hash) % (disasterTypes.length - 1); // Exclude 'normal' slightly less often? Or just mod length.

        // Generate probabilities with the hashed index getting the highest score
        const predictions = disasterTypes.map((_, idx) => {
            if (idx === primaryIndex) return 0.7 + (Math.abs(hash % 20) / 100); // 0.70 - 0.90
            return (Math.abs(hash >> (idx)) % 30) / 100; // 0.00 - 0.30
        });

        // Normalize to sum to 1
        const sum = predictions.reduce((a, b) => a + b, 0);
        const normalized = predictions.map(p => p / sum);

        // Get top prediction
        const topPredictions = normalized
            .map((prob, idx) => ({
                label: this.disasterLabels[idx],
                probability: Number(prob.toFixed(4)),
                class: idx
            }))
            .sort((a, b) => b.probability - a.probability)
            .slice(0, 3);

        return {
            source: 'efficientnet_b3_simulated',
            primaryDisaster: topPredictions[0],
            topPredictions: topPredictions,
            rawPredictions: normalized,
            confidence: topPredictions[0].probability,
            severity: this.calculateSeverityFromProbability(topPredictions[0].probability)
        };
    }

    /**
     * Get NASA satellite disaster data
     */
    async getNASADisasterData(location) {
        const nasaData = {
            fires: [],
            events: [],
            modisData: null
        };

        try {
            // 1. NASA FIRMS - Fire detection
            nasaData.fires = await this.getNASAFires(location);

            // 2. NASA EONET - Natural events
            nasaData.events = await this.getNASAEvents(location);

            // 3. MODIS satellite data
            nasaData.modisData = await this.getMODISData(location);

            return nasaData;

        } catch (error) {
            console.warn('⚠️ NASA data fetch failed:', error.message);
            return nasaData;
        }
    }

    /**
     * Get fire data from NASA FIRMS
     */
    async getNASAFires(location) {
        try {
            const { lat, lon } = location;
            const radius = 0.1; // 10km radius

            const url = `${this.nasaAPIs.modis}/${this.nasaAPIs.firms}/VIIRS_SNPP_NRT/${lat - radius},${lon - radius},${lat + radius},${lon + radius}/1`;

            const response = await fetch(url);
            if (response.ok) {
                const csvText = await response.text();
                return this.parseFireCSV(csvText);
            }
        } catch (error) {
            console.warn('NASA FIRMS error:', error.message);
        }
        return [];
    }

    /**
     * Get natural events from NASA EONET
     */
    async getNASAEvents(location) {
        try {
            const response = await fetch(`${this.nasaAPIs.eonet}?status=open&limit=50`);
            if (response.ok) {
                const data = await response.json();
                return this.filterEventsByLocation(data.events, location);
            }
        } catch (error) {
            console.warn('NASA EONET error:', error.message);
        }
        return [];
    }

    /**
     * Get MODIS satellite data
     */
    async getMODISData(location) {
        // MODIS data processing would go here
        // For now, return basic analysis
        return {
            available: false,
            reason: 'MODIS API integration pending'
        };
    }

    /**
     * Combine EfficientNet predictions with NASA data
     */
    combineDetections(modelPrediction, nasaData) {
        const combined = {
            disasterType: modelPrediction.primaryDisaster.label,
            confidence: modelPrediction.confidence,
            severity: modelPrediction.severity,
            sources: ['efficientnet_b3'],
            corroboration: []
        };

        // Check if NASA data corroborates the model prediction
        if (nasaData.fires.length > 0 && modelPrediction.primaryDisaster.label === 'fire') {
            combined.confidence += 0.15;
            combined.corroboration.push('NASA FIRMS fire detection confirms model prediction');
            combined.sources.push('nasa_firms');
        }

        if (nasaData.events.length > 0) {
            const relevantEvents = nasaData.events.filter(event =>
                this.isEventRelevant(event, modelPrediction.primaryDisaster.label)
            );

            if (relevantEvents.length > 0) {
                combined.confidence += 0.10;
                combined.corroboration.push(`NASA EONET detected ${relevantEvents.length} related events`);
                combined.sources.push('nasa_eonet');
            }
        }

        // Cap confidence at 1.0
        combined.confidence = Math.min(combined.confidence, 1.0);

        // Recalculate severity with combined confidence
        combined.severity = this.calculateSeverityFromProbability(combined.confidence);

        // Add detailed analysis
        combined.details = {
            modelPredictions: modelPrediction.topPredictions,
            nasaFireCount: nasaData.fires.length,
            nasaEventCount: nasaData.events.length,
            corroborationScore: combined.corroboration.length / 2 // 0 to 1 scale
        };

        return combined;
    }

    /**
     * Calculate overall confidence from multiple sources
     */
    calculateConfidence(detection) {
        let confidence = detection.modelPrediction.confidence * 0.7; // Model weight: 70%

        // NASA data weight: 30%
        if (detection.nasaData.fires.length > 0) confidence += 0.15;
        if (detection.nasaData.events.length > 0) confidence += 0.15;

        return Math.min(confidence, 1.0);
    }

    /**
     * Calculate severity from probability
     */
    calculateSeverityFromProbability(probability) {
        if (probability >= this.severityThresholds.critical) return 'critical';
        if (probability >= this.severityThresholds.high) return 'high';
        if (probability >= this.severityThresholds.medium) return 'medium';
        return 'low';
    }

    /**
     * Parse NASA FIRMS CSV data
     */
    parseFireCSV(csvText) {
        const lines = csvText.split('\n').slice(1); // Skip header
        return lines
            .filter(line => line.trim())
            .map(line => {
                const [lat, lon, brightness, confidence, ...rest] = line.split(',');
                return {
                    lat: parseFloat(lat),
                    lon: parseFloat(lon),
                    brightness: parseFloat(brightness),
                    confidence: parseFloat(confidence)
                };
            });
    }

    /**
     * Filter NASA events by location proximity
     */
    filterEventsByLocation(events, location) {
        const maxDistance = 100; // km
        return events.filter(event => {
            if (!event.geometry || event.geometry.length === 0) return false;

            const eventCoords = event.geometry[0].coordinates;
            const distance = this.calculateDistance(
                location.lat, location.lon,
                eventCoords[1], eventCoords[0]
            );

            return distance <= maxDistance;
        });
    }

    /**
     * Check if NASA event is relevant to predicted disaster
     */
    isEventRelevant(event, predictedDisaster) {
        const eventType = event.categories[0]?.title.toLowerCase() || '';
        const disasterMap = {
            'fire': ['wildfires'],
            'flood': ['floods', 'severe storms'],
            'storm_damage': ['severe storms', 'tropical cyclones'],
            'earthquake_damage': ['earthquakes'],
            'landslide': ['landslides']
        };

        const relevantTypes = disasterMap[predictedDisaster] || [];
        return relevantTypes.some(type => eventType.includes(type));
    }

    /**
     * Calculate distance between two coordinates (Haversine formula)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Fallback detection when main pipeline fails
     */
    fallbackDetection(location) {
        return {
            agentId: 'agent_2_image_detection',
            timestamp: new Date().toISOString(),
            location: location,
            modelPrediction: {
                source: 'fallback',
                primaryDisaster: { label: 'unknown', probability: 0.5, class: -1 },
                confidence: 0.3,
                severity: 'medium'
            },
            nasaData: { fires: [], events: [], modisData: null },
            combinedAnalysis: {
                disasterType: 'unknown',
                confidence: 0.3,
                severity: 'medium',
                sources: ['fallback'],
                corroboration: []
            },
            confidence: 0.3,
            processingTime: 0
        };
    }

    /**
     * Extract labels from image analysis
     */
    extractLabels(detection) {
        const labels = [];

        // Add primary disaster
        labels.push({
            type: 'disaster_type',
            value: detection.combinedAnalysis.disasterType,
            confidence: detection.combinedAnalysis.confidence
        });

        // Add severity
        labels.push({
            type: 'severity',
            value: detection.combinedAnalysis.severity,
            confidence: detection.confidence
        });

        // Add top predictions
        if (detection.modelPrediction.topPredictions) {
            detection.modelPrediction.topPredictions.forEach(pred => {
                if (pred.probability > 0.3) {
                    labels.push({
                        type: 'possible_disaster',
                        value: pred.label,
                        confidence: pred.probability
                    });
                }
            });
        }

        // Add NASA corroboration
        if (detection.nasaData.fires.length > 0) {
            labels.push({
                type: 'nasa_detection',
                value: 'fire_detected',
                confidence: 0.9
            });
        }

        return labels;
    }
}

export default ImageDisasterDetectionAgent;