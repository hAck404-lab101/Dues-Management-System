'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { LockClosedIcon, ShieldIcon } from '@/components/Icons';

export default function AdminSecurityPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role === 'student')) {
      router.push('/admin/login');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.newPassword !== form.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (form.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success('Password changed successfully');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Account Security">
        <div className="text-center py-12">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Account Security">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="card overflow-hidden p-0">
          <div className="bg-primary text-white p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
              <span className="w-7 h-7"><ShieldIcon /></span>
            </div>
            <div>
              <h2 className="text-2xl font-extrabold">Security & Access</h2>
              <p className="text-white/70 text-sm mt-1">Manage your own administrator account security from one categorized area.</p>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-5 h-fit">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <span className="w-5 h-5"><LockClosedIcon /></span>
              </div>
              <h3 className="font-bold text-primary">Password Rules</h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                Use a strong password that is not shared with students or staff. Change it anytime you suspect access has been exposed.
              </p>
              <div className="mt-4 text-xs text-gray-500 space-y-2">
                <p>Signed in as:</p>
                <p className="font-semibold text-gray-800 break-all">{user?.email}</p>
                <p className="uppercase tracking-wide font-bold text-primary">{user?.role} access</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
              <div>
                <h3 className="text-lg font-extrabold text-primary">Change Password</h3>
                <p className="text-sm text-gray-500 mt-1">This updates only your current admin account. It does not reset student logins.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Current Password *</label>
                  <input
                    type="password"
                    className="input-field"
                    value={form.currentPassword}
                    onChange={e => setForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="label">New Password *</label>
                  <input
                    type="password"
                    className="input-field"
                    value={form.newPassword}
                    onChange={e => setForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="label">Confirm Password *</label>
                  <input
                    type="password"
                    className="input-field"
                    value={form.confirmPassword}
                    onChange={e => setForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-5 border-t">
                <p className="text-xs text-gray-500">You will continue using this new password on your next login.</p>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
