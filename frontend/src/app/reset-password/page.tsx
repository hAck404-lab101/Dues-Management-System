'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useBranding } from '@/contexts/BrandingContext';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { appName, appLogo } = useBranding();
  const [token, setToken] = useState('');
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get('token') || '';
    if (!resetToken) {
      toast.error('Invalid or missing reset token');
      router.push('/forgot-password');
      return;
    }
    setToken(resetToken);
    setCheckingToken(false);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return toast.error('Invalid or missing reset token');
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: form.password });
      toast.success('Password reset successfully');
      router.push('/login');
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
      toast.error(message || 'Reset failed. Session may have expired.');
    } finally { setLoading(false); }
  };

  if (checkingToken) return <div className="min-h-screen bg-neutral flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-neutral flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <div className="flex items-center justify-between text-sm">
          <Link href="/" className="text-primary font-semibold hover:underline">← Home</Link>
          <Link href="/login" className="text-primary font-semibold hover:underline">Login</Link>
        </div>

        <div className="text-center">
          {appLogo ? <img src={appLogo.startsWith('http') ? appLogo : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${appLogo}`} alt="Logo" className="mx-auto h-20 w-auto mb-4 drop-shadow-lg" /> : <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl mb-4"><svg className="w-10 h-10 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></div>}
          <h2 className="text-3xl font-extrabold text-primary">{appName}</h2>
          <p className="mt-2 text-sm text-gray-600">Create New Password</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          <div><h1 className="text-xl font-bold text-primary">Set a new password</h1><p className="text-sm text-gray-600 mt-1">Choose a new password for your student account.</p></div>
          <div><label className="label">New Password</label><input type="password" required className="input-field" placeholder="Minimum 6 characters" value={form.password} onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))} /></div>
          <div><label className="label">Confirm Password</label><input type="password" required className="input-field" placeholder="Repeat new password" value={form.confirm} onChange={e => setForm(prev => ({ ...prev, confirm: e.target.value }))} /></div>
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Updating password...' : 'Update Password'}</button>
          <div className="pt-2 border-t text-center text-sm"><Link href="/login" className="text-primary hover:underline font-medium">Cancel and return to login</Link></div>
        </form>
      </div>
    </div>
  );
}
