import React, { useState, useEffect, useContext, useCallback } from 'react';
import { MapPin, AlertTriangle, Send, Clock, CheckCircle } from 'lucide-react';
import { UserContext } from './UserContext';
import { createAuthenticatedAxios } from '../utils/api';

const EmergencyRequest = ({ userId: propUserId }) => {
    const { token, userId: contextUserId } = useContext(UserContext);
    const userId = contextUserId || propUserId;
    const [location, setLocation] = useState({ lat: null, lon: null });
    const [message, setMessage] = useState('');
    const [address, setAddress] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [emergencyResponse, setEmergencyResponse] = useState(null);
    const [locationError, setLocationError] = useState('');

    // Get user's current location
    const getCurrentLocation = useCallback(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    });
                    setLocationError('');
                },
                (error) => {
                    setLocationError('Unable to get your location. Please enable location services.');
                    console.error('Location error:', error);
                }
            );
        } else {
            setLocationError('Geolocation is not supported by this browser.');
        }
    }, []);

    // Reverse geocoding to get readable address
    const reverseGeocode = useCallback(async (lat, lon) => {
        try {
            // Using a free geocoding service (you can replace with your preferred service)
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
            const data = await response.json();
            setAddress(data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`);
        } catch (error) {
            setAddress(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
        }
    }, []);

    // Automatically reverse geocode location changes
    useEffect(() => {
        if (location.lat && location.lon) {
            reverseGeocode(location.lat, location.lon);
        }
    }, [location.lat, location.lon, reverseGeocode]);

    // Submit emergency request
    const submitEmergencyRequest = async (e) => {
        e.preventDefault();
        
        if (!location.lat || !location.lon) {
            alert('Please get your location first');
            return;
        }
        
        if (!message.trim()) {
            alert('Please describe your emergency');
            return;
        }

        setIsSubmitting(true);
        
        try {
            const api = createAuthenticatedAxios(token);
            const response = await api.post('/api/emergency/request', {
                lat: location.lat,
                lon: location.lon,
                message: message.trim(),
                userId: userId,
                address: address
            });

            setEmergencyResponse(response.data);
            setMessage('');
            
        } catch (error) {
            console.error('Emergency request failed:', error);
            alert('Failed to submit emergency request. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        getCurrentLocation();
    }, [getCurrentLocation]);

    if (emergencyResponse) {
        return (
            <div className="emergency-success">
                <div className="success-header">
                    <CheckCircle className="success-icon" />
                    <h2>Emergency Request Submitted</h2>
                </div>
                
                <div className="emergency-details">
                    <p><strong>Emergency ID:</strong> {emergencyResponse.emergencyId}</p>
                    <p><strong>Status:</strong> Help is being dispatched</p>
                    
                    <div className="ai-analysis">
                        <h3>AI Analysis Results:</h3>
                        <div className="analysis-grid">
                            <div className="analysis-item">
                                <strong>Disaster Type:</strong> {emergencyResponse.analysis.disaster.type}
                                <span className={`confidence confidence-${Math.round(emergencyResponse.analysis.disaster.confidence * 100)}`}>
                                    {Math.round(emergencyResponse.analysis.disaster.confidence * 100)}% confidence
                                </span>
                            </div>
                            <div className="analysis-item">
                                <strong>Severity:</strong> 
                                <span className={`severity severity-${emergencyResponse.analysis.severity}`}>
                                    {emergencyResponse.analysis.severity}
                                </span>
                            </div>
                            <div className="analysis-item">
                                <strong>Priority:</strong> 
                                <span className={`priority priority-${emergencyResponse.analysis.disaster.priority}`}>
                                    {emergencyResponse.analysis.disaster.priority}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="resource-plan">
                        <h3>Resources Being Dispatched:</h3>
                        <div className="resources">
                            <div className="immediate-resources">
                                <strong>Immediate:</strong>
                                <ul>
                                    {emergencyResponse.response.resources.immediate.map((resource, index) => (
                                        <li key={index}>{resource.replace(/_/g, ' ')}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="secondary-resources">
                                <strong>Secondary:</strong>
                                <ul>
                                    {emergencyResponse.response.resources.secondary.map((resource, index) => (
                                        <li key={index}>{resource.replace(/_/g, ' ')}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="eta">
                        <Clock className="eta-icon" />
                        <span>Estimated Arrival: {emergencyResponse.response.routing.eta}</span>
                    </div>
                </div>

                <button 
                    className="new-request-btn"
                    onClick={() => setEmergencyResponse(null)}
                >
                    Submit Another Request
                </button>
            </div>
        );
    }

    return (
        <div className="emergency-request">
            <div className="emergency-header">
                <AlertTriangle className="emergency-icon" />
                <h2>Emergency Request</h2>
                <p>AI-powered emergency response system</p>
            </div>

            <form onSubmit={submitEmergencyRequest} className="emergency-form">
                <div className="location-section">
                    <div className="location-header">
                        <MapPin className="location-icon" />
                        <h3>Your Location</h3>
                    </div>
                    
                    {location.lat && location.lon ? (
                        <div className="location-display">
                            <p className="coordinates">
                                📍 {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
                            </p>
                            <p className="address">{address}</p>
                            <button 
                                type="button" 
                                onClick={getCurrentLocation}
                                className="update-location-btn"
                            >
                                Update Location
                            </button>
                        </div>
                    ) : (
                        <div className="location-error">
                            <p>{locationError || 'Getting your location...'}</p>
                            <button 
                                type="button" 
                                onClick={getCurrentLocation}
                                className="get-location-btn"
                            >
                                Get My Location
                            </button>
                            <div className="manual-location-inputs" style={{ marginTop: '15px', borderTop: '1px solid #444', paddingTop: '10px' }}>
                                <p style={{ margin: '5px 0', fontSize: '0.9em', color: '#888' }}>Or enter coordinates manually:</p>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                                    <input 
                                        type="number" 
                                        step="any" 
                                        placeholder="Latitude" 
                                        onChange={(e) => setLocation(prev => ({ ...prev, lat: parseFloat(e.target.value) }))}
                                        className="form-field"
                                        style={{ flex: 1, padding: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff' }}
                                    />
                                    <input 
                                        type="number" 
                                        step="any" 
                                        placeholder="Longitude" 
                                        onChange={(e) => setLocation(prev => ({ ...prev, lon: parseFloat(e.target.value) }))}
                                        className="form-field"
                                        style={{ flex: 1, padding: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff' }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="message-section">
                    <label htmlFor="emergency-message">
                        <h3>Describe Your Emergency</h3>
                        <p>Be specific about what's happening, injuries, and immediate needs</p>
                    </label>
                    <textarea
                        id="emergency-message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Example: Building collapsed after earthquake, trapped on 3rd floor, need rescue team and medical assistance..."
                        rows={4}
                        maxLength={500}
                        required
                    />
                    <div className="char-count">
                        {message.length}/500 characters
                    </div>
                </div>

                <button 
                    type="submit" 
                    className="submit-emergency-btn"
                    disabled={isSubmitting || !location.lat || !location.lon}
                >
                    {isSubmitting ? (
                        <>
                            <div className="spinner"></div>
                            Processing Emergency...
                        </>
                    ) : (
                        <>
                            <Send className="send-icon" />
                            Submit Emergency Request
                        </>
                    )}
                </button>
            </form>

            <div className="emergency-info">
                <h4>How Our AI Emergency System Works:</h4>
                <ol>
                    <li>📍 <strong>Location Analysis:</strong> We analyze your GPS coordinates and get real-time satellite data</li>
                    <li>🤖 <strong>AI Assessment:</strong> Our AI determines disaster type, severity, and required resources</li>
                    <li>📦 <strong>Resource Allocation:</strong> We automatically select and reserve needed supplies</li>
                    <li>🚛 <strong>Smart Routing:</strong> Optimal routes are calculated for fastest response</li>
                    <li>⏱️ <strong>Real-time Updates:</strong> Track your emergency status in real-time</li>
                </ol>
            </div>
        </div>
    );
};

export default EmergencyRequest;