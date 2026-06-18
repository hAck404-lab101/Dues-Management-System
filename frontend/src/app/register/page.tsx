'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { register } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { EyeIcon, EyeSlashIcon } from '@/components/Icons';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface RegisterFormData {
  indexNumber: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  password: string;
  confirmPassword: string;
  programme: string;
  academicYear: string;
}

interface InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}

export default function RegisterPage() {
  const { setUser } = useAuth();
  const { appName, appLogo } = useBranding();
  const [formData, setFormData] = useState<RegisterFormData>({ indexNumber: '', fullName: '', phoneNumber: '', email: '', password: '', confirmPassword: '', programme: '', academicYear: '' });
  const [availableProgrammes, setAvailableProgrammes] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<'open' | 'closed'>('open');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    const fetchPublicSettings = async () => {
      try {
        const res = await api.get('/settings/public');
        if (res.data.success) {
          const settings = res.data.data;
          if (settings.available_programmes) {
            const progs = settings.available_programmes.split(',').map((p: string) => p.trim()).filter(Boolean);
            setAvailableProgrammes(progs);
            if (progs.length > 0) setFormData(prev => ({ ...prev, programme: progs[0] }));
          }
          if (settings.available_academic_years) {
            const years = settings.available_academic_years.split(',').map((y: string) => y.trim()).filter(Boolean);
            setAvailableYears(years);
            if (years.length > 0) setFormData(prev => ({ ...prev, academicYear: years[years.length - 1] }));
          }
          if (settings.registration_status) setRegistrationStatus(settings.registration_status);
        }
      } catch (error) { console.error('Settings fetch error:', error); }
    };
    fetchPublicSettings();
  }, []);

  const updateFormField = (field: keyof RegisterFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) return toast.error('Passwords do not match');
    if (!acceptedTerms) return toast.error('Please accept the Privacy Policy and Terms & Conditions to continue');
    setLoading(true);
    try {
      const res = await register({
        indexNumber: formData.indexNumber,
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        password: formData.password,
        programme: formData.programme,
        academicYear: formData.academicYear,
      });
      setUser(res.user);
      toast.success('Registration successful!');
      window.location.href = '/student/dashboard';
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-neutral flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-6">
        <div className="flex items-center justify-between text-sm">
          <Link href="/" className="text-primary font-semibold hover:underline">← Home</Link>
          <Link href="/login" className="text-primary font-semibold hover:underline">Login</Link>
        </div>

        <div className="text-center">
          {appLogo ? (
            <img src={appLogo.startsWith('http') ? appLogo : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${appLogo}`} alt="Logo" className="mx-auto h-20 w-auto mb-4 drop-shadow-lg" />
          ) : (
            <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl mb-4">
              <svg className="w-10 h-10 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
          )}
          <h2 className="text-3xl font-extrabold text-primary">{appName}</h2>
          <p className="mt-2 text-sm text-gray-600">Student Registration Portal</p>
        </div>

        <div className="card">
          {registrationStatus === 'closed' ? (
            <div className="py-12 text-center space-y-4">
              <div className="mx-auto w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center text-yellow-500 mb-2">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Registration Closed</h3>
              <p className="text-gray-500 max-w-sm mx-auto">Student registration is currently closed by the administration. Please contact your department for assistance.</p>
              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/" className="bg-gray-100 text-primary px-5 py-2 rounded-lg font-bold hover:bg-gray-200 transition-colors">Back Home</Link>
                <Link href="/login" className="btn-primary">Return to Login</Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Index Number *" value={formData.indexNumber} onChange={(value) => updateFormField('indexNumber', value)} placeholder="Enter your index number" required />
                <Input label="Full Name *" value={formData.fullName} onChange={(value) => updateFormField('fullName', value)} placeholder="Enter your full name" required />
                <Input label="Phone Number *" type="tel" value={formData.phoneNumber} onChange={(value) => updateFormField('phoneNumber', value)} placeholder="e.g., 0244123456" required />
                <Input label="Email Address *" type="email" value={formData.email} onChange={(value) => updateFormField('email', value)} placeholder="your.email@example.com" required />
                <Input label="Password *" type="password" value={formData.password} onChange={(value) => updateFormField('password', value)} placeholder="Minimum 6 characters" required />
                <Input label="Confirm Password *" type="password" value={formData.confirmPassword} onChange={(value) => updateFormField('confirmPassword', value)} placeholder="Re-enter your password" required />
                <div><label className="label">Programme *</label><select required className="input-field" value={formData.programme} onChange={e => updateFormField('programme', e.target.value)}><option value="">Select Programme</option>{availableProgrammes.map(prog => <option key={prog} value={prog}>{prog}</option>)}</select></div>
                <div><label className="label">Academic Year *</label><select required className="input-field" value={formData.academicYear} onChange={e => updateFormField('academicYear', e.target.value)}><option value="">Select Academic Year</option>{availableYears.map(year => <option key={year} value={year}>{year}</option>)}</select></div>
              </div>

              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-700">
                <label className="flex gap-3 items-start cursor-pointer">
                  <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} required />
                  <span>I confirm that the information provided is accurate, and I agree to the <Link href="/privacy" className="text-primary font-semibold hover:underline" target="_blank">Privacy Policy</Link> and <Link href="/terms" className="text-primary font-semibold hover:underline" target="_blank">Terms & Conditions</Link>.</span>
                </label>
              </div>

              <p className="text-sm text-gray-600">* Required fields</p>
              <button type="submit" disabled={loading || !acceptedTerms} className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed">{loading ? 'Registering...' : 'Register'}</button>
              <div className="text-center text-sm"><p className="text-gray-600">Already have an account? <Link href="/login" className="text-primary hover:underline font-medium">Login here</Link></p></div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = 'text', required = false }: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input 
          type={inputType} 
          required={required} 
          className="input-field" 
          placeholder={placeholder} 
          value={value} 
          onChange={e => onChange(e.target.value)} 
        />
        {isPassword && (
          <button 
            type="button" 
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-primary transition-colors"
          >
            <div className="w-5 h-5">
              {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
