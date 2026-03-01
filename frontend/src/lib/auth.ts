import Cookies from 'js-cookie';
import api from './api';

export interface User {
  id: string;
  email: string;
  role: string;
  studentId?: string;
  student?: {
    id: string;
    fullName: string;
    level: number;
    programme: string;
    academicYear: string;
  };
}

export const login = async (emailOrIndexNumber: string, password: string) => {
  // Determine if it's an email or index number
  const isEmail = emailOrIndexNumber.includes('@');
  const payload = isEmail
    ? { email: emailOrIndexNumber, password }
    : { indexNumber: emailOrIndexNumber, password };


  try {
    const response = await api.post('/auth/login', payload);
    if (response.data.success) {
      Cookies.set('token', response.data.token, { expires: 7 });
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
      Cookies.set('token', response.data.token, { expires: 7 });
      return response.data;
    }
    throw new Error(response.data.message || 'Login failed');
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.message || 'Login failed');
  }
};

export const register = async (data: {
  indexNumber: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  password: string;
  programme: string;
  academicYear: string;
}) => {
  try {
    const response = await api.post('/auth/register', data);
    if (response.data.success) {
      Cookies.set('token', response.data.token, { expires: 7 });
      return response.data;
    }
    throw new Error(response.data.message || 'Registration failed');
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.message || 'Registration failed');
  }
};

export const logout = () => {
  Cookies.remove('token');
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

