'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminLogin, User } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import toast from 'react-hot-toast';

export default function AdminLoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const { appName, appLogo } = useBranding();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await adminLogin(formData.email, formData.password);
      // Check if user is actually an admin
      if (result.user && ['admin', 'treasurer', 'financial_secretary', 'president'].includes(result.user.role)) {
        setUser(result.user);
        toast.success('Login successful!');
        // Use window.location.href for a full refresh to ensure all context reflects the new session
        window.location.href = '/admin/dashboard';
      } else {
        toast.error('Access denied. Admin credentials required.');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.response) {
        toast.error(error.response.data?.message || 'Login failed');
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error('Network error. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {appLogo ? (
            <img
              src={appLogo.startsWith('http') ? appLogo : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${appLogo}`}
              alt="Logo"
              className="mx-auto h-20 w-auto mb-4 drop-shadow-lg"
            />
          ) : (
            <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl mb-4">
              <svg className="w-10 h-10 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          )}
          <h2 className="text-3xl font-extrabold text-primary">
            {appName}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Admin Portal Login
          </p>
        </div>
        <form className="mt-8 space-y-6 card" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="label">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input-field"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input-field"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center text-sm">
            <Link href="/" className="text-primary hover:underline">
              Back to Home
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

