'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  UsersIcon, CardIcon, LandmarkIcon, WalletIcon 
} from '@/components/Icons';
import { DashboardSkeleton } from '@/components/Skeletons';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';

interface PendingPayment {
  id: string;
  amount: number;
  payment_method: string;
  payment_type: string;
  status: string;
  proof_image_url: string;
  notes: string;
  created_at: string;
  student_id: string;
  full_name: string;
  email: string;
  level: number;
  programme: string;
  due_name: string;
}

const VIBRANT_COLORS = ['#6366F1', '#EC4899', '#14B8A6', '#F59E0B', '#8B5CF6', '#06B6D4'];

export default function TreasurerDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  
  // Modals state
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'treasurer')) {
      router.push('/admin/login');
    }
  }, [user, loading, router]);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/dashboard/admin');
      if (response.data.success) {
        setDashboardData(response.data.data);
      }
    } catch (error: any) {
      console.error('Failed to load dashboard statistics:', error);
    }
  };

  const fetchPendingQueue = async () => {
    try {
      // Excludes paystack method payments and returns manual pending ones
      const response = await api.get('/features/manual-payments/pending');
      if (response.data.success) {
        setPendingPayments(response.data.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load pending manual payments');
    }
  };

  const loadInitialData = async () => {
    if (user && user.role === 'treasurer') {
      try {
        await Promise.all([
          fetchPendingQueue(),
          fetchDashboardData()
        ]);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoadingData(false);
      }
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [user]);

  const handleApprove = async (id: string) => {
    if (!confirm('Are you sure you want to approve this manual payment?')) return;
    setSubmitting(true);
    try {
      const response = await api.patch(`/payments/${id}/approve`);
      if (response.data.success) {
        toast.success('Payment approved and receipt generated!');
        fetchPendingQueue();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Approval failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectId || !rejectReason.trim()) return;
    setSubmitting(true);
    try {
      const response = await api.patch(`/payments/${rejectId}/reject`, {
        reason: rejectReason
      });
      if (response.data.success) {
        toast.success('Payment rejected successfully');
        setRejectId(null);
        setRejectReason('');
        fetchPendingQueue();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Rejection failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || loadingData) {
    return (
      <AdminLayout title="Treasurer Dashboard">
        <DashboardSkeleton />
      </AdminLayout>
    );
  }

  const totalPendingAmount = pendingPayments.reduce((acc, curr) => acc + Number(curr.amount), 0);

  return (
    <AdminLayout title="Treasurer Approvals">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="kpi-card">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-primary">
              <span className="w-6 h-6"><CardIcon /></span>
            </div>
            <span className="percent-pill neutral">Pending Approval</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 mb-1">Total Pending Actions</p>
            <h3 className="text-3xl font-extrabold text-gray-900">{pendingPayments.length}</h3>
          </div>
        </div>

        <div className="kpi-card solid-primary">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white">
              <span className="w-6 h-6"><WalletIcon /></span>
            </div>
            <span className="percent-pill bg-white/20 text-white border border-white/30">Manual Queue</span>
          </div>
          <div>
            <p className="kpi-label text-sm font-semibold mb-1">Pending Amount Value</p>
            <h3 className="text-3xl font-extrabold">GHS {totalPendingAmount.toFixed(2)}</h3>
          </div>
        </div>

        <div className="kpi-card">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-500">
              <span className="w-6 h-6"><LandmarkIcon /></span>
            </div>
            <span className="percent-pill positive">Automated</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 mb-1">Paystack Automated Payments</p>
            <h3 className="text-xl font-bold text-gray-900">Handled by system</h3>
            <p className="text-xs text-gray-400 mt-1 font-semibold">Excludes online webhook processes</p>
          </div>
        </div>
      </div>

      {/* Visual Analytics */}
      {dashboardData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="chart-card">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Payment Channels</h3>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-4">Breakdown of all completed transactions</p>
            <div className="h-72 flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData.charts.paymentMethodStats.map((item: any) => ({
                      name: item.method.replace('_', ' ').toUpperCase(),
                      value: item.total
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    {dashboardData.charts.paymentMethodStats.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={VIBRANT_COLORS[index % VIBRANT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `GHS ${value.toFixed(2)}`}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Monthly Dues Inflow</h3>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-4">Collections growth trend</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={dashboardData.charts.monthlyCollections.map((m: any) => ({
                    ...m,
                    monthShort: new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short' })
                  })).reverse()} 
                  margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="monthShort" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF', fontWeight: 600 }} />
                  <Tooltip 
                    cursor={{ stroke: '#6366F1', strokeWidth: 1, strokeDasharray: '3 3' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                    formatter={(value: number) => [`GHS ${value.toFixed(2)}`, 'Collected']}
                  />
                  <Area type="monotone" dataKey="total" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Manual Pending Payments Queue Table */}
      <div className="dashboard-card overflow-hidden !p-0">
        <div className="p-6 lg:p-8 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900">Manual Payment Queue</h3>
          <p className="text-sm text-gray-500 mt-1">Review student bank deposits and mobile money transactions</p>
        </div>

        <div className="overflow-x-auto">
          {pendingPayments.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-gray-400 text-xs uppercase tracking-widest font-bold">
                  <th className="p-4 pl-8">Student Info</th>
                  <th className="p-4">Due Allocation</th>
                  <th className="p-4">Amount Submitted</th>
                  <th className="p-4">Method & Notes</th>
                  <th className="p-4">Proof File</th>
                  <th className="p-4 pr-8 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 pl-8">
                      <p className="font-bold text-gray-900 text-sm">{payment.full_name}</p>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">{payment.student_id} • Level {payment.level}</p>
                    </td>
                    <td className="p-4 text-sm font-semibold text-gray-700">{payment.due_name}</td>
                    <td className="p-4 font-bold text-primary text-sm">GHS {Number(payment.amount).toFixed(2)}</td>
                    <td className="p-4 text-sm">
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase block w-max mb-1">
                        {payment.payment_method}
                      </span>
                      <p className="text-xs text-gray-500 italic max-w-xs truncate">{payment.notes || 'No description notes.'}</p>
                    </td>
                    <td className="p-4">
                      {payment.proof_image_url ? (
                        <button 
                          onClick={() => setSelectedProof(payment.proof_image_url)}
                          className="text-xs font-bold text-secondary hover:text-primary transition-colors flex items-center gap-1 bg-secondary/10 px-2.5 py-1.5 rounded-lg border border-secondary/20"
                        >
                          View Image
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No proof file</span>
                      )}
                    </td>
                    <td className="p-4 pr-8 text-right space-x-2">
                      <button 
                        onClick={() => handleApprove(payment.id)}
                        disabled={submitting}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => setRejectId(payment.id)}
                        disabled={submitting}
                        className="bg-red-500 hover:bg-red-600 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-16 text-center text-gray-500 flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                <span className="w-8 h-8 text-gray-400">✓</span>
              </div>
              <p className="font-bold text-gray-800 text-lg">Clear Queue!</p>
              <p className="text-sm text-gray-400 mt-1">No pending manual payments are waiting for approval.</p>
            </div>
          )}
        </div>
      </div>

      {/* Proof Preview Modal */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full border border-gray-100 shadow-2xl relative">
            <button 
              onClick={() => setSelectedProof(null)}
              className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-red-500 hover:text-white transition-colors"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Payment Proof Attachment</h3>
            <div className="max-h-[60vh] overflow-y-auto rounded-2xl border border-gray-100 bg-neutral/30 flex items-center justify-center p-2">
              <img 
                src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${selectedProof}`} 
                alt="Proof of Payment" 
                className="max-w-full max-h-[50vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-gray-100 shadow-2xl relative">
            <button 
              onClick={() => { setRejectId(null); setRejectReason(''); }}
              className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-red-500 hover:text-white transition-colors"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Reject manual payment</h3>
            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Rejection Reason</label>
                <textarea 
                  required
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                  placeholder="Explain why this proof is rejected (e.g. proof image is blurry, wrong amount deposited...)"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
              <button 
                type="submit"
                disabled={submitting}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all"
              >
                Reject Payment Submission
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
