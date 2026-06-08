import axios from 'axios';

/**
 * API utility functions for making authenticated requests
 */

/**
 * Get authorization headers with JWT token
 * @param {string} token - JWT token from UserContext
 * @returns {Object} Headers object with Authorization if token exists
 */
export const getAuthHeaders = (token) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

/**
 * Create a fetch request with authentication
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options (method, body, etc.)
 * @param {string} token - JWT token
 * @returns {Promise<Response>} Fetch response
 */
export const authenticatedFetch = async (url, options = {}, token) => {
  const headers = getAuthHeaders(token);
  
  // Merge with existing headers
  const finalOptions = {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  };
  
  return fetch(url, finalOptions);
};

/**
 * Create an axios instance with token interceptor
 * This function returns an axios instance that automatically includes the token
 * @param {string} token - JWT token from UserContext
 * @returns {Object} Axios instance
 */
export const createAuthenticatedAxios = (token) => {
  const instance = axios.create({
    baseURL: 'http://localhost:5000',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor to add token
  instance.interceptors.request.use(
    (config) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Token expired or invalid
        console.error('Authentication failed. Please log in again.');
        localStorage.removeItem('userToken');
        window.location.reload();
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

