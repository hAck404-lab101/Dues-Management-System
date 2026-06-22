'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { DashboardSkeleton } from '@/components/Skeletons';
import { WalletIcon, LandmarkIcon, UsersIcon, CardIcon } from '@/components/Icons';

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
  const [downloadingReceipt, setDownloadingReceipt] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'student') {
        router.push('/admin/dashboard');
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) fetchDashboard();
  }, [user]);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/dashboard/student');
      if (response.data.success) setData(response.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoadingData(false);
    }
  };

  const downloadReceipt = async (receiptNumber: string) => {
    setDownloadingReceipt(receiptNumber);
    try {
      const response = await api.get(`/receipts/download/${encodeURIComponent(receiptNumber)}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${receiptNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Receipt download failed');
    } finally {
      setDownloadingReceipt(null);
    }
  };

  const handleRequiredPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return toast.error('New passwords do not match');
    if (passwordForm.newPassword.length < 6) return toast.error('New password must be at least 6 characters');

    setChangingPassword(true);
    try {
      await api.post('/auth/change-password', { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
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

  if (!data) return <Layout><div className="text-center py-12">No data available</div></Layout>;

  const studentName = data.student?.full_name || user?.student?.fullName || 'Student';
  const firstName = String(studentName).split(' ')[0] || 'Student';

  return (
    <Layout title="Student Dashboard">
      {user?.mustChangePassword && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-primary text-white p-6">
              <h2 className="text-2xl font-extrabold">Change Temporary Password</h2>
              <p className="text-white/80 text-sm mt-1">You are using a temporary password. Please set a new password before continuing.</p>
            </div>
            <form onSubmit={handleRequiredPasswordChange} className="p-6 space-y-4">
              <div>
                <label className="label">Temporary / Current Password *</label>
                <input type="password" className="input-field" value={passwordForm.currentPassword} onChange={e => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))} required autoFocus />
              </div>
              <div>
                <label className="label">New Password *</label>
                <input type="password" className="input-field" value={passwordForm.newPassword} onChange={e => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Confirm New Password *</label>
                <input type="password" className="input-field" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))} required />
              </div>
              <div className="pt-4 border-t flex flex-col gap-3">
                <button type="submit" disabled={changingPassword} className="btn-primary w-full">{changingPassword ? 'Updating password...' : 'Save New Password'}</button>
                <p className="text-xs text-gray-500 text-center">This modal will close only after your temporary password is changed.</p>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card bg-gradient-to-br from-primary to-primary-dark text-white mb-8 overflow-hidden relative">
        <div className="relative z-10">
          <p className="text-white/70 text-sm font-semibold uppercase tracking-[0.18em]">Welcome back</p>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-2">Welcome, {firstName}</h1>
          <p className="text-white/80 mt-2 max-w-2xl">Track your dues, make payments, and download official receipts from your student portal.</p>
        </div>
        <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute right-12 -bottom-16 w-48 h-48 rounded-full bg-secondary/20" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Card 1: Total Dues */}
        <div className="kpi-card solid-primary">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white">
              <span className="w-6 h-6"><WalletIcon /></span>
            </div>
            <span className="percent-pill bg-white/20 text-white border border-white/30">Total</span>
          </div>
          <div>
            <p className="kpi-label text-sm font-semibold mb-1">Total Dues</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-extrabold">{data.summary.totalDues}</h3>
              <span className="text-xs text-white/60">Dues</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Amount */}
        <div className="kpi-card">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
              <span className="w-6 h-6"><LandmarkIcon /></span>
            </div>
            <span className="percent-pill bg-blue-50 text-blue-700">Assigned</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 mb-1">Total Amount</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-extrabold text-gray-900">GHS {data.summary.totalDuesAmount.toFixed(2)}</h3>
            </div>
          </div>
        </div>

        {/* Card 3: Total Paid */}
        <div className="kpi-card">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
              <span className="w-6 h-6"><UsersIcon /></span>
            </div>
            <span className="percent-pill bg-blue-50 text-blue-700">Paid</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 mb-1">Total Paid</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-extrabold text-gray-900">GHS {data.summary.totalPaid.toFixed(2)}</h3>
            </div>
          </div>
        </div>

        {/* Card 4: Outstanding Balance */}
        <div className="kpi-card">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
              <span className="w-6 h-6"><CardIcon /></span>
            </div>
            <span className="percent-pill bg-rose-50 text-rose-700">Outstanding</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 mb-1">Outstanding</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-extrabold text-gray-900">GHS {data.summary.outstandingBalance.toFixed(2)}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h2 className="text-xl font-bold text-primary mb-4">My Dues</h2>
          <div className="space-y-3">
            {data.dues.map((due) => (
              <div key={due.id} className="bg-gray-50/60 hover:bg-gray-50/90 transition-colors rounded-2xl p-5 border-none outline-none">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-900">{due.name}</h3>
                  <span className={`status-badge ${due.payment_status}`}>
                    <span className="dot"></span>
                    {due.payment_status.charAt(0).toUpperCase() + due.payment_status.slice(1)}
                  </span>
                </div>
                <div className="text-sm text-gray-600 space-y-1 mt-3">
                  <div className="flex justify-between border-b border-gray-100/50 pb-1.5"><span className="font-medium">Assigned Amount:</span><span className="font-bold text-gray-900">GHS {due.assigned_amount.toFixed(2)}</span></div>
                  <div className="flex justify-between border-b border-gray-100/50 py-1.5"><span className="font-medium">Amount Paid:</span><span className="font-bold text-blue-600">GHS {due.total_paid.toFixed(2)}</span></div>
                  <div className="flex justify-between pt-1.5"><span className="font-medium">Remaining Balance:</span><span className="font-bold text-rose-600">GHS {due.balance.toFixed(2)}</span></div>
                </div>
                {due.balance > 0 && (
                  <Link href={`/student/payments/make?dueId=${due.id}`}>
                    <button className="btn-primary mt-4 w-full">Make Payment</button>
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
              <p className="text-gray-500 text-center py-6">No payments yet</p>
            ) : (
              data.recentPayments.map((payment) => (
                <div key={payment.id} className="bg-gray-50/60 hover:bg-gray-50/90 transition-colors rounded-2xl p-5 border-none outline-none">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-gray-900">{payment.due_name}</h3>
                      <p className="text-sm font-bold text-gray-500 mt-1">GHS {Number(payment.amount).toFixed(2)}</p>
                    </div>
                    <span className={`status-badge ${payment.status}`}>
                      <span className="dot"></span>
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
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
            <p className="text-gray-500 text-center py-6">No receipts yet</p>
          ) : (
            data.recentReceipts.map((receipt) => (
              <div key={receipt.id} className="bg-gray-50/60 hover:bg-gray-50/90 transition-colors rounded-2xl p-5 border-none outline-none flex justify-between items-center gap-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-gray-900">{receipt.due_name}</h3>
                  <p className="text-xs text-gray-500 font-semibold">Receipt: {receipt.receipt_number}</p>
                  <p className="text-sm font-bold text-gray-700">Amount: GHS {Number(receipt.amount_paid).toFixed(2)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadReceipt(receipt.receipt_number)}
                  disabled={downloadingReceipt === receipt.receipt_number}
                  className="btn-outline whitespace-nowrap disabled:opacity-60 text-xs px-4 py-2"
                >
                  {downloadingReceipt === receipt.receipt_number ? 'Downloading...' : 'Download'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
