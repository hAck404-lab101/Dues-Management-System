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
    const { appName, appLogo } = useBranding();
    const router = useRouter();

    const handleRequestOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Identity can be index number or phone number
            const payload = identity.includes('@') ? { email: identity } : identity.match(/^\d+$/) ? { phoneNumber: identity } : { indexNumber: identity };
            const res = await api.post('/auth/forgot-password', payload);
            if (res.data.success) {
                setMaskedContact(res.data.contact || 'your registered phone');
                setStep('otp');
                toast.success('OTP sent successfully!');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to request OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/auth/verify-otp', { identity, otp });
            if (res.data.success) {
                toast.success('OTP verified!');
                // Redirect to reset password page with the token
                router.push(`/reset-password?token=${res.data.resetToken}`);
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] px-4 py-12 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="w-full max-w-lg z-10">
                <div className="text-center mb-10 transition-all duration-700 ease-out transform">
                    {appLogo ? (
                        <div className="relative inline-block mb-6">
                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 animate-pulse"></div>
                            <img
                                src={appLogo.startsWith('http') ? appLogo : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${appLogo}`}
                                alt="Logo"
                                className="relative h-24 w-auto mx-auto drop-shadow-2xl"
                            />
                        </div>
                    ) : (
                        <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                            <svg className="w-12 h-12 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                    )}
                    <h1 className="text-4xl font-black text-primary tracking-tight mb-2 uppercase italic">{appName}</h1>
                    <p className="text-gray-500 font-medium tracking-wide uppercase text-[10px] bg-white px-3 py-1 rounded-full shadow-sm inline-block">Security & Recovery Center</p>
                </div>

                <div className="bg-white/70 backdrop-blur-xl border border-white/40 p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-primary to-secondary animate-shimmer"></div>

                    {step === 'identity' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold text-gray-800 mb-2">Password Recovery</h2>
                                <p className="text-gray-500 text-sm">Enter your index number or registered phone number to receive a 6-digit verification code.</p>
                            </div>

                            <form onSubmit={handleRequestOTP} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 ml-1">Account Identity</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            className="w-full bg-gray-50/50 border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl py-4 pl-12 pr-4 outline-none transition-all placeholder:text-gray-300"
                                            placeholder="Index Number or Phone"
                                            value={identity}
                                            onChange={e => setIdentity(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-primary w-full py-4 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2 group/btn"
                                >
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Sending Request...
                                        </>
                                    ) : (
                                        <>
                                            Get Verification Code
                                            <svg className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="animate-in fade-in zoom-in duration-500">
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold text-gray-800 mb-2">Verify Identity</h2>
                                <p className="text-gray-500 text-sm">
                                    We've sent a 6-digit code to <span className="text-primary font-bold">{maskedContact}</span>.
                                    Please enter it below to continue.
                                </p>
                            </div>

                            <form onSubmit={handleVerifyOTP} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 ml-1">Verification Code (OTP)</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            maxLength={6}
                                            className="w-full bg-gray-50/50 border border-gray-200 focus:border-secondary focus:ring-4 focus:ring-secondary/10 rounded-2xl py-4 pl-12 pr-4 outline-none transition-all text-center text-2xl font-black tracking-[0.5em]"
                                            placeholder="------"
                                            value={otp}
                                            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || otp.length < 6}
                                    className="btn-primary w-full py-4 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all bg-gradient-to-r from-primary to-secondary border-none disabled:opacity-70"
                                >
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Verifying...
                                        </>
                                    ) : (
                                        'Verify & Continue'
                                    )}
                                </button>

                                <div className="text-center pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setStep('identity')}
                                        className="text-xs text-gray-400 hover:text-primary font-medium"
                                    >
                                        Didn't receive code? Try another identity
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="pt-8 mt-8 border-t border-gray-100 flex items-center justify-center">
                        <Link href="/login" className="text-gray-500 hover:text-primary font-bold text-sm flex items-center gap-1 group">
                            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Return to login
                        </Link>
                    </div>
                </div>

                <div className="mt-8 text-center animate-in fade-in duration-1000 delay-500">
                    <p className="text-gray-400 text-xs">
                        &copy; {new Date().getFullYear()} {appName}. Powered by Advanced Security.
                    </p>
                </div>
            </div>
        </div>
    );
}
