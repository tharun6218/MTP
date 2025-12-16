import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

