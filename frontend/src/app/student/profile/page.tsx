'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ProfileIcon, LockClosedIcon } from '@/components/Icons';

export default function StudentProfilePage() {
  const router = useRouter();
  const { user, loading, setUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data?.success) {
        setProfile(res.data.user);
        setPhoneNumber(res.data.user.student?.phoneNumber || '');
      }
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoadingData(false);
    }
  };

  const handleUpdatePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPhone(true);
    try {
      const res = await api.patch('/students/me/phone', { phoneNumber });
      toast.success(res.data?.message || 'Phone number updated');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update phone number');
    } finally {
      setSavingPhone(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return toast.error('New passwords do not match');
    }
    if (passwordForm.newPassword.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }

    setChangingPassword(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      if (user) setUser({ ...user, mustChangePassword: false });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading || loadingData) {
    return (
      <Layout title="Student Profile">
        <div className="card p-8 text-center">
          <div className="w-10 h-10 mx-auto rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4" />
          <p className="font-semibold text-primary text-sm">Loading profile...</p>
        </div>
      </Layout>
    );
  }

  const student = profile?.student;

  return (
    <Layout title="Student Profile">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Basic Student Information */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="w-5 h-5"><ProfileIcon /></span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary">Personal Details</h2>
              <p className="text-xs text-gray-500">Your registered student record in the portal</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoBox label="Full Name" value={student?.fullName || profile?.email || '—'} />
            <InfoBox label="Index Number" value={profile?.studentId || student?.studentId || '—'} />
            <InfoBox label="Email Address" value={profile?.email || '—'} />
            <InfoBox label="Level" value={student?.level ? `Level ${student.level}` : '—'} />
            <InfoBox label="Programme" value={student?.programme || '—'} />
            <InfoBox label="Academic Year" value={student?.academicYear || '—'} />
          </div>
        </div>

        {/* Update Phone Number */}
        <div className="card">
          <h3 className="font-bold text-primary mb-2">Update Phone Number</h3>
          <p className="text-xs text-gray-500 mb-4">
            We use your phone number to send official payment SMS notifications and login reset messages.
          </p>
          <form onSubmit={handleUpdatePhone} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              className="input-field flex-1"
              placeholder="e.g. 0244123456"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              required
            />
            <button type="submit" disabled={savingPhone} className="btn-primary">
              {savingPhone ? 'Saving...' : 'Update Phone'}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
              <span className="w-5 h-5"><LockClosedIcon /></span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary">Account Security</h2>
              <p className="text-xs text-gray-500">Change your portal login password</p>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>

            <button type="submit" disabled={changingPassword} className="btn-primary">
              {changingPassword ? 'Updating Password...' : 'Save New Password'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-800 break-words">{value}</p>
    </div>
  );
}
