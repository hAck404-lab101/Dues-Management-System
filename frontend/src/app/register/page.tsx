'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const { appName, appLogo } = useBranding();
  const [formData, setFormData] = useState({
    indexNumber: '',
    fullName: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    programme: '',
    academicYear: '',
  });
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

          if (settings.registration_status) {
            setRegistrationStatus(settings.registration_status);
          }
        }
      } catch (error) {
        console.error('Settings fetch error:', error);
      }
    };
    fetchPublicSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!acceptedTerms) {
      toast.error('Please accept the Privacy Policy and Terms & Conditions to continue');
      return;
    }

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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
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
            Student Registration Portal
          </p>
        </div>
        <div className="card">
          {registrationStatus === 'closed' ? (
            <div className="py-12 text-center space-y-4">
              <div className="mx-auto w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center text-yellow-500 mb-2">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Registration Closed</h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                Student registration is currently closed by the administration. Please contact your department for assistance.
              </p>
              <div className="pt-4">
                <Link href="/login" className="btn-outline">Return to Login</Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Index Number *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="Enter your index number"
                    value={formData.indexNumber}
                    onChange={(e) => setFormData({ ...formData, indexNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    className="input-field"
                    placeholder="e.g., 0244123456"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Email Address *</label>
                  <input
                    type="email"
                    required
                    className="input-field"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Password *</label>
                  <input
                    type="password"
                    required
                    className="input-field"
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    className="input-field"
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Programme *</label>
                  <select
                    required
                    className="input-field"
                    value={formData.programme}
                    onChange={(e) => setFormData({ ...formData, programme: e.target.value })}
                  >
                    <option value="">Select Programme</option>
                    {availableProgrammes.map(prog => (
                      <option key={prog} value={prog}>{prog}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Academic Year *</label>
                  <select
                    required
                    className="input-field"
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  >
                    <option value="">Select Academic Year</option>
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-700">
                <label className="flex gap-3 items-start cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    required
                  />
                  <span>
                    I confirm that the information provided is accurate, and I agree to the{' '}
                    <Link href="/privacy" className="text-primary font-semibold hover:underline" target="_blank">Privacy Policy</Link>{' '}
                    and{' '}
                    <Link href="/terms" className="text-primary font-semibold hover:underline" target="_blank">Terms & Conditions</Link>.
                    I also confirm that I am 13 years or older, or that my account is created or authorized by a parent, guardian, school, department, or authorized administrator.
                  </span>
                </label>
              </div>

              <p className="text-sm text-gray-600">* Required fields</p>
              <button type="submit" disabled={loading || !acceptedTerms} className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? 'Registering...' : 'Register'}
              </button>
              <div className="text-center text-sm">
                <p className="text-gray-600">
                  Already have an account?{' '}
                  <Link href="/login" className="text-primary hover:underline">
                    Login here
                  </Link>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
