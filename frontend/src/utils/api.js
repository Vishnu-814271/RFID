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
    // Automatically trigger app-wide refresh on any successful mutating action
    const method = response.config?.method?.toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const url = response.config?.url || '';
      // Don't trigger on auth login/forgot-password to avoid unnecessary refreshes
      if (!url.includes('/auth/login') && !url.includes('/auth/forgot-password')) {
        window.dispatchEvent(new CustomEvent('app:data-changed'));
      }
    }

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
