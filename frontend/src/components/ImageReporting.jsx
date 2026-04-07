import React, { useState, useEffect, useContext, useRef } from 'react';
import { Camera, Upload, MapPin, AlertTriangle, CheckCircle, Loader, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from './UserContext'; // Ensure this exists or adapt
import axios from 'axios';
import '../css/ImageReporting.css';

const ImageReporting = () => {
    const navigate = useNavigate();
    // Use context if available, otherwise mock or default
    const userContext = useContext(UserContext);
    const token = userContext?.token || localStorage.getItem('token');
    const userId = userContext?.userId || localStorage.getItem('userId') || 'guest_user';

    const [selectedImage, setSelectedImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [location, setLocation] = useState(null);
    const [locationStatus, setLocationStatus] = useState('detecting'); // detecting, success, error
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [successData, setSuccessData] = useState(null);
    const [error, setError] = useState(null);

    const fileInputRef = useRef(null);

    useEffect(() => {
        // Auto-detect location on mount
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    });
                    setLocationStatus('success');
                },
                (err) => {
                    console.error("Location error:", err);
                    setLocationStatus('error');
                    setError("Could not detect location. Please enable GPS permissions.");
                },
                { enableHighAccuracy: true }
            );
        } else {
            setLocationStatus('error');
            setError("Geolocation is not supported by your browser.");
        }
    }, []);

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            processFile(file);
        }
    };

    const processFile = (file) => {
        // Create preview
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);

        // Convert to Base64
        const reader = new FileReader();
        reader.onloadend = () => {
            setSelectedImage(reader.result); // This is the base64 string
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedImage || !location) {
            setError("Please provide an image and ensure location is detected.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const api = axios.create({
                baseURL: 'http://localhost:5000',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const payload = {
                imageData: selectedImage,
                location: {
                    lat: location.lat,
                    lon: location.lon,
                    address: "Detected Location" // You could reverse geocode here if needed
                },
                userId: userId,
                message: message
            };

            const response = await api.post('/api/emergency/request-with-image', payload);

            if (response.data.success) {
                setSuccessData(response.data);
            }
        } catch (err) {
            console.error("Submission error:", err);
            setError(err.response?.data?.error || "Failed to submit report. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Render Success Screen
    if (successData) {
        const { emergency, detection } = successData;
        const analysis = emergency.aiAnalysis;

        return (
            <div className="image-reporting-container">
                <div className="reporting-card success-container">
                    <div className="success-icon">
                        <CheckCircle size={48} />
                    </div>
                    <h1>Report Submitted!</h1>
                    <p>Emergency ID: {emergency.emergencyId}</p>

                    <div className="result-card">
                        <div className="result-row">
                            <span className="result-label">Detected Disaster</span>
                            <span className="result-value" style={{ textTransform: 'capitalize' }}>
                                {analysis.disaster.type}
                            </span>
                        </div>
                        <div className="result-row">
                            <span className="result-label">Confidence</span>
                            <span className="result-value">
                                {Math.round(analysis.disaster.confidence * 100)}%
                            </span>
                        </div>
                        <div className="result-row">
                            <span className="result-label">Severity</span>
                            <span className={`severity-badge severity-${analysis.severity}`}>
                                {analysis.severity}
                            </span>
                        </div>
                        <div className="result-row">
                            <span className="result-label">Status</span>
                            <span className="result-value" style={{ color: '#3b82f6' }}>
                                {emergency.status === 'dispatched' ? 'Resources Dispatched 🚀' : 'Under Review 📋'}
                            </span>
                        </div>
                        {detection.combinedAnalysis.corroboration.length > 0 && (
                            <div className="result-row">
                                <span className="result-label">Satellite Verify</span>
                                <span className="result-value" style={{ color: '#34d399' }}>confirmed</span>
                            </div>
                        )}
                    </div>

                    <button className="back-btn" onClick={() => navigate('/dashboard')}>
                        Return to Dashboard
                    </button>
                    &nbsp;
                    <button className="back-btn" onClick={() => {
                        setSuccessData(null);
                        setSelectedImage(null);
                        setPreviewUrl(null);
                        setMessage('');
                    }}>
                        Report Another
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="image-reporting-container">
            <div className="reporting-card">
                <div className="reporting-header">
                    <h1>📸 AI Visual Report</h1>
                    <p>Upload a photo to detect disasters and request aid automatically.</p>
                </div>

                <div
                    className="upload-section"
                    onClick={() => fileInputRef.current.click()}
                >
                    {previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="preview-image" />
                    ) : (
                        <div className="upload-content">
                            <Camera className="upload-icon" />
                            <h3>Tap to Capture or Upload</h3>
                            <p>Support for JPG, PNG</p>
                        </div>
                    )}
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden-input"
                        accept="image/*"
                        capture="environment" // Opens camera on mobile
                        onChange={handleImageSelect}
                    />
                </div>

                <div className={`location-status ${locationStatus}`}>
                    {locationStatus === 'detecting' && (
                        <>
                            <Loader className="animate-spin" size={16} />
                            <span>Detecting Location...</span>
                        </>
                    )}
                    {locationStatus === 'success' && (
                        <>
                            <MapPin size={16} />
                            <span>Location Detected ({location.lat.toFixed(4)}, {location.lon.toFixed(4)})</span>
                        </>
                    )}
                    {locationStatus === 'error' && (
                        <>
                            <AlertTriangle size={16} />
                            <span>Location Failed</span>
                        </>
                    )}
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Additional Details (Optional)</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Describe the situation..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="error-message" style={{ color: '#ef4444', marginBottom: '16px', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={loading || !selectedImage || !location}
                    >
                        {loading ? (
                            <>
                                <Loader className="animate-spin" />
                                <span>Analyzing Image...</span>
                            </>
                        ) : (
                            <>
                                <Upload size={20} />
                                <span>Analyze & Report</span>
                            </>
                        )}
                    </button>
                </form>

                <button className="back-btn" style={{ marginTop: '10px', width: '100%', border: 'none' }} onClick={() => navigate('/dashboard')}>
                    <ArrowLeft size={16} style={{ display: 'inline', marginRight: '5px' }} /> Cancel
                </button>
            </div>
        </div>
    );
};

export default ImageReporting;
