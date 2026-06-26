import Cookies from 'js-cookie';
import api from './api';

export interface User {
  id: string;
  email: string;
  role: string;
  studentId?: string;
  isActive?: boolean;
  mustChangePassword?: boolean;
  permissions?: string[];
  student?: {
    id: string;
    fullName: string;
    level: number;
    programme: string;
    academicYear: string;
    phoneNumber?: string;
  };
}


export const login = async (emailOrIndexNumber: string, password: string) => {
  const isEmail = emailOrIndexNumber.includes('@');
  const payload = isEmail
    ? { email: emailOrIndexNumber, password }
    : { indexNumber: emailOrIndexNumber, password };

  try {
    const response = await api.post('/auth/login', payload);
    if (response.data.success) {
      Cookies.set('token', response.data.token, { expires: 7, path: '/' });
      return response.data;
    }
    throw new Error(response.data.message || 'Login failed');
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.message || 'Login failed');
  }
};

export const adminLogin = async (email: string, password: string) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.success) {
      Cookies.set('token', response.data.token, { expires: 7, path: '/' });
      return response.data;
    }
    throw new Error(response.data.message || 'Login failed');
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.message || 'Login failed');
  }
};



export const logout = () => {
  Cookies.remove('token', { path: '/' });
  // Clear all caches
  try {
    sessionStorage.removeItem('auth_user_cache');
    localStorage.removeItem('branding_cache');
  } catch { /* ignore */ }
  window.location.href = '/';
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const token = Cookies.get('token');
    if (!token) return null;

    const response = await api.get('/auth/me');
    if (response.data.success) {
      return response.data.user;
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const isAuthenticated = (): boolean => {
  return !!Cookies.get('token');
};

export const isAdmin = (user: User | null): boolean => {
  if (!user) return false;
  return ['admin', 'treasurer', 'financial_secretary', 'president'].includes(user.role);
};

export const isStudent = (user: User | null): boolean => {
  if (!user) return false;
  return user.role === 'student';
};
