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

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role === 'student')) router.push('/admin/login');
  }, [user, loading, router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return toast.error('New passwords do not match');
    }
    if (passwordForm.newPassword.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }

    setSubmitting(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      toast.success('Admin password updated successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout title="Account Security">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="w-5 h-5"><LockClosedIcon /></span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary">Change Password</h2>
              <p className="text-xs text-gray-500">Update your administrator account password</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="label">Current Password *</label>
              <input
                type="password"
                className="input-field"
                value={passwordForm.currentPassword}
                onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">New Password *</label>
              <input
                type="password"
                className="input-field"
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Confirm New Password *</label>
              <input
                type="password"
                className="input-field"
                value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                required
              />
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5">
              {submitting ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </div>

        <div className="card bg-gray-50 border border-gray-100 p-5 text-xs text-gray-500 space-y-2">
          <div className="flex items-center gap-2 font-bold text-gray-700">
            <span className="w-4 h-4 text-primary"><ShieldIcon /></span>
            <span>Security Best Practices</span>
          </div>
          <p>• Use a strong, unique password for administrator access.</p>
          <p>• Never share admin credentials with unauthorized individuals.</p>
          <p>• All administrative actions are recorded in the system audit log.</p>
        </div>
      </div>
    </Layout>
  );
}
