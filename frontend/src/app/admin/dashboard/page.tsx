'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  UsersIcon, LandmarkIcon, WalletIcon, CardIcon, 
  ReceiptIcon, ArrowRightIcon, ChartIcon 
} from '@/components/Icons';
import { DashboardSkeleton } from '@/components/Skeletons';
import Link from 'next/link';

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

const PIE_COLORS = ['#ffffff', '#A7F3D0', '#10B981', '#064E3B'];
const DONUT_COLORS = ['#064E3B', '#10B981', '#A7F3D0', '#D1FAE5'];

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loadingData, setLoadingData] = useState(true);

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

  if (loading || loadingData) {
    return (
      <AdminLayout title="Dashboard Overview">
        <DashboardSkeleton />
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout title="Dashboard Overview">
        <div className="text-center py-12 text-gray-500">No data available to display</div>
      </AdminLayout>
    );
  }

  const s = data.summary;
  const collectionRate = s.expectedRevenue > 0 ? ((s.amountCollected / s.expectedRevenue) * 100).toFixed(1) : '0.0';

  // Format data for Payment Status Donut
  const paymentStatusData = [
    { name: 'Collected', value: s.amountCollected },
    { name: 'Outstanding', value: s.outstandingBalance },
  ];

  // Format monthly collections for Bar Chart
  const monthlyData = data.charts.monthlyCollections.map(m => ({
    ...m,
    monthShort: new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short' })
  })).reverse();

  return (
    <AdminLayout title="Sales Report">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN (Spans 2) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* KPI Cards (2x2 Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Dark Blue Card */}
            <div className="kpi-card solid-primary">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white">
                  <span className="w-6 h-6"><WalletIcon /></span>
                </div>
                <span className="percent-pill bg-white/20 text-white border border-white/30">+15.2%</span>
              </div>
              <div>
                <p className="kpi-label text-sm font-semibold mb-1">Amount Collected</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-extrabold">GHS {Number(s.amountCollected).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</h3>
                  <span className="text-xs text-white/60">Total</span>
                </div>
              </div>
            </div>

            {/* White Card 1 */}
            <div className="kpi-card">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                  <span className="w-6 h-6"><LandmarkIcon /></span>
                </div>
                <span className="percent-pill neutral">Expected</span>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-500 mb-1">Expected Revenue</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-extrabold text-gray-900">GHS {Number(s.expectedRevenue).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</h3>
                </div>
              </div>
            </div>

            {/* White Card 2 */}
            <div className="kpi-card">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                  <span className="w-6 h-6"><UsersIcon /></span>
                </div>
                <span className="percent-pill positive">Active</span>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-500 mb-1">Total Students</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-extrabold text-gray-900">{s.totalStudents}</h3>
                  <span className="text-xs text-gray-400 font-medium">Students</span>
                </div>
              </div>
            </div>

            {/* White Card 3 */}
            <div className="kpi-card">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                  <span className="w-6 h-6"><CardIcon /></span>
                </div>
                <span className="percent-pill negative">Unpaid</span>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-500 mb-1">Outstanding Balance</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-extrabold text-gray-900">GHS {Number(s.outstandingBalance).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</h3>
                </div>
              </div>
            </div>
          </div>

          {/* Wide Bar Chart (Customer Habits -> Monthly Collections) */}
          <div className="chart-card">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3>Collection Habits</h3>
                <p className="chart-subtitle mb-0">Track your payment trends over time</p>
              </div>
              <div className="flex items-center gap-2">
                 <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                 <span className="text-xs font-bold text-gray-500">Collected</span>
              </div>
            </div>
            
            <div className="h-72 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="monthShort" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF', fontWeight: 600 }} />
                  <Tooltip 
                    cursor={{ fill: '#F9FAFB' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                    formatter={(value: number) => [`GHS ${value.toFixed(2)}`, 'Collected']}
                  />
                  <Bar dataKey="total" fill="#10B981" radius={[20, 20, 20, 20]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN (Spans 1) */}
        <div className="space-y-6 flex flex-col">
          
          {/* Tall Gradient Pie Chart */}
          <div className="gradient-card flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3>Revenue Statistic</h3>
                <p className="chart-subtitle">Track your revenue distribution</p>
              </div>
              <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm">Overall</span>
            </div>

            <div className="flex-1 flex items-center justify-center min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentStatusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
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
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)', backgroundColor: '#fff', color: '#000' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/90 font-medium">Collected</span>
                <div className="flex items-center gap-3">
                  <span className="text-white font-bold">GHS {Number(s.amountCollected).toFixed(2)}</span>
                  <span className="percent-pill bg-white/20 text-white border border-white/30 w-16 justify-center">{collectionRate}%</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/90 font-medium">Outstanding</span>
                <div className="flex items-center gap-3">
                  <span className="text-white font-bold">GHS {Number(s.outstandingBalance).toFixed(2)}</span>
                  <span className="percent-pill bg-black/20 text-white border border-black/10 w-16 justify-center">{(100 - Number(collectionRate)).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Small Donut Chart (Customer Growth -> Level Breakdown) */}
          <div className="chart-card">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3>Level Growth</h3>
                <p className="chart-subtitle mb-0">Payments by academic level</p>
              </div>
            </div>
            <div className="h-48 flex items-center justify-center relative">
               {/* Quick custom visualization instead of complex Recharts to match the exact bubbles look, or just use a Donut */}
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.charts.levelWisePayments}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="totalPaid"
                      nameKey="level"
                      stroke="none"
                    >
                      {data.charts.levelWisePayments.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `GHS ${value.toFixed(2)}`}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="font-extrabold text-xl text-primary">{s.totalStudents}</span>
                </div>
            </div>
          </div>

        </div>
      </div>

      {/* BOTTOM ROW: Recent Payments Table */}
      <div className="dashboard-card overflow-hidden !p-0 mt-6">
        <div className="p-6 lg:p-8 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Recent Transactions</h3>
            <p className="text-sm text-gray-500 mt-1">Latest payments across all levels</p>
          </div>
          <Link href="/admin/payments" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-primary hover:text-white transition-colors">
            <span className="w-5 h-5"><ArrowRightIcon /></span>
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          {data.recentPayments.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-gray-400 text-xs uppercase tracking-widest font-bold">
                  <th className="p-4 pl-8">Student</th>
                  <th className="p-4">Due Name</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Method</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-8">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.recentPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 pl-8">
                      <p className="font-bold text-gray-900 text-sm">{payment.student_name}</p>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">{payment.student_id}</p>
                    </td>
                    <td className="p-4 text-sm font-semibold text-gray-700">{payment.due_name}</td>
                    <td className="p-4 font-bold text-gray-900 text-sm">GHS {Number(payment.amount).toFixed(2)}</td>
                    <td className="p-4">
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full uppercase tracking-wider">
                        {payment.payment_method.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`status-badge ${payment.status}`}>
                        <span className="dot"></span>
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-medium text-gray-500 pr-8">
                      {new Date(payment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                <span className="w-8 h-8 text-gray-400"><ChartIcon /></span>
              </div>
              <p className="font-medium">No recent payments found</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
