'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useBranding } from '@/contexts/BrandingContext';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const [identity, setIdentity] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'identity' | 'otp'>('identity');
  const [maskedContact, setMaskedContact] = useState('');
  const [verifiedIdentity, setVerifiedIdentity] = useState('');
  const { appName, appLogo } = useBranding();
  const router = useRouter();

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanIdentity = identity.trim();
    if (!cleanIdentity) {
      toast.error('Enter your index number or registered phone number');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { identity: cleanIdentity });
      if (res.data.success) {
        setMaskedContact(res.data.contact || 'your registered phone');
        setVerifiedIdentity(res.data.identity || cleanIdentity);
        setStep('otp');
        toast.success('Verification code sent');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to request verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', {
        identity: verifiedIdentity || identity.trim(),
        otp,
      });
      if (res.data.success) {
        toast.success('Code verified');
        router.push(`/reset-password?token=${res.data.resetToken}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid verification code');
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
          <p className="mt-2 text-sm text-gray-600">Student Password Recovery</p>
        </div>

        <div className="card space-y-6">
          {step === 'identity' ? (
            <form onSubmit={handleRequestOTP} className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-primary">Reset your password</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Enter either your index number or the phone number registered on your student account.
                </p>
              </div>

              <div>
                <label className="label">Index Number or Phone Number</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Example: STD/ICT/26/001 or 0244123456"
                  value={identity}
                  onChange={e => setIdentity(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-2">
                  The reset code will be sent to the phone number already saved on your student profile.
                </p>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Sending code...' : 'Send Verification Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-primary">Enter verification code</h1>
                <p className="text-sm text-gray-600 mt-1">
                  We sent a 6-digit code to <span className="font-semibold text-primary">{maskedContact}</span>.
                </p>
              </div>

              <div>
                <label className="label">Verification Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  className="input-field text-center text-2xl tracking-[0.4em] font-bold"
                  placeholder="------"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <button type="submit" disabled={loading || otp.length < 6} className="btn-primary w-full disabled:opacity-60">
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('identity'); setOtp(''); }}
                className="btn-outline w-full"
              >
                Use different details
              </button>
            </form>
          )}

          <div className="pt-2 border-t text-center text-sm">
            <Link href="/login" className="text-primary hover:underline font-medium">
              Return to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
