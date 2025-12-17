import axios from 'axios';

// Get API URL from multiple sources (priority order):
// 1. Runtime config (window.APP_CONFIG) - for deployed apps
// 2. Environment variable (REACT_APP_API_URL) - for build-time config
// 3. Auto-detect from current hostname
// 4. Default to localhost for development
const getApiUrl = () => {
  // Check if we're on a deployed domain (not localhost)
  const hostname = window.location.hostname;
  const isDeployed = !hostname.includes('localhost') && !hostname.includes('127.0.0.1');
  
  // Priority 1: Runtime config (set in index.html)
  if (window.APP_CONFIG?.API_URL && !window.APP_CONFIG.API_URL.includes('localhost')) {
    return window.APP_CONFIG.API_URL;
  }
  
  // Priority 2: Environment variable (set at build time)
  if (process.env.REACT_APP_API_URL && !process.env.REACT_APP_API_URL.includes('localhost')) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Priority 3: Auto-detect from current hostname (for deployed sites)
  if (isDeployed) {
    // If on Render, construct backend URL
    if (hostname.includes('onrender.com')) {
      // Extract service name or use default
      // You can customize this based on your Render service names
      return 'https://mtp-9e6g.onrender.com'; // Update with your actual backend URL
    }
    // For other deployments, try to construct from current origin
    // This is a fallback - should be overridden by env vars
    console.warn('Deployed site detected but no API URL configured. Using default.');
  }
  
  // Priority 4: Default to localhost for local development
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

// Handle errors, especially ERR_BLOCKED_BY_CLIENT (ad blockers)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ERR_BLOCKED_BY_CLIENT' || error.message?.includes('blocked')) {
      console.error('🚫 Request blocked by browser extension or ad blocker');
      console.error('💡 Solution: Disable ad blockers/extensions for this site');
      error.userMessage = 'Request blocked. Please disable ad blockers or browser extensions and try again.';
    }
    return Promise.reject(error);
  }
);

export default api;

