'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { UsersIcon, LandmarkIcon, WalletIcon, CardIcon, ShieldIcon, ReceiptIcon, LockClosedIcon } from '@/components/Icons';

interface AdminDashboardData {
  summary: {
    totalStudents: number;
    expectedRevenue: number;
    amountCollected: number;
    outstandingBalance: number;
    defaultersCount: number;
    pendingPayments: number;
  };
  charts: {
    monthlyCollections: any[];
    levelWisePayments: any[];
  };
  recentPayments: any[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role === 'student')) {
      router.push('/admin/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && user.role !== 'student') {
      fetchDashboard();
    }
  }, [user]);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/dashboard/admin');
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoadingData(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    setChangingPassword(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Admin password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading || loadingData) {
    return (
      <Layout>
        <div className="text-center py-12">Loading...</div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="text-center py-12">No data available</div>
      </Layout>
    );
  }

  return (
    <Layout title="Admin Dashboard">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="card bg-primary text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium opacity-80 uppercase tracking-wider">Total Students</h3>
              <p className="text-3xl font-extrabold mt-2">{data.summary.totalStudents}</p>
            </div>
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <UsersIcon />
            </div>
          </div>
        </div>

        <div className="card bg-indigo-600 text-white p-6 shadow-indigo-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium opacity-80 uppercase tracking-wider">Expected Revenue</h3>
              <p className="text-3xl font-extrabold mt-2">GHS {Number(data.summary.expectedRevenue).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</p>
            </div>
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <LandmarkIcon />
            </div>
          </div>
        </div>

        <div className="card bg-emerald-600 text-white p-6 shadow-emerald-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium opacity-80 uppercase tracking-wider">Amount Collected</h3>
              <p className="text-3xl font-extrabold mt-2">GHS {Number(data.summary.amountCollected).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</p>
            </div>
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <WalletIcon />
            </div>
          </div>
        </div>

        <div className="card bg-rose-600 text-white p-6 shadow-rose-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium opacity-80 uppercase tracking-wider">Outstanding Balance</h3>
              <p className="text-3xl font-extrabold mt-2">GHS {Number(data.summary.outstandingBalance).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</p>
            </div>
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <CardIcon />
            </div>
          </div>
        </div>

        <div className="card bg-amber-600 text-white p-6 shadow-amber-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium opacity-80 uppercase tracking-wider">Defaulters Count</h3>
              <p className="text-3xl font-extrabold mt-2">{data.summary.defaultersCount}</p>
            </div>
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <ShieldIcon />
            </div>
          </div>
        </div>

        <div className="card bg-sky-600 text-white p-6 shadow-sky-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium opacity-80 uppercase tracking-wider">Pending Payments</h3>
              <p className="text-3xl font-extrabold mt-2">{data.summary.pendingPayments}</p>
            </div>
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <ReceiptIcon />
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-8 border-l-4 border-primary">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="w-5 h-5"><LockClosedIcon /></span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary">Admin Security</h2>
              <p className="text-sm text-gray-500">Change your administrator password regularly to protect payment and student records.</p>
            </div>
          </div>
          <button type="button" className="btn-outline" onClick={() => setShowPasswordForm(v => !v)}>
            {showPasswordForm ? 'Hide Password Form' : 'Change Password'}
          </button>
        </div>

        {showPasswordForm && (
          <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t">
            <div>
              <label className="label">Current Password *</label>
              <input
                type="password"
                className="input-field"
                value={passwordForm.currentPassword}
                onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">New Password *</label>
              <input
                type="password"
                className="input-field"
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Confirm New Password *</label>
              <input
                type="password"
                className="input-field"
                value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                required
              />
            </div>
            <div className="md:col-span-3 flex justify-end gap-3">
              <button type="button" className="btn-outline" onClick={() => setShowPasswordForm(false)}>Cancel</button>
              <button type="submit" disabled={changingPassword} className="btn-primary">
                {changingPassword ? 'Changing...' : 'Save New Password'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h2 className="text-xl font-bold text-primary mb-4">Monthly Collections</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.charts.monthlyCollections}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#F2A900" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-primary mb-4">Level-wise Payments</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.charts.levelWisePayments}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="level" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="totalPaid" fill="#0B3C5D" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold text-primary mb-4">Recent Payments</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Student</th>
                <th className="text-left py-2">Due</th>
                <th className="text-left py-2">Amount</th>
                <th className="text-left py-2">Method</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.recentPayments.map((payment) => (
                <tr key={payment.id} className="border-b">
                  <td className="py-2">{payment.student_name}</td>
                  <td className="py-2">{payment.due_name}</td>
                  <td className="py-2">GHS {Number(payment.amount).toFixed(2)}</td>
                  <td className="py-2">{payment.payment_method.replace('_', ' ')}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${payment.status === 'completed' || payment.status === 'approved' ? 'bg-green-100 text-green-800' :
                      payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="py-2">{new Date(payment.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
