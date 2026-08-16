import axios from 'axios';
import Cookies from 'js-cookie';

const PRODUCTION_API_URL = 'https://dues-management-system-production.up.railway.app/api';

const configuredApiUrl = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/$/, '');
const developmentApiUrl = configuredApiUrl || 'http://localhost:5003/api';

// In production, always target the live Railway API we deploy from this repo.
// This prevents stale Vercel NEXT_PUBLIC_API_URL values from pointing the UI at
// an older backend where newer routes/fixes do not exist.
const rawApiUrl = process.env.NODE_ENV === 'production'
  ? PRODUCTION_API_URL
  : developmentApiUrl;

const API_URL = /\/api$/i.test(rawApiUrl) ? rawApiUrl : `${rawApiUrl}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect on 401 if we're on login pages
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const isLoginPath = window.location.pathname === '/login' || window.location.pathname === '/admin/login';

      if (!isLoginPath) {
        Cookies.remove('token');
        // Redirect to admin login if we were in admin section, else student login
        if (window.location.pathname.startsWith('/admin')) {
          window.location.href = '/admin/login';
        } else {
          window.location.href = '/login';
        }
      }
    }

    // Keep the actual backend failure available to callers and browser devtools.
    if (error.response) {
      const backendMessage = error.response?.data?.message;
      if (backendMessage) error.message = backendMessage;
      console.error('API request failed', {
        method: error.config?.method,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        status: error.response?.status,
        message: backendMessage || error.message,
      });
    } else {
      error.message = 'Network error. Please check your connection and ensure the backend server is running.';
      console.error('API network error', {
        method: error.config?.method,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        message: error.message,
      });
    }

    return Promise.reject(error);
  }
);

export default api;
