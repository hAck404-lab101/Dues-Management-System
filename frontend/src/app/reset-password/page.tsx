'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useBranding } from '@/contexts/BrandingContext';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { appName, appLogo } = useBranding();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('Invalid or missing reset token');
      router.push('/forgot-password');
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: form.password });
      toast.success('Password reset successfully');
      router.push('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Reset failed. Session may have expired.');
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          )}
          <h2 className="text-3xl font-extrabold text-primary">{appName}</h2>
          <p className="mt-2 text-sm text-gray-600">Create New Password</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          <div>
            <h1 className="text-xl font-bold text-primary">Set a new password</h1>
            <p className="text-sm text-gray-600 mt-1">Choose a new password for your student account.</p>
          </div>

          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              required
              className="input-field"
              placeholder="Minimum 6 characters"
              value={form.password}
              onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Confirm Password</label>
            <input
              type="password"
              required
              className="input-field"
              placeholder="Repeat new password"
              value={form.confirm}
              onChange={e => setForm(prev => ({ ...prev, confirm: e.target.value }))}
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Updating password...' : 'Update Password'}
          </button>

          <div className="pt-2 border-t text-center text-sm">
            <Link href="/login" className="text-primary hover:underline font-medium">
              Cancel and return to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
