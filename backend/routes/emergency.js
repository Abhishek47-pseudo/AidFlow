import express from 'express';
import EmergencyAIAgent from '../services/aiAgent.js';
import EmergencyDecisionAgent from '../services/emergencyDecisionAgent.js';
import Emergency from '../models/Emergency.js';
import DispatchRequest from '../models/DispatchRequest.js';
import { InventoryItem } from '../models/Inventory.js';
import mongoose from 'mongoose'; // Import mongoose

const router = express.Router();
const aiAgent = new EmergencyAIAgent();
const decisionAgent = new EmergencyDecisionAgent();

/**
 * POST /api/emergency/request
 * Submit an emergency request with location and message
 */
router.post('/request', async (req, res) => {
    try {
        const { lat, lon, message, address } = req.body;

        // Validate input
        if (!lat || !lon || !message) {
            return res.status(400).json({
                error: 'Missing required fields: lat, lon, message'
            });
        }

        // Get userId from authenticated user (if available) or from request body
        let userId;
        if (req.user && req.user._id) {
            userId = req.user._id;
        } else if (req.body.userId) {
            // Validate ObjectId format
            if (!mongoose.Types.ObjectId.isValid(req.body.userId)) {
                return res.status(400).json({
                    error: 'Invalid userId format. Must be a valid MongoDB ObjectId.'
                });
            }
            userId = new mongoose.Types.ObjectId(req.body.userId);
        } else {
            return res.status(400).json({
                error: 'User authentication required. Please provide valid userId or authenticate.'
            });
        }

        console.log(`🚨 New emergency request from user ${userId} at ${lat}, ${lon}`);

        // Process with AI Agent
        const emergencyData = { lat, lon, message, timestamp: new Date() };
        const aiResponse = await aiAgent.processEmergencyRequest(emergencyData);

        // Save to database
        const emergency = new Emergency({
            emergencyId: aiResponse.emergencyId,
            userId: userId,
            location: { lat, lon, address },
            userMessage: message,
            aiAnalysis: aiResponse.analysis,
            response: aiResponse.response,
            satelliteData: aiResponse.satelliteData || {},
            timeline: [{
                status: 'received',
                timestamp: new Date(),
                notes: 'Emergency request received and analyzed by AI'
            }]
        });

        await emergency.save();

        // 🤖 NEW: Groq Decision Agent - Autonomous Dispatch Decision
        console.log(`🤖 Invoking Groq Emergency Decision Agent...`);
        const decisionResult = await decisionAgent.makeDispatchDecision(
            {
                emergencyId: aiResponse.emergencyId,
                location: { lat, lon, address },
                userMessage: message
            },
            aiResponse.analysis
        );

        console.log(`✅ Decision Agent Result: Dispatch=${decisionResult.shouldDispatch}, Confidence=${decisionResult.confidence}`);

        // Handle inventory based on severity and dispatch decision
        if (decisionResult.dispatchExecuted) {
            // High+ severity: Inventory automatically updated during automatic dispatch
            console.log(`✅ Inventory automatically updated for high severity emergency`);
        } else {
            // Medium/Low severity: Create dispatch request and reserve resources
            console.log(`📋 Creating dispatch request for medium/low severity emergency`);
            await createDispatchRequest(aiResponse.emergencyId, aiResponse.analysis, aiResponse.response.resources);
        }

        res.status(201).json({
            success: true,
            emergencyId: aiResponse.emergencyId,
            analysis: aiResponse.analysis,
            response: aiResponse.response,
            autonomousDecision: {
                shouldDispatch: decisionResult.shouldDispatch,
                confidence: decisionResult.confidence,
                dispatchExecuted: decisionResult.dispatchExecuted || false,
                reasoning: decisionResult.reasoning,
                dispatchPlan: decisionResult.dispatchPlan,
                sentiment: decisionResult.sentiment,
                emotion: decisionResult.emotion,
                urgency_score: decisionResult.urgency_score,
                entities: decisionResult.entities,
                risk_level: decisionResult.risk_level,
                requires_immediate_dispatch: decisionResult.requires_immediate_dispatch,
                alternativeActions: decisionResult.alternativeActions
            },
            message: decisionResult.dispatchExecuted
                ? '🚀 Emergency analyzed and resources automatically dispatched by AI!'
                : 'Emergency request processed successfully. Awaiting manual dispatch approval.'
        });

    } catch (error) {
        console.error('❌ Emergency request error:', error.message);
        res.status(500).json({
            error: 'Failed to process emergency request',
            details: error.message
        });
    }
});

/**
 * GET /api/emergency/status/:emergencyId
 * Get status of an emergency request
 */
router.get('/status/:emergencyId', async (req, res) => {
    try {
        const { emergencyId } = req.params;

        const emergency = await Emergency.findOne({ emergencyId })
            // .populate('userId', 'firstName lastName') // Commented out since userId is now string
            .populate('assignedTeam', 'firstName lastName role');

        if (!emergency) {
            return res.status(404).json({ error: 'Emergency request not found' });
        }

        res.json({
            emergencyId: emergency.emergencyId,
            status: emergency.status,
            location: emergency.location,
            analysis: emergency.aiAnalysis,
            response: emergency.response,
            timeline: emergency.timeline,
            assignedTeam: emergency.assignedTeam,
            createdAt: emergency.createdAt,
            updatedAt: emergency.updatedAt
        });

    } catch (error) {
        console.error('❌ Status check error:', error.message);
        res.status(500).json({ error: 'Failed to get emergency status' });
    }
});

/**
 * GET /api/emergency/active
 * Get all active emergency requests (for admin dashboard)
 */
router.get('/active', async (req, res) => {
    try {
        const activeEmergencies = await Emergency.find({
            status: { $in: ['received', 'analyzing', 'dispatched', 'en_route'] }
        })
            // .populate('userId', 'firstName lastName') // Commented out since userId is now string
            .populate('assignedTeam', 'firstName lastName role')
            .sort({ 'aiAnalysis.severity': -1, createdAt: -1 });

        res.json({
            count: activeEmergencies.length,
            emergencies: activeEmergencies
        });

    } catch (error) {
        console.error('❌ Active emergencies error:', error.message);
        res.status(500).json({ error: 'Failed to get active emergencies' });
    }
});

/**
 * PUT /api/emergency/update/:emergencyId
 * Update emergency status (for admin/responders)
 */
router.put('/update/:emergencyId', async (req, res) => {
    try {
        const { emergencyId } = req.params;
        const { status, notes, assignedTeam, updatedBy } = req.body;

        const emergency = await Emergency.findOne({ emergencyId });
        if (!emergency) {
            return res.status(404).json({ error: 'Emergency request not found' });
        }

        // Update status
        if (status) {
            emergency.status = status;
        }

        // Assign team
        if (assignedTeam) {
            emergency.assignedTeam = assignedTeam;
        }

        // Add timeline entry
        emergency.timeline.push({
            status: status || emergency.status,
            timestamp: new Date(),
            notes: notes || `Status updated to ${status}`,
            updatedBy: updatedBy ? new mongoose.Types.ObjectId(updatedBy) : null // Convert updatedBy to ObjectId
        });

        await emergency.save();

        res.json({
            success: true,
            emergencyId,
            status: emergency.status,
            message: 'Emergency status updated successfully'
        });

    } catch (error) {
        console.error('❌ Update emergency error:', error.message);
        res.status(500).json({ error: 'Failed to update emergency status' });
    }
});

/**
 * GET /api/emergency/analytics
 * Get emergency analytics for dashboard
 */
router.get('/analytics', async (req, res) => {
    try {
        const analytics = await Promise.all([
            // Total emergencies by status
            Emergency.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),

            // Emergencies by disaster type
            Emergency.aggregate([
                { $group: { _id: '$aiAnalysis.disaster.type', count: { $sum: 1 } } }
            ]),

            // Emergencies by severity
            Emergency.aggregate([
                { $group: { _id: '$aiAnalysis.severity', count: { $sum: 1 } } }
            ]),

            // Recent emergencies (last 24 hours)
            Emergency.countDocuments({
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            })
        ]);

        res.json({
            byStatus: analytics[0],
            byDisasterType: analytics[1],
            bySeverity: analytics[2],
            last24Hours: analytics[3]
        });

    } catch (error) {
        console.error('❌ Analytics error:', error.message);
        res.status(500).json({ error: 'Failed to get emergency analytics' });
    }
});

// Helper function to create dispatch request for medium/low severity emergencies
async function createDispatchRequest(emergencyId, analysis, resourcePlan) {
    try {
        const severity = analysis?.severity || 'medium';
        const requestedResources = [];

        // Convert resource plan to structured format
        const immediate = resourcePlan?.immediate || [];
        const secondary = resourcePlan?.secondary || [];
        const allResources = [...immediate, ...secondary];

        for (const resourceName of allResources) {
            const quantity = resourcePlan?.quantities?.[resourceName] || 1;
            requestedResources.push({
                name: resourceName,
                quantity: quantity,
                category: mapResourceToCategory(resourceName)
            });
        }

        const dispatchRequest = new DispatchRequest({
            emergencyId: emergencyId,
            severity: severity,
            requestedResources: requestedResources,
            status: 'pending',
            priority: severity === 'medium' ? 'medium' : 'low',
            reasoning: `${severity} severity emergency requires manual approval for dispatch`,
            notes: `AI analysis confidence: ${analysis?.disaster?.confidence || 'unknown'}`
        });

        await dispatchRequest.save();
        console.log(`📋 Dispatch request created for emergency ${emergencyId}`);

        // Reserve resources temporarily
        await reserveResources(resourcePlan);

    } catch (error) {
        console.error('❌ Failed to create dispatch request:', error.message);
    }
}

// Helper function to map resource names to categories
function mapResourceToCategory(resourceName) {
    const categoryMap = {
        'medical': 'Medical',
        'food': 'Food',
        'water': 'Water',
        'shelter': 'Shelter',
        'equipment': 'Equipment'
    };

    const lowerName = resourceName.toLowerCase();
    for (const [key, category] of Object.entries(categoryMap)) {
        if (lowerName.includes(key)) {
            return category;
        }
    }
    return 'Equipment'; // Default category
}

// Helper function to reserve resources
async function reserveResources(resourcePlan) {
    try {
        const resourcesToReserve = [...resourcePlan.immediate, ...resourcePlan.secondary];

        for (const resourceName of resourcesToReserve) {
            const quantity = resourcePlan.quantities[resourceName] || 1;

            // Normalize resource name for better matching
            const normalizedResourceName = resourceName.replace(/_/g, ' ');

            const item = await InventoryItem.findOne({
                $or: [
                    { name: { $regex: resourceName, $options: 'i' } },
                    { name: { $regex: normalizedResourceName, $options: 'i' } },
                    { name: { $regex: resourceName.replace(/_/g, ''), $options: 'i' } }
                ]
            });

            if (item && item.currentStock >= quantity) {
                item.currentStock -= quantity;
                await item.save();
                console.log(`📦 Reserved ${quantity} ${resourceName}`);
            } else {
                console.warn(`⚠️ Insufficient stock for ${resourceName}`);
            }
        }
    } catch (error) {
        console.error('❌ Resource reservation error:', error.message);
    }
}

/**
 * POST /api/emergency/request-with-image
 * Submit an emergency request with an image (Agent 2 Analysis + Database Save)
 */
router.post('/request-with-image', async (req, res) => {
    try {
        const { imageData, location, userId, message } = req.body;

        if (!imageData || !location) {
            return res.status(400).json({
                error: 'Missing required fields: imageData, location'
            });
        }

        console.log(`🖼️ Processing image emergency request from user ${userId}`);

        // 1. Analyze Image using Agent 2
        const imageAgent = new (await import('../services/imageDisasterDetection.js')).default();
        const detection = await imageAgent.detectDisasterFromImage(imageData, location);

        // 2. Map detection to schema format
        const disasterType = detection.combinedAnalysis.disasterType !== 'normal'
            ? detection.combinedAnalysis.disasterType
            : 'unknown';

        const severity = detection.combinedAnalysis.severity;
        const confidence = detection.combinedAnalysis.confidence;

        // 3. Create Emergency Record in Database
        const emergencyId = `EMG_IMG_${Date.now()}`;

        const newEmergency = new Emergency({
            emergencyId,
            userId: userId || req.user?._id, // Ensure user ID is present
            location: {
                lat: location.lat,
                lon: location.lon,
                address: location.address || `${location.lat}, ${location.lon}`
            },
            userMessage: message || `Image report: ${disasterType} detected`,
            aiAnalysis: {
                disaster: {
                    type: disasterType,
                    confidence: confidence,
                    indicators: detection.combinedAnalysis.corroboration || [],
                    priority: severity === 'critical' ? 'critical' :
                        severity === 'high' ? 'high' : 'medium'
                },
                sentiment: {
                    // Image doesn't have sentiment, infer from severity
                    urgency: severity === 'critical' ? 'critical' :
                        severity === 'high' ? 'high' : 'medium',
                    emotion: 'neutral',
                    keywords: ['image_detection'],
                    score: 0.5
                },
                severity: severity
            },
            response: {
                resources: {
                    immediate: [], // Will be filled by Decision Agent
                    secondary: [],
                    quantities: {}
                }
            },
            status: 'analyzing', // Initial status
            satelliteData: {
                fires: detection.nasaData.fires,
                // store original detection for debug/ref
                satellite: detection
            },
            timeline: [{
                status: 'received',
                notes: 'Emergency reported via image analysis'
            }]
        });

        await newEmergency.save();
        console.log(`✅ Emergency ${emergencyId} saved to database`);

        // 4. Trigger Decision Agent (Agent 3) to decide on resources/dispatch
        // We run this asynchronously so we don't block the response? 
        // Or strictly await if we want immediate feedback. Let's await for better UX.

        try {
            // Get inventory analysis (mock or real)
            const inventoryAnalysis = await decisionAgent.analyzeInventory(newEmergency.location);

            // Get context (time, weather)
            const contextAnalysis = await decisionAgent.analyzeContext(newEmergency.location);

            // Generate Decision
            const decision = await decisionAgent.generateDecision(
                newEmergency,
                newEmergency.aiAnalysis,
                inventoryAnalysis,
                contextAnalysis
            );

            // Apply Decision (Update Resources & Status)
            newEmergency.response.resources = decision.suggestedResources;

            if (decision.shouldDispatch) {
                newEmergency.status = 'dispatched'; // Will be updated by dispatch service
                newEmergency.timeline.push({
                    status: 'analyzing',
                    notes: `Decision Agent approved dispatch (Value: ${decision.reasoning.financialValue})`
                });
                await newEmergency.save();

                // Trigger actual dispatch
                console.log(`🚀 Triggering dispatch for image emergency ${emergencyId}`);
                await import('../services/dispatchService.js').then(async (module) => {
                    const dispatchService = new module.default();
                    await dispatchService.dispatchEmergency(emergencyId);
                });
            } else {
                newEmergency.status = 'received'; // Pending manual review
                newEmergency.timeline.push({
                    status: 'analyzing',
                    notes: `Decision Agent recommends manual review. Reason: ${decision.reasoning.summary}`
                });
                await newEmergency.save();

                // Create Dispatch Request for manual approval
                if (decision.confidence > 0) {
                    const DispatchRequest = (await import('../models/DispatchRequest.js')).default;
                    await DispatchRequest.create({
                        emergencyId: newEmergency.emergencyId,
                        priority: newEmergency.aiAnalysis.disaster.priority,
                        severity: newEmergency.aiAnalysis.severity,
                        location: newEmergency.location.address,
                        requestedResources: [
                            ...newEmergency.response.resources.immediate.map(name => ({
                                name, category: 'General', quantity: 1
                            })),
                            ...newEmergency.response.resources.secondary.map(name => ({
                                name, category: 'General', quantity: 1
                            }))
                        ],
                        reasoning: decision.reasoning.summary,
                        status: 'pending'
                    });
                    console.log(`📋 Created dispatch request for manual review: ${emergencyId}`);
                }
            }

        } catch (decisionError) {
            console.error('⚠️ Decision Agent failed for image request:', decisionError);
            // Don't fail the whole request, just log and leave as 'received'
        }

        res.status(200).json({
            success: true,
            emergency: newEmergency,
            detection: detection,
            message: 'Image report processed and saved successfully'
        });

    } catch (error) {
        console.error('❌ Image reporting error:', error.message);
        res.status(500).json({
            error: 'Failed to process image report',
            details: error.message
        });
    }
});

/**
 * POST /api/emergency/analyze-image
 * Analyze disaster from image (Agent 2) - Analysis Only (No Save)
 */
router.post('/analyze-image', async (req, res) => {
    try {
        const { imageData, location, userId } = req.body;

        if (!imageData || !location) {
            return res.status(400).json({
                error: 'Missing required fields: imageData, location'
            });
        }

        console.log(`🖼️ Image analysis request from user ${userId} at ${location.lat}, ${location.lon}`);

        // Use Agent 2 for image-based disaster detection
        const imageAgent = new (await import('../services/imageDisasterDetection.js')).default();
        const detection = await imageAgent.detectDisasterFromImage(imageData, location);

        // Extract labels
        const labels = imageAgent.extractLabels(detection);

        res.status(200).json({
            success: true,
            detection: detection,
            labels: labels,
            message: 'Image analysis complete'
        });

    } catch (error) {
        console.error('❌ Image analysis error:', error.message);
        res.status(500).json({
            error: 'Failed to analyze image',
            details: error.message
        });
    }
});

/**
 * POST /api/emergency/reroute
 * Request re-routing for active emergency (Agent 3)
 */
router.post('/reroute/:emergencyId', async (req, res) => {
    try {
        const { emergencyId } = req.params;
        const { currentLocation } = req.body;

        const emergency = await Emergency.findOne({ emergencyId });
        if (!emergency) {
            return res.status(404).json({ error: 'Emergency not found' });
        }

        console.log(`🔄 Re-routing request for emergency ${emergencyId}`);

        // Use Agent 3 for smart re-routing
        const routingAgent = new (await import('../services/smartRouting.js')).default();
        const newRoute = await routingAgent.checkForReRouting(
            emergency.response.routing,
            currentLocation
        );

        if (newRoute) {
            // Update emergency with new route
            emergency.response.routing = newRoute;
            emergency.timeline.push({
                status: 'rerouted',
                timestamp: new Date(),
                notes: 'Route updated due to changing conditions'
            });
            await emergency.save();

            res.json({
                success: true,
                newRoute: newRoute,
                message: 'Route updated successfully'
            });
        } else {
            res.json({
                success: true,
                message: 'Current route is still optimal'
            });
        }

    } catch (error) {
        console.error('❌ Re-routing error:', error.message);
        res.status(500).json({
            error: 'Failed to re-route',
            details: error.message
        });
    }
});

/**
 * POST /api/emergency/ai-decision/:emergencyId
 * Trigger AI decision agent for existing emergency (manual override)
 */
router.post('/ai-decision/:emergencyId', async (req, res) => {
    try {
        const { emergencyId } = req.params;
        const { forceDecision } = req.body;

        console.log(`🤖 Manual AI decision trigger for ${emergencyId}`);

        // Get emergency from database
        const emergency = await Emergency.findOne({ emergencyId });
        if (!emergency) {
            return res.status(404).json({ error: 'Emergency not found' });
        }

        // Run decision agent
        const decisionResult = await decisionAgent.makeDispatchDecision(
            {
                emergencyId: emergency.emergencyId,
                location: emergency.location,
                userMessage: emergency.userMessage
            },
            emergency.aiAnalysis
        );

        // Force dispatch if requested and confidence is reasonable
        if (forceDecision && decisionResult.confidence > 0.5 && !decisionResult.dispatchExecuted) {
            const forceDispatchResult = await decisionAgent.executeDispatch(emergencyId, decisionResult.dispatchPlan);
            decisionResult.dispatchExecuted = forceDispatchResult.success;
            decisionResult.dispatchResult = forceDispatchResult;
        }

        res.json({
            success: true,
            emergencyId,
            decision: decisionResult,
            message: decisionResult.dispatchExecuted
                ? 'Resources dispatched by AI decision agent'
                : 'AI analysis complete - manual review recommended'
        });

    } catch (error) {
        console.error('❌ AI decision error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/emergency/ai-capabilities
 * Get AI decision agent capabilities and status
 */
router.get('/ai-capabilities', async (req, res) => {
    try {
        // Test Groq connection
        await decisionAgent.testGroqConnection();

        const capabilities = {
            groqEnabled: decisionAgent.groqAvailable,
            groqModel: decisionAgent.modelName,
            bertAgentsIntegrated: true,
            autonomousDispatchEnabled: true,
            inventoryScanEnabled: true,
            supportedDisasterTypes: ['flood', 'fire', 'earthquake', 'medical', 'general'],
            decisionCriteria: {
                minimumConfidence: 0.7,
                requiredSeverity: ['high', 'critical'],
                inventoryCheckRequired: true,
                costBenefitAnalysis: true
            },
            fallbackMode: 'rule-based-decision',
            aiMode: decisionAgent.groqAvailable ? 'groq-llm' : 'rule-based',
            version: '2.0.0-groq'
        };

        res.json({
            success: true,
            capabilities
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/emergency/public-request
 * Submit an emergency request without authentication (for testing/public use)
 */
router.post('/public-request', async (req, res) => {
    try {
        const { lat, lon, message, address, userInfo } = req.body;

        // Validate input
        if (!lat || !lon || !message) {
            return res.status(400).json({
                error: 'Missing required fields: lat, lon, message'
            });
        }

        // Create a temporary user ID for public requests
        const publicUserId = new mongoose.Types.ObjectId();

        console.log(`🚨 Public emergency request at ${lat}, ${lon}`);
        console.log(`📝 Message: "${message}"`);

        // Process with AI Agent
        const emergencyData = { lat, lon, message, timestamp: new Date() };
        const aiResponse = await aiAgent.processEmergencyRequest(emergencyData);

        // Save to database
        const emergency = new Emergency({
            emergencyId: aiResponse.emergencyId,
            userId: publicUserId,
            location: { lat, lon, address },
            userMessage: message,
            aiAnalysis: aiResponse.analysis,
            response: aiResponse.response,
            satelliteData: aiResponse.satelliteData || {},
            timeline: [{
                status: 'received',
                timestamp: new Date(),
                notes: 'Public emergency request received and analyzed by AI'
            }]
        });

        await emergency.save();

        // 🤖 LangChain Decision Agent - Autonomous Dispatch Decision
        console.log(`🤖 Invoking Ollama Emergency Decision Agent...`);
        const decisionResult = await decisionAgent.makeDispatchDecision(
            {
                emergencyId: aiResponse.emergencyId,
                location: { lat, lon, address },
                userMessage: message
            },
            aiResponse.analysis
        );

        console.log(`✅ Decision Agent Result: Dispatch=${decisionResult.shouldDispatch}, Confidence=${decisionResult.confidence}`);

        // Handle inventory based on severity and dispatch decision
        if (decisionResult.dispatchExecuted) {
            // High+ severity: Inventory automatically updated during automatic dispatch
            console.log(`✅ Inventory automatically updated for high severity emergency`);
        } else {
            // Medium/Low severity: Create dispatch request and reserve resources
            console.log(`📋 Creating dispatch request for medium/low severity emergency`);
            await createDispatchRequest(aiResponse.emergencyId, aiResponse.analysis, aiResponse.response.resources);
        }

        res.status(201).json({
            success: true,
            emergencyId: aiResponse.emergencyId,
            analysis: aiResponse.analysis,
            response: aiResponse.response,
            autonomousDecision: {
                shouldDispatch: decisionResult.shouldDispatch,
                confidence: decisionResult.confidence,
                dispatchExecuted: decisionResult.dispatchExecuted || false,
                reasoning: decisionResult.reasoning,
                dispatchPlan: decisionResult.dispatchPlan,
                sentiment: decisionResult.sentiment,
                emotion: decisionResult.emotion,
                urgency_score: decisionResult.urgency_score,
                entities: decisionResult.entities,
                risk_level: decisionResult.risk_level,
                requires_immediate_dispatch: decisionResult.requires_immediate_dispatch,
                alternativeActions: decisionResult.alternativeActions
            },
            message: decisionResult.dispatchExecuted
                ? '🚀 Emergency analyzed and resources automatically dispatched by AI!'
                : 'Emergency request processed successfully. Awaiting manual dispatch approval.',
            userInfo: userInfo || 'Anonymous public request'
        });

    } catch (error) {
        console.error('❌ Public emergency request error:', error.message);
        res.status(500).json({
            error: 'Failed to process emergency request',
            details: error.message
        });
    }
});

/**
 * GET /api/emergency/dispatch-requests
 * Get all pending dispatch requests for admin approval
 */
router.get('/dispatch-requests', async (req, res) => {
    try {
        const requests = await DispatchRequest.find({
            status: 'pending'
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            count: requests.length,
            requests: requests
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/emergency/dispatch-requests/:id/approve
 * Approve a dispatch request and execute dispatch
 */
router.put('/dispatch-requests/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const { adminId, notes } = req.body;

        console.log(`🔍 Approving dispatch request ${id} by admin ${adminId}`);

        const request = await DispatchRequest.findById(id);
        if (!request) {
            console.log(`❌ Dispatch request ${id} not found`);
            return res.status(404).json({ error: 'Dispatch request not found' });
        }

        console.log(`📋 Found dispatch request for emergency: ${request.emergencyId}`);

        // Update request status
        request.status = 'approved';
        request.approvedBy = mongoose.Types.ObjectId.isValid(adminId) ? new mongoose.Types.ObjectId(adminId) : null;
        request.approvedAt = new Date();
        request.notes = notes || 'Approved by admin';
        await request.save();

        // Execute dispatch
        const DispatchService = (await import('../services/dispatchService.js')).default;
        const dispatchService = new DispatchService();
        const dispatchResult = await dispatchService.dispatchEmergency(request.emergencyId,
            mongoose.Types.ObjectId.isValid(adminId) ? new mongoose.Types.ObjectId(adminId) : new mongoose.Types.ObjectId());

        res.json({
            success: true,
            message: 'Dispatch request approved and executed',
            request: request,
            dispatchResult: dispatchResult
        });

    } catch (error) {
        console.error('❌ Dispatch request approval error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.stack
        });
    }
});

/**
 * PUT /api/emergency/dispatch-requests/:id/reject
 * Reject a dispatch request
 */
router.put('/dispatch-requests/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { adminId, reason } = req.body;

        const request = await DispatchRequest.findById(id);
        if (!request) {
            return res.status(404).json({ error: 'Dispatch request not found' });
        }

        request.status = 'rejected';
        request.approvedBy = mongoose.Types.ObjectId.isValid(adminId) ? new mongoose.Types.ObjectId(adminId) : null;
        request.approvedAt = new Date();
        request.notes = reason || 'Rejected by admin';
        await request.save();

        res.json({
            success: true,
            message: 'Dispatch request rejected',
            request: request
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
/**

 * POST /api/emergency/dispatch/:emergencyId
 * ONE-CLICK DISPATCH - Automates inventory allocation, routing, and dispatch
 */
router.post('/dispatch/:emergencyId', async (req, res) => {
    try {
        const { emergencyId } = req.params;
        const { adminId } = req.body;

        if (!adminId) {
            return res.status(400).json({
                error: 'Admin ID required for dispatch authorization'
            });
        }

        console.log(`🚀 Admin ${adminId} initiating dispatch for ${emergencyId}`);

        // Import dispatch service
        const DispatchService = (await import('../services/dispatchService.js')).default;
        const dispatchService = new DispatchService();

        // Execute automated dispatch
        const result = await dispatchService.dispatchEmergency(emergencyId, new mongoose.Types.ObjectId(adminId)); // Convert adminId to ObjectId

        res.json(result);

    } catch (error) {
        console.error('❌ Dispatch error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/emergency/dispatch-status/:emergencyId
 * Get dispatch status and tracking information
 */
router.get('/dispatch-status/:emergencyId', async (req, res) => {
    try {
        const { emergencyId } = req.params;

        const DispatchService = (await import('../services/dispatchService.js')).default;
        const dispatchService = new DispatchService();

        const status = await dispatchService.getDispatchStatus(emergencyId);

        res.json(status);

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/emergency/update-status/:emergencyId
 * Update emergency status (en-route, arrived, completed)
 */
router.put('/update-status/:emergencyId', async (req, res) => {
    try {
        const { emergencyId } = req.params;
        const { status, notes, updatedBy } = req.body;

        const emergency = await Emergency.findOne({ emergencyId });
        if (!emergency) {
            return res.status(404).json({ error: 'Emergency not found' });
        }

        emergency.status = status;
        emergency.timeline.push({
            status,
            timestamp: new Date(),
            notes: notes || `Status updated to ${status}`,
            updatedBy
        });

        await emergency.save();

        res.json({
            success: true,
            emergencyId,
            status: emergency.status,
            timeline: emergency.timeline
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/emergency/active-dispatches
 * Get all active dispatches for real-time tracking
 */
router.get('/active-dispatches', async (req, res) => {
    try {
        // Include completed emergencies from last 24 hours for deletion
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const dispatches = await Emergency.find({
            $or: [
                { status: { $in: ['dispatched', 'en_route', 'delivered'] } },
                { status: 'completed', updatedAt: { $gte: oneDayAgo } }
            ]
        }).sort({ 'dispatchDetails.dispatchedAt': -1 });

        res.json({
            success: true,
            count: dispatches.length,
            dispatches: dispatches
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/emergency/:emergencyId
 * Delete a completed emergency
 */
router.delete('/:emergencyId', async (req, res) => {
    try {
        const { emergencyId } = req.params;

        const emergency = await Emergency.findOne({ emergencyId });

        if (!emergency) {
            return res.status(404).json({
                success: false,
                error: 'Emergency not found'
            });
        }

        // Only allow deletion of completed emergencies
        if (emergency.status !== 'completed' && emergency.status !== 'cancelled') {
            return res.status(400).json({
                success: false,
                error: 'Can only delete completed or cancelled emergencies'
            });
        }

        await Emergency.deleteOne({ emergencyId });

        res.json({
            success: true,
            message: 'Emergency deleted successfully',
            emergencyId
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/emergency/complete/:emergencyId
 * Mark emergency as completed with delivery confirmation
 */
router.put('/complete/:emergencyId', async (req, res) => {
    try {
        const { emergencyId } = req.params;
        const { deliveryNotes, completedBy } = req.body;

        const emergency = await Emergency.findOne({ emergencyId });

        if (!emergency) {
            return res.status(404).json({
                success: false,
                error: 'Emergency not found'
            });
        }

        // Update status to completed
        emergency.status = 'completed';

        // Add completion details
        if (emergency.dispatchDetails) {
            emergency.dispatchDetails.actualArrival = new Date();
            emergency.dispatchDetails.deliveryNotes = deliveryNotes || 'Resources delivered successfully';
        }

        // Add to timeline
        emergency.timeline.push({
            status: 'completed',
            timestamp: new Date(),
            notes: deliveryNotes || 'Emergency resolved. Resources delivered successfully.',
            updatedBy: completedBy
        });

        await emergency.save();

        res.json({
            success: true,
            message: 'Emergency marked as completed',
            emergency
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/emergency/completed
 * Get all completed emergencies
 */
router.get('/completed', async (req, res) => {
    try {
        const completedEmergencies = await Emergency.find({
            status: 'completed'
        }).sort({ updatedAt: -1 }).limit(50);

        res.json({
            success: true,
            count: completedEmergencies.length,
            emergencies: completedEmergencies
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
