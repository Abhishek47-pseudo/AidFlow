import React, { createContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';

// Define the shape of the context state and functions
export const UserContext = createContext({
  isAuthenticated: false,
  userRole: null,
  userId: null,
  token: null,
  login: () => {},
  logout: () => {},
});

/**
 * Provider component that holds the authentication state and logic.
 */
export const UserProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const isAuthenticated = !!token;

  // Function to decode a token and set user state
  const decodeAndSetUser = useCallback((jwt) => {
    try {
      if (!jwt) {
        setUserRole(null);
        setUserId(null);
        return;
      }
      const decoded = jwtDecode(jwt);
      
      // Check if token is expired
      const currentTime = Date.now() / 1000;
      if (decoded.exp && decoded.exp < currentTime) {
        console.warn("Authentication token is expired. Clearing session.");
        setUserRole(null);
        setUserId(null);
        setToken(null);
        localStorage.removeItem('userToken');
        return;
      }
      
      // Ensure the role property exists and is a valid string
      const role = decoded.role || 'viewer'; 
      
      setUserRole(role.toLowerCase());
      setUserId(decoded.id);
    } catch (error) {
      console.error("Failed to decode token:", error);
      // Clear state on invalid token
      setUserRole(null);
      setUserId(null);
      setToken(null);
      localStorage.removeItem('userToken');
    }
  }, []);

  // Handler for successful login/registration
  const login = useCallback((jwt, role) => {
    // Store token securely (using localStorage for simplicity here)
    localStorage.setItem('userToken', jwt);
    setToken(jwt);
    decodeAndSetUser(jwt); // Decode and set all user details (ID and Role)
    
  }, [decodeAndSetUser]);

  // Handler for logout
  const logout = useCallback(() => {
    localStorage.removeItem('userToken');
    setToken(null);
    setUserRole(null);
    setUserId(null);
    // Optionally redirect user after logout, e.g., navigate('/');
  }, []);

  // Effect to initialize state from local storage on load
  useEffect(() => {
    const storedToken = localStorage.getItem('userToken');
    if (storedToken) {
      setToken(storedToken);
      decodeAndSetUser(storedToken);
    }
  }, [decodeAndSetUser]);

  const contextValue = {
    isAuthenticated,
    userRole,
    userId,
    token,
    login,
    logout,
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};
