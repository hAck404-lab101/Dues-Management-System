'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { UsersIcon, LandmarkIcon, WalletIcon, CardIcon, ShieldIcon, ReceiptIcon, SettingsIcon, SmsIcon, ImportIcon, CertificateIcon } from '@/components/Icons';
import { DashboardSkeleton } from '@/components/Skeletons';
import {
  getRoleLabel,
  getRoleDashboardDescription,
  canViewStudents,
  canImportStudents,
  canViewClearance,
  canManageDues,
  canViewPayments,
  canViewReports,
  canUseBulkSms,
  canManageSettings
} from '@/lib/roleAccess';

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

interface DashboardCard {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  className: string;
  visible: boolean;
}

interface QuickAction {
  href: string;
  label: string;
  text: string;
  icon: React.ReactNode;
  visible: boolean;
}

const money = (value: number) => `GHS ${Number(value || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

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

  const role = user?.role;
  const roleLabel = getRoleLabel(role);
  const dashboardTitle = `${roleLabel} Dashboard`;
  const dashboardDescription = getRoleDashboardDescription(role);

  const quickActions = useMemo<QuickAction[]>(() => [
    { href: '/admin/students', label: 'Student Records', text: 'View and update student information.', icon: <UsersIcon />, visible: canViewStudents(role) },
    { href: '/admin/import', label: 'Bulk Import', text: 'Upload student lists in batches.', icon: <ImportIcon />, visible: canImportStudents(role) },
    { href: '/admin/clearance', label: 'Clearance', text: 'Check clearance and outstanding records.', icon: <CertificateIcon />, visible: canViewClearance(role) },
    { href: '/admin/dues', label: 'Manage Dues', text: 'Create and assign dues.', icon: <LandmarkIcon />, visible: canManageDues(role) },
    { href: '/admin/payments', label: 'Payments', text: 'Review online and manual payments.', icon: <CardIcon />, visible: canViewPayments(role) },
    { href: '/admin/reports', label: 'Reports', text: 'Review collections and balances.', icon: <ReceiptIcon />, visible: canViewReports(role) },
    { href: '/admin/bulk-sms', label: 'Bulk SMS', text: 'Send account and payment updates.', icon: <SmsIcon />, visible: canUseBulkSms(role) },
    { href: '/admin/settings', label: 'Settings', text: 'Configure portal and payment settings.', icon: <SettingsIcon />, visible: canManageSettings(role) }
  ], [role]);

  if (loading || loadingData) {
    return (
      <Layout title={dashboardTitle}>
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

  const cards: DashboardCard[] = [
    { title: 'Total Students', value: data.summary.totalStudents, icon: <UsersIcon />, className: 'bg-primary text-white', visible: canViewStudents(role) || role === 'admin' || role === 'president' },
    { title: 'Expected Revenue', value: money(data.summary.expectedRevenue), icon: <LandmarkIcon />, className: 'bg-indigo-600 text-white shadow-indigo-200', visible: canManageDues(role) || canViewReports(role) || canViewPayments(role) },
    { title: 'Amount Collected', value: money(data.summary.amountCollected), icon: <WalletIcon />, className: 'bg-emerald-600 text-white shadow-emerald-200', visible: canManageDues(role) || canViewReports(role) || canViewPayments(role) },
    { title: 'Outstanding Balance', value: money(data.summary.outstandingBalance), icon: <CardIcon />, className: 'bg-rose-600 text-white shadow-rose-200', visible: canManageDues(role) || canViewReports(role) || canViewPayments(role) },
    { title: 'Defaulters Count', value: data.summary.defaultersCount, icon: <ShieldIcon />, className: 'bg-amber-600 text-white shadow-amber-200', visible: canViewClearance(role) || role === 'admin' || role === 'president' },
    { title: 'Pending Payments', value: data.summary.pendingPayments, icon: <ReceiptIcon />, className: 'bg-sky-600 text-white shadow-sky-200', visible: canViewPayments(role) }
  ];

  const visibleCards = cards.filter(card => card.visible);
  const visibleQuickActions = quickActions.filter(action => action.visible);
  const showFinanceChart = canManageDues(role) || canViewReports(role) || role === 'admin' || role === 'president';
  const showRecordsChart = canViewStudents(role) || canViewClearance(role) || role === 'admin' || role === 'president';

  return (
    <Layout title={dashboardTitle}>
      <div className="mb-6 rounded-2xl bg-white border border-gray-100 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{roleLabel} Workspace</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary mt-1">{dashboardTitle}</h1>
            <p className="text-sm text-gray-500 mt-2 max-w-2xl">{dashboardDescription}</p>
          </div>
          <div className="px-4 py-2 rounded-xl bg-primary/5 text-primary font-bold text-sm border border-primary/10 self-start lg:self-center">
            Role: {roleLabel}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {visibleCards.map(card => (
          <div key={card.title} className={`card p-6 ${card.className}`}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium opacity-80 uppercase tracking-wider">{card.title}</h3>
                <p className="text-3xl font-extrabold mt-2">{card.value}</p>
              </div>
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {visibleQuickActions.length > 0 && (
        <div className="card mb-8">
          <h2 className="text-xl font-bold text-primary mb-4">Your Tools</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {visibleQuickActions.map(action => (
              <Link key={action.href} href={action.href} className="p-4 rounded-xl border border-gray-100 hover:border-primary/30 hover:shadow-md transition-all bg-gray-50 hover:bg-white">
                <div className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center mb-3">{action.icon}</div>
                <h3 className="font-extrabold text-primary text-sm">{action.label}</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{action.text}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {showFinanceChart && (
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
        )}

        {showRecordsChart && (
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
        )}
      </div>

      {canViewPayments(role) && (
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
      )}
    </Layout>
  );
}
