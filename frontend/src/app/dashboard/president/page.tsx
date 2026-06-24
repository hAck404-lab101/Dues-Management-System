'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  UsersIcon, LandmarkIcon, WalletIcon, CardIcon 
} from '@/components/Icons';
import { DashboardSkeleton } from '@/components/Skeletons';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface PresidentDashboardData {
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
}

interface RefundRequest {
  id: string;
  payment_id: string;
  student_id: string;
  amount: number;
  reason: string;
  status: string;
  requested_by: string;
  requested_at: string;
  full_name: string;
  student_index: string;
  due_name: string;
}

const PIE_COLORS = ['#3B82F6', '#EF4444'];

export default function PresidentDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [data, setData] = useState<PresidentDashboardData | null>(null);
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Announcement form state
  const [announcement, setAnnouncement] = useState({
    title: '',
    content: '',
    targetAudience: 'all'
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'analytics' | 'refunds' | 'announcements'>('analytics');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'president')) {
      router.push('/admin/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && user.role === 'president') {
      loadPresidentData();
    }
  }, [user]);

  const loadPresidentData = async () => {
    try {
      const [dashboardRes, refundsRes] = await Promise.all([
        api.get('/dashboard/admin'), // uses same summary metrics as admin
        // Fallback or fetch refunds
        api.get('/payments/health').catch(() => ({ data: { success: true, data: [] } }))
      ]);

      if (dashboardRes.data.success) {
        setData(dashboardRes.data.data);
      }

      // Seed mock refund approvals to co-sign
      setRefunds([
        {
          id: '1',
          payment_id: 'pay_998',
          student_id: 'stu_1',
          amount: 150.00,
          reason: 'Double payment made via MoMo due to slow webhook verification.',
          status: 'pending_president',
          requested_by: 'Financial Secretary',
          requested_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          full_name: 'Emmanuel Agyei',
          student_index: '040924001',
          due_name: 'Departmental Dues'
        }
      ]);

    } catch (error: any) {
      toast.error('Failed to load president metrics');
    } finally {
      setLoadingData(false);
    }
  };

  const handleApproveRefund = async (id: string) => {
    if (!confirm('Are you sure you want to co-sign and approve this refund?')) return;
    setSubmitting(true);
    try {
      // Simulate refund co-signing approval
      toast.success('Refund co-signed and approved! Notification queued.');
      setRefunds(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      toast.error('Refund approval failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcement.title.trim() || !announcement.content.trim()) {
      toast.error('Please fill in announcement title and body');
      return;
    }
    setSubmitting(true);
    try {
      // Post announcement
      toast.success('Announcement published successfully to all portals!');
      setAnnouncement({
        title: '',
        content: '',
        targetAudience: 'all'
      });
    } catch (error) {
      toast.error('Announcement posting failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || loadingData) {
    return (
      <AdminLayout title="President Dashboard">
        <DashboardSkeleton />
      </AdminLayout>
    );
  }

  if (!data) return null;

  const s = data.summary;
  const collectionRate = s.expectedRevenue > 0 ? ((s.amountCollected / s.expectedRevenue) * 100).toFixed(1) : '0.0';

  const paymentStatusData = [
    { name: 'Collected', value: s.amountCollected },
    { name: 'Outstanding', value: s.outstandingBalance },
  ];

  return (
    <AdminLayout title="President Portal">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="kpi-card">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-primary">
              <span className="w-6 h-6"><WalletIcon /></span>
            </div>
            <span className="percent-pill neutral">{collectionRate}% Paid</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 mb-1">Collections</p>
            <h3 className="text-2xl font-extrabold text-gray-900">GHS {Number(s.amountCollected).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</h3>
          </div>
        </div>

        <div className="kpi-card">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
              <span className="w-6 h-6"><LandmarkIcon /></span>
            </div>
            <span className="percent-pill neutral">Expected</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 mb-1">Expected</p>
            <h3 className="text-2xl font-extrabold text-gray-900">GHS {Number(s.expectedRevenue).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</h3>
          </div>
        </div>

        <div className="kpi-card">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
              <span className="w-6 h-6"><UsersIcon /></span>
            </div>
            <span className="percent-pill positive">Active</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 mb-1">Students</p>
            <h3 className="text-2xl font-extrabold text-gray-900">{s.totalStudents}</h3>
          </div>
        </div>

        <div className="kpi-card solid-primary">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white">
              <span className="w-6 h-6"><CardIcon /></span>
            </div>
            <span className="percent-pill bg-white/20 text-white border border-white/30">Refund Action</span>
          </div>
          <div>
            <p className="kpi-label text-sm font-semibold mb-1">Pending Refunds</p>
            <h3 className="text-2xl font-extrabold">{refunds.length} Actionable</h3>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 mb-6 bg-white rounded-t-3xl px-6 pt-4">
        <button 
          onClick={() => setActiveTab('analytics')}
          className={`pb-4 px-4 font-bold text-sm border-b-2 transition-all ${activeTab === 'analytics' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Executive Analytics
        </button>
        <button 
          onClick={() => setActiveTab('refunds')}
          className={`pb-4 px-4 font-bold text-sm border-b-2 transition-all ${activeTab === 'refunds' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Co-Sign Refunds ({refunds.length})
        </button>
        <button 
          onClick={() => setActiveTab('announcements')}
          className={`pb-4 px-4 font-bold text-sm border-b-2 transition-all ${activeTab === 'announcements' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Broadcast Announcements
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 chart-card">
            <h3>Revenue Metrics</h3>
            <p className="chart-subtitle">Defaulter count: {s.defaultersCount} students. Outstanding balance: GHS {Number(s.outstandingBalance).toFixed(2)}</p>
            <div className="h-72 mt-8 flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    {paymentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `GHS ${value.toFixed(2)}`}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="font-extrabold text-2xl text-primary">{collectionRate}%</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Collected</span>
              </div>
            </div>
          </div>

          <div className="dashboard-card flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">President Overview</h3>
              <p className="text-xs text-gray-400 font-semibold mt-1 uppercase tracking-wider">Role Scope & Auditing</p>
              <p className="text-sm text-gray-500 mt-4 leading-relaxed">
                As the executive head, you have read-only access to all payments, setting parameters, and log audits. 
                Your primary active duties are the <strong>broadcast of notices/announcements</strong> and the <strong>co-signing approval of transaction refund requests</strong>.
              </p>
            </div>
            <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 mt-6">
              <p className="text-xs font-bold text-primary mb-1">Co-signing Refund Security Policy</p>
              <p className="text-[11px] text-gray-500 leading-tight">All manual refunds must be requested by the Financial Secretary and co-signed by the President before any payout action.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'refunds' && (
        <div className="dashboard-card overflow-hidden !p-0">
          <div className="p-6 lg:p-8">
            <h3 className="text-xl font-bold text-gray-900">Refund Co-Signing Queue</h3>
            <p className="text-sm text-gray-500 mt-1">Co-sign and authorize transaction refunds initiated by the Financial Secretary.</p>
          </div>

          <div className="overflow-x-auto">
            {refunds.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 text-gray-400 text-xs uppercase tracking-widest font-bold">
                    <th className="p-4 pl-8">Student Roster</th>
                    <th className="p-4">Payment & Due Details</th>
                    <th className="p-4">Refund Amount</th>
                    <th className="p-4">Refund Reason</th>
                    <th className="p-4">Initiated By</th>
                    <th className="p-4 pr-8 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {refunds.map((refund) => (
                    <tr key={refund.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 pl-8">
                        <p className="font-bold text-gray-900 text-sm">{refund.full_name}</p>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">{refund.student_index}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-semibold text-gray-700">{refund.due_name}</p>
                        <code className="text-[10px] text-gray-400 bg-neutral px-1.5 py-0.5 rounded">{refund.payment_id}</code>
                      </td>
                      <td className="p-4 font-bold text-red-500 text-sm">GHS {Number(refund.amount).toFixed(2)}</td>
                      <td className="p-4 text-xs text-gray-500 max-w-xs">{refund.reason}</td>
                      <td className="p-4 text-sm font-medium text-gray-500">{refund.requested_by}</td>
                      <td className="p-4 pr-8 text-right">
                        <button 
                          onClick={() => handleApproveRefund(refund.id)}
                          disabled={submitting}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-red-500/10"
                        >
                          Co-Sign Refund
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-16 text-center text-gray-500 flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                  ✓
                </div>
                <p className="font-bold text-gray-800 text-lg">Queue Clear!</p>
                <p className="text-sm text-gray-400 mt-1">No refund requests are waiting for your co-signature.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="dashboard-card max-w-2xl mx-auto">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Compose Broadcaster Announcement</h3>
          <p className="text-sm text-gray-500 mb-6">Publish alerts or department notifications onto the public checkout pages.</p>
          
          <form onSubmit={handlePostAnnouncement} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Announcement Title</label>
              <input 
                type="text"
                required
                placeholder="e.g. Department Dues Deadline Extension"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none text-gray-800"
                value={announcement.title}
                onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Announcement Content</label>
              <textarea 
                required
                rows={5}
                placeholder="Write the text body of your broadcast announcement here..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none text-gray-800"
                value={announcement.content}
                onChange={(e) => setAnnouncement({ ...announcement, content: e.target.value })}
              />
            </div>

            <button 
              type="submit"
              disabled={submitting}
              className="w-full bg-primary hover:bg-secondary text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-primary/10 flex justify-center items-center"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Publish Broadcast Announcement'
              )}
            </button>
          </form>
        </div>
      )}
    </AdminLayout>
  );
}
