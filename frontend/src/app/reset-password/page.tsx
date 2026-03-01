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
            toast.success('Password reset successfully!');
            setTimeout(() => {
                router.push('/login');
            }, 1000);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Reset failed. Session may have expired.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] px-4 py-12 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-5%] right-[-5%] w-[35%] h-[35%] bg-primary/5 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-[-5%] left-[-5%] w-[35%] h-[35%] bg-secondary/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1.5s' }}></div>
            </div>

            <div className="w-full max-w-lg z-10 transition-all duration-700">
                <div className="text-center mb-10">
                    {appLogo ? (
                        <div className="relative inline-block mb-6">
                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 animate-pulse"></div>
                            <img
                                src={appLogo.startsWith('http') ? appLogo : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${appLogo}`}
                                alt="Logo"
                                className="relative h-20 w-auto mx-auto drop-shadow-xl"
                            />
                        </div>
                    ) : (
                        <div className="w-16 h-16 bg-gradient-to-tr from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl rotate-3">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                    )}
                    <h1 className="text-3xl font-black text-primary tracking-tight mb-2 uppercase italic">{appName}</h1>
                    <p className="text-gray-500 font-bold tracking-widest uppercase text-[9px] bg-white px-4 py-1.5 rounded-full shadow-sm inline-block border border-gray-100">Reset Credentials</p>
                </div>

                <div className="bg-white/80 backdrop-blur-2xl border border-white/50 p-10 rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.06)] relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-secondary to-primary opacity-90"></div>

                    <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000">
                        <div className="mb-10 text-center">
                            <h2 className="text-3xl font-black text-gray-800 mb-2">Create New Password</h2>
                            <p className="text-gray-400 text-sm font-medium">Please enter a highly secure password to protect your account</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter ml-1">New Password</label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-300 group-focus-within/input:text-primary transition-colors">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        </div>
                                        <input
                                            type="password"
                                            required
                                            className="w-full bg-gray-50/30 border border-gray-100 focus:border-primary focus:ring-[10px] focus:ring-primary/5 rounded-[1.5rem] py-5 pl-14 pr-4 outline-none transition-all font-medium text-gray-700"
                                            placeholder="Enter strong password"
                                            value={form.password}
                                            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter ml-1">Confirm Password</label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-300 group-focus-within/input:text-secondary transition-colors">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                            </svg>
                                        </div>
                                        <input
                                            type="password"
                                            required
                                            className="w-full bg-gray-50/30 border border-gray-100 focus:border-secondary focus:ring-[10px] focus:ring-secondary/5 rounded-[1.5rem] py-5 pl-14 pr-4 outline-none transition-all font-medium text-gray-700"
                                            placeholder="Repeat password"
                                            value={form.confirm}
                                            onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-primary to-primary-dark text-white font-black py-5 rounded-[1.5rem] shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all transform flex items-center justify-center gap-3 group/btn cursor-pointer"
                            >
                                {loading ? (
                                    <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <>
                                        Update Password
                                        <svg className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </>
                                )}
                            </button>

                            <div className="pt-4 text-center">
                                <Link href="/login" className="text-gray-400 hover:text-primary font-bold text-sm transition-colors duration-300">
                                    Cancel and return to login
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="mt-12 text-center animate-in fade-in duration-1000 delay-500">
                    <p className="text-gray-400/80 text-[10px] uppercase font-black tracking-[4px]">
                        Secure Encryption • UCC Dues System
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#f8fafc]"><div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>}>
            <ResetPasswordForm />
        </Suspense>
    );
}
