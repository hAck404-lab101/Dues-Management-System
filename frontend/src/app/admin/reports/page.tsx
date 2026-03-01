'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';

type Tab = 'revenue' | 'paid' | 'defaulters';

const LEVELS = ['', '100', '200', '300', '400'];

export default function AdminReportsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>('revenue');

  const [dues, setDues] = useState<any[]>([]);
  const [filters, setFilters] = useState({ level: '', programme: '', academicYear: '', dueId: '' });

  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [paidData, setPaidData] = useState<any[]>([]);
  const [defaultersData, setDefaultersData] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role === 'student')) router.push('/admin/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user && user.role !== 'student') {
      api.get('/dues').then(r => { if (r.data.success) setDues(r.data.data); });
    }
  }, [user]);

  const buildParams = () => {
    const p: any = {};
    if (filters.level) p.level = filters.level;
    if (filters.programme) p.programme = filters.programme;
    if (filters.academicYear) p.academicYear = filters.academicYear;
    if (filters.dueId) p.dueId = filters.dueId;
    return p;
  };

  const fetchReport = useCallback(async (t: Tab) => {
    setLoadingData(true);
    try {
      const params = buildParams();
      if (t === 'revenue') {
        const r = await api.get('/reports/revenue', { params });
        if (r.data.success) setRevenueData(r.data.data);
      } else if (t === 'paid') {
        const r = await api.get('/reports/paid-students', { params });
        if (r.data.success) setPaidData(r.data.data);
      } else {
        const r = await api.get('/reports/defaulters', { params });
        if (r.data.success) setDefaultersData(r.data.data);
      }
    } catch {
      toast.error('Failed to load report');
    } finally {
      setLoadingData(false);
    }
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (user && user.role !== 'student') fetchReport(tab); }, [user, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFetch = () => fetchReport(tab);

  const exportCSV = async () => {
    try {
      const typeMap: Record<Tab, string> = { revenue: 'revenue', paid: 'paid-students', defaulters: 'defaulters' };
      const params = { ...buildParams(), reportType: typeMap[tab] };
      const r = await api.get('/reports/export/csv', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `ucc-report-${tab}-${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('CSV downloaded');
    } catch {
      toast.error('Export failed');
    }
  };

  const exportPDF = async () => {
    try {
      const typeMap: Record<Tab, string> = { revenue: 'revenue', paid: 'paid-students', defaulters: 'defaulters' };
      const params = { ...buildParams(), reportType: typeMap[tab] };
      const r = await api.get('/reports/export/pdf', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `ucc-report-${tab}-${Date.now()}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch {
      toast.error('PDF export failed');
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'revenue', label: '📊 Revenue Report' },
    { key: 'paid', label: '✅ Paid Students' },
    { key: 'defaulters', label: '⚠️ Defaulters' },
  ];

  return (
    <Layout title="Reports">
      {/* Tab Bar */}
      <div className="flex flex-wrap gap-2 mb-6 border-b pb-4">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-primary text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary hover:text-primary'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <h3 className="font-semibold text-gray-700 mb-3">Filter Report</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="label">Level</label>
            <select className="input-field" value={filters.level} onChange={e => setFilters(f => ({ ...f, level: e.target.value }))}>
              {LEVELS.map(l => <option key={l} value={l}>{l ? `Level ${l}` : 'All Levels'}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Programme</label>
            <input type="text" className="input-field" placeholder="e.g. Computer Science" value={filters.programme} onChange={e => setFilters(f => ({ ...f, programme: e.target.value }))} />
          </div>
          <div>
            <label className="label">Academic Year</label>
            <input type="text" className="input-field" placeholder="e.g. 2024/2025" value={filters.academicYear} onChange={e => setFilters(f => ({ ...f, academicYear: e.target.value }))} />
          </div>
          <div>
            <label className="label">Due</label>
            <select className="input-field" value={filters.dueId} onChange={e => setFilters(f => ({ ...f, dueId: e.target.value }))}>
              <option value="">All Dues</option>
              {dues.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={handleFetch} className="btn-primary px-6">Apply Filters</button>
          <button onClick={exportCSV} className="btn-outline px-6">⬇ CSV</button>
          <button onClick={exportPDF} className="btn-secondary px-6">⬇ PDF</button>
        </div>
      </div>

      {/* Tables */}
      <div className="card overflow-x-auto">
        {loadingData ? (
          <div className="space-y-3 p-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
        ) : (
          <>
            {tab === 'revenue' && (
              <>
                {revenueData.length === 0 ? <EmptyState /> : (
                  <>
                    <RevenueTotal data={revenueData} />
                    <table className="w-full text-sm mt-4">
                      <thead>
                        <tr className="border-b bg-gray-50 text-left">
                          <th className="py-3 px-3 font-semibold text-gray-600">Due Name</th>
                          <th className="py-3 px-3 font-semibold text-gray-600">Students</th>
                          <th className="py-3 px-3 font-semibold text-gray-600">Expected (GHS)</th>
                          <th className="py-3 px-3 font-semibold text-gray-600">Collected (GHS)</th>
                          <th className="py-3 px-3 font-semibold text-gray-600">Outstanding (GHS)</th>
                          <th className="py-3 px-3 font-semibold text-gray-600">% Collected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revenueData.map((row, i) => {
                          const pct = row.expected_revenue > 0 ? ((row.collected / row.expected_revenue) * 100).toFixed(1) : '0.0';
                          return (
                            <tr key={i} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-3 font-medium">{row.due_name}</td>
                              <td className="py-3 px-3">{row.total_students}</td>
                              <td className="py-3 px-3">GHS {Number(row.expected_revenue).toFixed(2)}</td>
                              <td className="py-3 px-3 text-green-700 font-medium">GHS {Number(row.collected).toFixed(2)}</td>
                              <td className="py-3 px-3 text-red-600 font-medium">GHS {Number(row.outstanding).toFixed(2)}</td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-20 bg-gray-200 rounded-full h-2">
                                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(parseFloat(pct), 100)}%` }} />
                                  </div>
                                  <span className="text-xs text-gray-600">{pct}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </>
                )}
              </>
            )}

            {tab === 'paid' && (
              <>
                {paidData.length === 0 ? <EmptyState msg="No fully paid students found." /> : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left">
                        <th className="py-3 px-3 font-semibold text-gray-600">Student</th>
                        <th className="py-3 px-3 font-semibold text-gray-600">Index No.</th>
                        <th className="py-3 px-3 font-semibold text-gray-600">Level</th>
                        <th className="py-3 px-3 font-semibold text-gray-600">Programme</th>
                        <th className="py-3 px-3 font-semibold text-gray-600">Due</th>
                        <th className="py-3 px-3 font-semibold text-gray-600">Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paidData.map((row, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-3 font-medium">{row.full_name}</td>
                          <td className="py-3 px-3 font-mono text-gray-600">{row.student_id}</td>
                          <td className="py-3 px-3">Lvl {row.level}</td>
                          <td className="py-3 px-3 max-w-[160px] truncate">{row.programme}</td>
                          <td className="py-3 px-3">{row.due_name}</td>
                          <td className="py-3 px-3 text-green-700 font-semibold">GHS {row.total_paid.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}

            {tab === 'defaulters' && (
              <>
                {defaultersData.length === 0 ? <EmptyState msg="No defaulters found — great news! 🎉" /> : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left">
                        <th className="py-3 px-3 font-semibold text-gray-600">Student</th>
                        <th className="py-3 px-3 font-semibold text-gray-600">Index No.</th>
                        <th className="py-3 px-3 font-semibold text-gray-600">Level</th>
                        <th className="py-3 px-3 font-semibold text-gray-600">Due</th>
                        <th className="py-3 px-3 font-semibold text-gray-600">Assigned</th>
                        <th className="py-3 px-3 font-semibold text-gray-600">Paid</th>
                        <th className="py-3 px-3 font-semibold text-gray-600">Balance Owed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {defaultersData.map((row, i) => (
                        <tr key={i} className="border-b hover:bg-red-50">
                          <td className="py-3 px-3 font-medium">{row.full_name}</td>
                          <td className="py-3 px-3 font-mono text-gray-600">{row.student_id}</td>
                          <td className="py-3 px-3">Lvl {row.level}</td>
                          <td className="py-3 px-3">{row.due_name}</td>
                          <td className="py-3 px-3">GHS {row.assigned_amount.toFixed(2)}</td>
                          <td className="py-3 px-3 text-green-700">GHS {row.total_paid.toFixed(2)}</td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-red-600">GHS {row.balance.toFixed(2)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

function EmptyState({ msg = 'No data available for the selected filters.' }) {
  return <p className="text-gray-500 text-center py-10">{msg}</p>;
}

function RevenueTotal({ data }: { data: any[] }) {
  const totals = data.reduce((acc, row) => ({
    expected: acc.expected + row.expected_revenue,
    collected: acc.collected + row.collected,
    outstanding: acc.outstanding + row.outstanding,
  }), { expected: 0, collected: 0, outstanding: 0 });

  return (
    <div className="grid grid-cols-3 gap-4 mb-2">
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
        <p className="text-xs text-blue-600 font-medium">Total Expected</p>
        <p className="text-lg font-bold text-blue-800">GHS {totals.expected.toFixed(2)}</p>
      </div>
      <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
        <p className="text-xs text-green-600 font-medium">Total Collected</p>
        <p className="text-lg font-bold text-green-800">GHS {totals.collected.toFixed(2)}</p>
      </div>
      <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-center">
        <p className="text-xs text-red-500 font-medium">Total Outstanding</p>
        <p className="text-lg font-bold text-red-700">GHS {totals.outstanding.toFixed(2)}</p>
      </div>
    </div>
  );
}
