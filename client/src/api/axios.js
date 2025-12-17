import axios from 'axios';

// Get API URL from multiple sources (priority order):
// 1. Runtime config (window.APP_CONFIG) - for deployed apps
// 2. Environment variable (REACT_APP_API_URL) - for build-time config
// 3. Default to localhost for development
const getApiUrl = () => {
  // Check runtime config (set in public/config.js or via window.APP_CONFIG)
  if (window.APP_CONFIG?.API_URL && !window.APP_CONFIG.API_URL.includes('localhost')) {
    return window.APP_CONFIG.API_URL;
  }
  
  // Check environment variable (set at build time)
  if (process.env.REACT_APP_API_URL && !process.env.REACT_APP_API_URL.includes('localhost')) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Default to localhost for local development
  return 'http://localhost:5000';
};

const api = axios.create({
  baseURL: getApiUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Log the API URL being used (helpful for debugging)
console.log('API Base URL:', api.defaults.baseURL);

// Add session token to requests if available
api.interceptors.request.use(
  (config) => {
    const sessionToken = localStorage.getItem('sessionToken');
    if (sessionToken) {
      config.headers['x-session-token'] = sessionToken;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;

