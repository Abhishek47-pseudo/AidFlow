import React, { useState, useEffect, useContext } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { UserProvider, UserContext } from "./components/UserContext";

// 🧩 Common Layout Components
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";

// 🏠 Home and Core Components
import Hero from "./components/Hero.jsx";
import About from "./components/About.jsx";
import Services from "./components/Services.jsx";
import DisasterMapSection from "./components/DisasterMapSection.jsx";
import Team from "./components/Team.jsx";
import Contact from "./components/Contact.jsx";

// 🔐 Auth
import Register from "./components/Register.jsx";
import Login from "./components/Login.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

// 🏗️ Dashboard / Role Pages
import InventoryPage from "./components/InventoryPage.jsx";   // Admin
import VolunteerPage from "./components/VolunteerPage.jsx";   // Volunteer
import RefugeePage from "./components/RefugeePage.jsx";       // Refugee
import ReliefAnalytics from "./components/ReliefAnalytics.jsx"; // Analytics
import EmergencyRequest from "./components/EmergencyRequest.jsx"; // Emergency Request
import EmergencyDashboard from "./components/EmergencyDashboard.jsx"; // Emergency Dashboard
import InventoryIntegration from "./components/InventoryIntegration.jsx"; // Inventory Integration
import RoutingVisualization from "./components/RoutingVisualization.jsx"; // Routing Visualization
import DispatchTracker from "./components/DispatchTracker.jsx"; // Dispatch Tracker
import LiveDisasters from "./components/LiveDisasters.jsx"; // Live Disasters
import ImageReporting from "./components/ImageReporting.jsx"; // Image Reporting

// 🎨 CSS Imports
import "./css/style.css";
import "./css/page-spacing.css"; // Page spacing to prevent navbar overlap
import "./css/performance-optimizations.css"; // Performance improvements
import "./css/Header.css";
import "./css/Hero.css";
import "./css/About.css";
import "./css/Services.css";
import "./css/Team.css";
import "./css/Forms.css";
import "./css/Contact.css";
import "./css/Register.css";
import "./css/Login.css";
import "./css/DisasterMap.css";
import "./css/InventoryPage.css";
import "./css/ReliefAnalytics.css";
import "./css/Emergency.css";
import "./css/InventoryIntegration.css";
import "./css/RoutingVisualization.css";
import "./css/DispatchTracker.css";
import "./css/LiveDisasters.css";

/* 🏠 Home Page Component */
const Home = ({ predictionData, loading, error }) => {
  return (
    <main>
      <Hero />
      <About />
      <Services />
      {loading && <p className="loading-message">Loading map data...</p>}
      {error && <p className="error-message">{error}</p>}
      {!loading && !error && <DisasterMapSection predictionData={predictionData} />}
      <Team />
      <Contact />
    </main>
  );
};

/* 🌍 Main Application Content */
function AppContent() {
  const [predictionData, setPredictionData] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState(null);
  const { token } = useContext(UserContext);

  const location = useLocation();

  // 🧠 Fetch disaster prediction data (public endpoint - no authentication required)
  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/disaster-predictions", {
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error("Server error or bad response");
        }

        const data = await response.json();
        setPredictionData(data);
        setLoadingData(false);
        setErrorData(null);
      } catch (err) {
        console.error("Error fetching disaster prediction data:", err);
        setErrorData(
          err.message || "Failed to load disaster prediction data. Ensure backend is running on http://localhost:5000."
        );
        setLoadingData(false);
      }
    };

    fetchPredictions();
  }, []); // No dependency on token since this is a public endpoint

  // 🎞️ Section animation observer (runs ONLY on home route)
  useEffect(() => {
    if (location.pathname !== "/") return;
    const sections = document.querySelectorAll(".hidden-section");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible-section");
          }
        });
      },
      { threshold: 0.2 }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [location]);

  return (
    <div className="app-container">
      <Header />
      <div className={location.pathname === '/' ? '' : 'page-content-wrapper'}>
        <Routes>
          {/* Home */}
          <Route
            path="/"
            element={<Home predictionData={predictionData} loading={loadingData} error={errorData} />}
          />

          {/* Auth */}
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />

          {/* Admin & Branch Manager Dashboard - Inventory Management */}
          <Route
            path="/inventory"
            element={
              <ProtectedRoute requiredRole={['admin', 'branch manager', 'volunteer']}>
                <>
                  <InventoryPage />
                  <ReliefAnalytics />
                </>
              </ProtectedRoute>
            }
          />

          {/* Volunteer Dashboard */}
          <Route
            path="/volunteer"
            element={
              <ProtectedRoute requiredRole={['volunteer', 'admin']}>
                <VolunteerPage />
              </ProtectedRoute>
            }
          />

          {/* Refugee Dashboard */}
          <Route
            path="/refugee"
            element={
              <ProtectedRoute requiredRole={['refugee', 'admin']}>
                <RefugeePage />
              </ProtectedRoute>
            }
          />

          {/* Analytics - Admin & Branch Manager only */}
          <Route
            path="/analytics"
            element={
              <ProtectedRoute requiredRole={['admin', 'branch manager']}>
                <ReliefAnalytics />
              </ProtectedRoute>
            }
          />

          {/* Emergency Request - All authenticated users */}
          <Route
            path="/emergency"
            element={
              <ProtectedRoute>
                <EmergencyRequest userId="demo_user_123" />
              </ProtectedRoute>
            }
          />

          {/* Emergency Dashboard - Admin & Branch Manager only */}
          <Route
            path="/emergency-dashboard"
            element={
              <ProtectedRoute requiredRole={['admin', 'branch manager']}>
                <EmergencyDashboard />
              </ProtectedRoute>
            }
          />

          {/* Dispatch Tracker - Admin & Branch Manager only */}
          <Route
            path="/dispatch-tracker"
            element={
              <ProtectedRoute requiredRole={['admin', 'branch manager']}>
                <DispatchTracker />
              </ProtectedRoute>
            }
          />

          {/* Live Disasters - Admin, Branch Manager, Volunteer */}
          <Route
            path="/live-disasters"
            element={
              <ProtectedRoute requiredRole={['admin', 'branch manager', 'volunteer']}>
                <LiveDisasters />
              </ProtectedRoute>
            }
          />

          {/* Inventory Integration - Admin, Branch Manager, Volunteer */}
          <Route
            path="/inventory-live"
            element={
              <ProtectedRoute requiredRole={['admin', 'branch manager', 'volunteer']}>
                <InventoryIntegration />
              </ProtectedRoute>
            }
          />

          {/* Routing Visualization - Admin & Branch Manager only */}
          <Route
            path="/routing"
            element={
              <ProtectedRoute requiredRole={['admin', 'branch manager']}>
                <RoutingVisualization />
              </ProtectedRoute>
            }
          />

          {/* Image Reporting - All authenticated users */}
          <Route
            path="/image-report"
            element={
              <ProtectedRoute>
                <ImageReporting />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}

/* 🔑 Root App Component */
export default function App() {
  return (
    <Router>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </Router>
  );
}
