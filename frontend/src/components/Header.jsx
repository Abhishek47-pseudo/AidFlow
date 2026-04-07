import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserContext } from './UserContext';
import { canAccessRoute, hasPermission, PERMISSIONS, ROLES } from '../utils/rbac';

const Header = () => {
  const { isAuthenticated, userRole, logout } = useContext(UserContext);
  const [isNavActive, setIsNavActive] = useState(false);
  const [theme, setTheme] = useState('dark');
  const navigate = useNavigate();

  // ✅ Apply saved theme on first load
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.body.className = savedTheme;
  }, []);

  // ✅ Toggle navbar visibility (mobile)
  const handleNavToggle = () => setIsNavActive(!isNavActive);

  // ✅ Toggle between light/dark mode
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.body.className = newTheme;
    localStorage.setItem('theme', newTheme);
  };

  // ✅ Smooth scroll to section (after navigating home)
  const handleScroll = (id) => {
    navigate('/');
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
    setIsNavActive(false);
  };

  return (
    <header className="header">
      <div className="container header-container">

        {/* --- Left Section: Logo --- */}
        <Link to="/" className="logo">
          <img
            src="/imgs/AidFlow Logo.png"
            alt="AidFlow AI Logo"
            className="logo-img"
          />
          <span className="logo-text">AidFlow AI</span>
        </Link>

        {/* --- Center Section: Main Nav Links --- */}
        <nav className={`nav centered-nav ${isNavActive ? 'active' : ''}`}>
          <ul className="nav-list">
            <li><button onClick={() => handleScroll('about')} className="nav-link">About</button></li>
            <li><button onClick={() => handleScroll('services')} className="nav-link">Services</button></li>
            <li><Link to="/emergency" className="nav-link emergency-link">🚨 Emergency</Link></li>
            <li><Link to="/image-report" className="nav-link emergency-link" style={{ marginLeft: '10px' }}>📸 Visual</Link></li>
            <li><button onClick={() => handleScroll('team')} className="nav-link">Team</button></li>
            <li><button onClick={() => handleScroll('contact')} className="nav-link">Contact</button></li>
          </ul>
        </nav>

        {/* --- Right Section: Auth & Theme Toggle --- */}
        <nav className={`nav right-nav ${isNavActive ? 'active' : ''}`}>
          <ul className="nav-list">
            {/* Emergency Operations Dropdown - Role-based visibility */}
            {(canAccessRoute(userRole, '/emergency-dashboard') ||
              canAccessRoute(userRole, '/dispatch-tracker') ||
              canAccessRoute(userRole, '/live-disasters') ||
              canAccessRoute(userRole, '/inventory-live') ||
              canAccessRoute(userRole, '/routing')) && (
                <li className="auth-dropdown">
                  <span className="nav-link">🚨 Emergency Operations</span>
                  <div className="dropdown-menu">
                    {canAccessRoute(userRole, '/emergency-dashboard') && (
                      <Link to="/emergency-dashboard" className="dropdown-item">⚡ Emergency Dashboard</Link>
                    )}
                    {canAccessRoute(userRole, '/dispatch-tracker') && (
                      <Link to="/dispatch-tracker" className="dropdown-item">📍 Dispatch Tracker</Link>
                    )}
                    {canAccessRoute(userRole, '/live-disasters') && (
                      <Link to="/live-disasters" className="dropdown-item">🌍 Live Disasters</Link>
                    )}
                    {canAccessRoute(userRole, '/inventory-live') && (
                      <Link to="/inventory-live" className="dropdown-item">📦 Live Inventory</Link>
                    )}
                    {canAccessRoute(userRole, '/routing') && (
                      <Link to="/routing" className="dropdown-item">🗺️ Smart Routing</Link>
                    )}
                  </div>
                </li>
              )}

            {/* Role-based Dashboard Links */}
            {isAuthenticated && (
              <li className="auth-dropdown">
                <span className="nav-link">Dashboard</span>
                <div className="dropdown-menu">
                  {canAccessRoute(userRole, '/inventory') && (
                    <Link to="/inventory" className="dropdown-item">📊 Inventory Management</Link>
                  )}
                  {canAccessRoute(userRole, '/volunteer') && (
                    <Link to="/volunteer" className="dropdown-item">🤝 Volunteer Portal</Link>
                  )}
                  {canAccessRoute(userRole, '/refugee') && (
                    <Link to="/refugee" className="dropdown-item">📋 Refugee Portal</Link>
                  )}
                  {canAccessRoute(userRole, '/analytics') && (
                    <Link to="/analytics" className="dropdown-item">📈 Analytics</Link>
                  )}
                </div>
              </li>
            )}

            {/* Account Dropdown */}
            <li className="auth-dropdown">
              <span className="nav-link">
                {isAuthenticated ? `${userRole || 'User'}` : 'Account'}
              </span>
              <div className="dropdown-menu">
                {!isAuthenticated ? (
                  <>
                    <Link to="/login" className="dropdown-item">Login</Link>
                    <Link to="/register" className="dropdown-item">Register</Link>
                  </>
                ) : (
                  <>
                    <span className="dropdown-item" style={{ color: '#666', fontSize: '0.9em' }}>
                      Role: {userRole}
                    </span>
                    <button
                      onClick={() => { logout(); navigate('/'); }}
                      className="dropdown-item"
                      style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                    >
                      Logout
                    </button>
                  </>
                )}
              </div>
            </li>

            <li>
              <button
                onClick={toggleTheme}
                className="theme-toggle"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
            </li>
          </ul>
        </nav>

        {/* --- Mobile Nav Toggle Button --- */}
        <button
          className="nav-toggle"
          aria-label="Toggle navigation"
          onClick={handleNavToggle}
        >
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </button>
      </div>
    </header>
  );
};

export default Header;
