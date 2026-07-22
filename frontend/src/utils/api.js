import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Proxy is needed in vite.config.js
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle Envelope format and errors
api.interceptors.response.use(
  (response) => {
    // If the backend returns an Envelope
    if (response.data && typeof response.data.success !== 'undefined') {
      if (response.data.success) {
        return response.data.data;
      } else {
        return Promise.reject(response.data.error || 'API Error');
      }
    }
    // Return direct data if it's not an Envelope
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    // If the error response is an Envelope
    if (error.response?.data && typeof error.response.data.success !== 'undefined') {
       return Promise.reject(error.response.data.error || 'API Error');
    }
    
    return Promise.reject(error.response?.data || error.message);
  }
);

export default api;
