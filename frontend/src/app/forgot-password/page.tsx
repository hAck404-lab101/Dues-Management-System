'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useBranding } from '@/contexts/BrandingContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { LockClosedIcon, CheckCircleIcon } from '@/components/Icons';

export default function ForgotPasswordPage() {
  const { appName } = useBranding();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toast.error('Please enter your email or index number');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { identifier: identifier.trim() });
      if (res.data?.success) {
        setSubmitted(true);
        toast.success(res.data?.message || 'Password reset instructions sent');
      } else {
        toast.error(res.data?.message || 'Could not process request');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send reset link. Please contact system administrator.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral flex flex-col justify-between">
      <Navbar />
      <main className="container mx-auto px-4 py-12 flex-1 flex items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8 space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <span className="w-7 h-7"><LockClosedIcon /></span>
            </div>
            <h1 className="text-2xl font-extrabold text-primary">Forgot Password?</h1>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Enter your registered Index Number or Email address and we will send password reset instructions to your phone or email.
            </p>
          </div>

          {submitted ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center space-y-4">
              <div className="w-12 h-12 text-green-600 mx-auto">
                <CheckCircleIcon />
              </div>
              <h2 className="font-bold text-green-900 text-lg">Request Received</h2>
              <p className="text-sm text-green-800 leading-relaxed">
                If an account matches <span className="font-semibold">{identifier}</span>, reset instructions have been sent via SMS / Email.
              </p>
              <p className="text-xs text-gray-500">
                You can also contact your department financial administrator or system manager directly for an immediate credential reset.
              </p>
              <div className="pt-2">
                <Link href="/login" className="btn-primary w-full inline-block text-center">
                  Return to Login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Index Number or Email Address *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. 10023456 or student@example.com"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 font-bold"
              >
                {loading ? 'Sending...' : 'Send Reset Instructions'}
              </button>

              <div className="text-center text-sm pt-2">
                <Link href="/login" className="text-primary hover:underline font-semibold">
                  ← Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} {appName}. All rights reserved.
      </footer>
    </div>
  );
}
