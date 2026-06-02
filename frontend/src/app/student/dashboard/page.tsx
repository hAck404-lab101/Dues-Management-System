'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { DashboardSkeleton } from '@/components/Skeletons';

interface DashboardData {
  student: any;
  summary: {
    totalDues: number;
    totalDuesAmount: number;
    totalPaid: number;
    outstandingBalance: number;
  };
  recentPayments: any[];
  recentReceipts: any[];
  dues: any[];
}

export default function StudentDashboard() {
  const router = useRouter();
  const { user, loading, setUser } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchDashboard();
    }
  }, [user]);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/dashboard/student');
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoadingData(false);
    }
  };

  const handleRequiredPasswordChange = async (e: React.FormEvent) => {
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
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      if (user) setUser({ ...user, mustChangePassword: false });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading || loadingData) {
    return (
      <Layout title="Student Dashboard">
        <DashboardSkeleton />
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

  const studentName = data.student?.full_name || user?.student?.fullName || 'Student';
  const firstName = String(studentName).split(' ')[0] || 'Student';

  return (
    <Layout title="Student Dashboard">
      {user?.mustChangePassword && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-primary text-white p-6">
              <h2 className="text-2xl font-extrabold">Change Temporary Password</h2>
              <p className="text-white/80 text-sm mt-1">
                You are using a temporary password. Please set a new password before continuing.
              </p>
            </div>
            <form onSubmit={handleRequiredPasswordChange} className="p-6 space-y-4">
              <div>
                <label className="label">Temporary / Current Password *</label>
                <input
                  type="password"
                  className="input-field"
                  value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="label">New Password *</label>
                <input
                  type="password"
                  className="input-field"
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Confirm New Password *</label>
                <input
                  type="password"
                  className="input-field"
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                />
              </div>
              <div className="pt-4 border-t flex flex-col gap-3">
                <button type="submit" disabled={changingPassword} className="btn-primary w-full">
                  {changingPassword ? 'Updating password...' : 'Save New Password'}
                </button>
                <p className="text-xs text-gray-500 text-center">
                  This modal will close only after your temporary password is changed.
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card bg-gradient-to-br from-primary to-primary-dark text-white mb-8 overflow-hidden relative">
        <div className="relative z-10">
          <p className="text-white/70 text-sm font-semibold uppercase tracking-[0.18em]">Welcome back</p>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-2">Welcome, {firstName}</h1>
          <p className="text-white/80 mt-2 max-w-2xl">
            Track your dues, make payments, and download official receipts from your student portal.
          </p>
        </div>
        <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute right-12 -bottom-16 w-48 h-48 rounded-full bg-secondary/20" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card bg-primary text-white">
          <h3 className="text-sm font-medium opacity-90">Total Dues</h3>
          <p className="text-3xl font-bold mt-2">{data.summary.totalDues}</p>
        </div>
        <div className="card bg-secondary text-white">
          <h3 className="text-sm font-medium opacity-90">Total Amount</h3>
          <p className="text-3xl font-bold mt-2">GHS {data.summary.totalDuesAmount.toFixed(2)}</p>
        </div>
        <div className="card bg-green-600 text-white">
          <h3 className="text-sm font-medium opacity-90">Total Paid</h3>
          <p className="text-3xl font-bold mt-2">GHS {data.summary.totalPaid.toFixed(2)}</p>
        </div>
        <div className="card bg-red-600 text-white">
          <h3 className="text-sm font-medium opacity-90">Outstanding</h3>
          <p className="text-3xl font-bold mt-2">GHS {data.summary.outstandingBalance.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h2 className="text-xl font-bold text-primary mb-4">My Dues</h2>
          <div className="space-y-3">
            {data.dues.map((due) => (
              <div key={due.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{due.name}</h3>
                  <span className={`px-2 py-1 rounded text-xs ${due.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                    due.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                    {due.payment_status}
                  </span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Assigned: GHS {due.assigned_amount.toFixed(2)}</p>
                  <p>Paid: GHS {due.total_paid.toFixed(2)}</p>
                  <p>Balance: GHS {due.balance.toFixed(2)}</p>
                </div>
                {due.balance > 0 && (
                  <Link href={`/student/payments/make?dueId=${due.id}`}>
                    <button className="btn-primary mt-3 w-full">Make Payment</button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-primary mb-4">Recent Payments</h2>
          <div className="space-y-3">
            {data.recentPayments.length === 0 ? (
              <p className="text-gray-500">No payments yet</p>
            ) : (
              data.recentPayments.map((payment) => (
                <div key={payment.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{payment.due_name}</h3>
                      <p className="text-sm text-gray-600">GHS {Number(payment.amount).toFixed(2)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${payment.status === 'completed' || payment.status === 'approved' ? 'bg-green-100 text-green-800' :
                      payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                      {payment.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold text-primary mb-4">Recent Receipts</h2>
        <div className="space-y-3">
          {data.recentReceipts.length === 0 ? (
            <p className="text-gray-500">No receipts yet</p>
          ) : (
            data.recentReceipts.map((receipt) => (
              <div key={receipt.id} className="border rounded-lg p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{receipt.due_name}</h3>
                  <p className="text-sm text-gray-600">Receipt: {receipt.receipt_number}</p>
                  <p className="text-sm text-gray-600">Amount: GHS {Number(receipt.amount_paid).toFixed(2)}</p>
                </div>
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL}/receipts/${receipt.receipt_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline"
                >
                  Download
                </a>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
