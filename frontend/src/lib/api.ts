import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api';

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
    if (error.response?.status === 401) {
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

    // Improve error messages
    if (!error.response) {
      error.message = 'Network error. Please check your connection and ensure the backend server is running.';
    }

    return Promise.reject(error);
  }
);

export default api;

