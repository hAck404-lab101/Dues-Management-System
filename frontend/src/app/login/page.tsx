'use client';

import { useState } from 'react';
import Link from 'next/link';
import { login } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { EyeIcon, EyeSlashIcon } from '@/components/Icons';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { setUser } = useAuth();
  const { appName, appLogo } = useBranding();
  const [formData, setFormData] = useState({ indexNumber: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login(formData.indexNumber, formData.password);
      setUser(res.user);
      toast.success('Login successful!');
      if (res.user && ['admin', 'treasurer', 'financial_secretary', 'president'].includes(res.user.role)) {
        window.location.href = '/admin/dashboard';
      } else {
        window.location.href = '/student/dashboard';
      }
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-neutral">
      
      {/* Left Side - Hero / Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-primary overflow-hidden flex-col justify-between p-12 text-white">
        {/* Abstract Background Pattern */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
             <path d="M-100,-100 L400,-100 L800,300 L800,900 L-100,900 Z" fill="url(#grad1)" />
             <path d="M400,-100 L900,-100 L900,400 L0,900 L-100,600 Z" fill="url(#grad2)" />
             <defs>
               <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                 <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
                 <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
               </linearGradient>
               <linearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="100%">
                 <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
                 <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
               </linearGradient>
             </defs>
          </svg>
        </div>

        <div className="relative z-10">
          {appLogo ? (
            <img src={appLogo.startsWith('http') ? appLogo : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${appLogo}`} alt="Logo" className="h-8 w-auto mb-4" />
          ) : (
            <div className="flex items-center gap-2 mb-4">
               <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
                 <span className="font-bold text-white text-xs">DM</span>
               </div>
               <span className="font-bold tracking-wide">{appName}</span>
            </div>
          )}
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="text-4xl lg:text-5xl font-extrabold leading-tight mb-6">
            Pay Smarter.<br/>Track Faster.<br/>Clear Anywhere.
          </h1>
          <p className="text-lg text-white/80 leading-relaxed">
            From quick due checks to full payment history, our student portal lets you handle your department records seamlessly across devices.
          </p>
          <div className="mt-8 flex items-center gap-2">
            <span className="w-8 h-1 bg-secondary rounded-full block"></span>
            <span className="w-2 h-1 bg-white/30 rounded-full block"></span>
            <span className="w-2 h-1 bg-white/30 rounded-full block"></span>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="absolute top-6 left-6 lg:hidden">
            <Link href="/" className="flex items-center gap-2 text-primary font-bold text-sm hover:underline">
              ← Back to Website
            </Link>
        </div>
        
        <div className="absolute top-6 right-6 hidden lg:block">
            <Link href="/" className="flex items-center gap-2 text-gray-500 font-medium text-sm hover:text-primary transition-colors">
              ← Back to Website
            </Link>
        </div>

        <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-3xl shadow-2xl shadow-primary/5 border border-gray-100 relative z-10">
          
          {/* Mobile Logo Fallback */}
          <div className="lg:hidden text-center mb-8">
            <h2 className="text-2xl font-extrabold text-primary">{appName}</h2>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Welcome Back!</h2>
            <p className="text-sm text-gray-500 font-medium">Log in to your student portal to view and pay dues.</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
              <div>
                <label htmlFor="indexNumber" className="block text-sm font-semibold text-gray-700 mb-1.5">Index Number</label>
                <input 
                  id="indexNumber" 
                  name="indexNumber" 
                  type="text" 
                  required 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none text-gray-900 placeholder-gray-400" 
                  placeholder="Input your index number" 
                  value={formData.indexNumber} 
                  onChange={(e) => setFormData({ ...formData, indexNumber: e.target.value })} 
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700">Password</label>
                  <Link href="/forgot-password" className="text-sm font-bold text-secondary hover:text-secondary-dark transition-colors">Forgot Password?</Link>
                </div>
                <div className="relative">
                  <input 
                    id="password" 
                    name="password" 
                    type={showPassword ? "text" : "password"} 
                    required 
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none text-gray-900 placeholder-gray-400" 
                    placeholder="Input your password"
                    value={formData.password} 
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-primary transition-colors"
                  >
                    <div className="w-5 h-5">
                      {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-lg shadow-black/10 flex justify-center items-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Login'
              )}
            </button>

            <div className="text-center text-sm font-medium text-gray-500 pt-2">
              Don't have an account? <Link href="/register" className="text-gray-900 font-bold hover:underline">Sign up here</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
