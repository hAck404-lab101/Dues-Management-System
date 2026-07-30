'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { TableSkeleton } from '@/components/Skeletons';

interface SystemLog {
  id: string;
  category: string;
  level: string;
  event: string;
  message: string;
  context: any;
  ip: string | null;
  created_at: string;
}

interface AuditLog {
  id: string;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  message: string;
  ip_address: string | null;
  created_at: string;
}

interface SmsLog {
  id: string;
  recipient_phone: string;
  message: string;
  message_type: string;
  status: string;
  created_at: string;
}

export default function SystemLogsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'system' | 'audit' | 'sms'>('system');
  const [loadingData, setLoadingData] = useState(true);

  // Data lists
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);

  // Filtering & Pagination
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Tailing & Details
  const [tailEnabled, setTailEnabled] = useState(false);
  const [selectedLogContext, setSelectedLogContext] = useState<any>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/admin/login');
    }
  }, [user, loading, router]);

  const fetchData = async (quiet = false) => {
    if (!quiet) setLoadingData(true);
    try {
      if (activeSubTab === 'system') {
        const res = await api.get('/admin/system-logs', {
          params: { page, limit: 30, search: search.trim() || undefined, level: levelFilter || undefined, category: categoryFilter || undefined }
        });
        if (res.data?.success) {
          setSystemLogs(res.data.data);
          setTotalPages(res.data.pagination.pages || 1);
        }
      } else if (activeSubTab === 'audit') {
        const res = await api.get('/admin/audit-logs', {
          params: { page, limit: 30, action: search.trim() || undefined }
        });
        if (res.data?.success) {
          setAuditLogs(res.data.data);
          setTotalPages(res.data.pagination.pages || 1);
        }
      } else if (activeSubTab === 'sms') {
        const res = await api.get('/admin/sms-logs', {
          params: { page, limit: 30, phone: search.trim() || undefined }
        });
        if (res.data?.success) {
          setSmsLogs(res.data.data);
          setTotalPages(res.data.pagination.pages || 1);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load logs');
    } finally {
      if (!quiet) setLoadingData(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeSubTab, page, levelFilter, categoryFilter]);

  // Handle Search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (user && user.role === 'admin') {
        setPage(1);
        fetchData();
      }
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Handle active tailing
  useEffect(() => {
    if (tailEnabled && activeSubTab === 'system') {
      pollTimerRef.current = setInterval(() => {
        fetchData(true);
      }, 5000);
    } else {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tailEnabled, activeSubTab, page, search, levelFilter, categoryFilter]);

  const handleSubTabChange = (tab: 'system' | 'audit' | 'sms') => {
    setActiveSubTab(tab);
    setSearch('');
    setLevelFilter('');
    setCategoryFilter('');
    setPage(1);
    setTailEnabled(false);
  };

  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: any[] = [];
    let filename = '';

    if (activeSubTab === 'system') {
      headers = ['Timestamp', 'Level', 'Category', 'Event', 'Message', 'IP Address'];
      rows = systemLogs.map(l => [
        new Date(l.created_at).toISOString(),
        l.level,
        l.category,
        l.event,
        l.message?.replace(/"/g, '""') || '',
        l.ip || ''
      ]);
      filename = `system_logs_${Date.now()}.csv`;
    } else if (activeSubTab === 'audit') {
      headers = ['Timestamp', 'Admin Email', 'Action', 'Resource', 'Message', 'IP Address'];
      rows = auditLogs.map(l => [
        new Date(l.created_at).toISOString(),
        l.user_email,
        l.action,
        l.resource_type,
        l.message?.replace(/"/g, '""') || '',
        l.ip_address || ''
      ]);
      filename = `audit_logs_${Date.now()}.csv`;
    } else if (activeSubTab === 'sms') {
      headers = ['Timestamp', 'Recipient Phone', 'Message Type', 'Message', 'Status'];
      rows = smsLogs.map(l => [
        new Date(l.created_at).toISOString(),
        l.recipient_phone,
        l.message_type,
        l.message?.replace(/"/g, '""') || '',
        l.status
      ]);
      filename = `sms_logs_${Date.now()}.csv`;
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map((val: string) => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Logs CSV exported successfully');
  };

  return (
    <AdminLayout title="System Logs & Auditing">
      
      {/* Sub Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
          <button
            onClick={() => handleSubTabChange('system')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'system' ? 'bg-primary text-white shadow-md' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            System Debug Logs
          </button>
          <button
            onClick={() => handleSubTabChange('audit')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'audit' ? 'bg-primary text-white shadow-md' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Admin Audit Trail
          </button>
          <button
            onClick={() => handleSubTabChange('sms')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'sms' ? 'bg-primary text-white shadow-md' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            SMS Delivery Logs
          </button>
        </div>

        <div className="flex items-center gap-3">
          {activeSubTab === 'system' && (
            <label className="flex items-center gap-2 text-xs font-bold text-gray-500 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={tailEnabled} 
                onChange={e => setTailEnabled(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span>Tailing Mode (5s)</span>
            </label>
          )}
          <button
            onClick={handleExportCSV}
            className="btn-secondary py-2 px-5 text-xs font-bold"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="card mb-6 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Search logs</label>
            <input
              className="input-field py-2 text-xs"
              placeholder={
                activeSubTab === 'system'
                  ? 'Search by event or message...'
                  : activeSubTab === 'audit'
                  ? 'Search by action...'
                  : 'Search by phone number...'
              }
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {activeSubTab === 'system' && (
            <>
              <div>
                <label className="label">Log Level</label>
                <select
                  className="input-field py-2 text-xs font-semibold"
                  value={levelFilter}
                  onChange={e => { setLevelFilter(e.target.value); setPage(1); }}
                >
                  <option value="">All Levels</option>
                  <option value="debug">Debug</option>
                  <option value="info">Info</option>
                  <option value="warn">Warn</option>
                  <option value="error">Error</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="label">Category</label>
                <select
                  className="input-field py-2 text-xs font-semibold"
                  value={categoryFilter}
                  onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
                >
                  <option value="">All Categories</option>
                  <option value="payment">Payment</option>
                  <option value="webhook">Webhook</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="auth">Auth</option>
                  <option value="public_access">Public Access</option>
                  <option value="job">Job</option>
                  <option value="integration">Integration</option>
                  <option value="error">Error</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="card overflow-x-auto p-0">
        {loadingData ? (
          <TableSkeleton rows={7} columns={6} />
        ) : (
          <>
            {activeSubTab === 'system' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-gray-100">
                    <th className="py-4 px-6">Timestamp</th>
                    <th className="py-4 px-4">Level</th>
                    <th className="py-4 px-4">Category</th>
                    <th className="py-4 px-4">Event</th>
                    <th className="py-4 px-4">Message</th>
                    <th className="py-4 px-6 text-right">Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-medium text-gray-700">
                  {systemLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50/40 transition-colors">
                      <td className="py-3.5 px-6 font-mono text-gray-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('en-GH')}
                      </td>
                      <td className="py-3.5 px-4 uppercase font-bold">
                        <span className={`px-2 py-0.5 rounded-md ${
                          log.level === 'critical' || log.level === 'error'
                            ? 'bg-rose-50 text-rose-600'
                            : log.level === 'warn'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-blue-50 text-blue-600'
                        }`}>
                          {log.level}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gray-600">{log.category}</td>
                      <td className="py-3.5 px-4 font-bold text-primary">{log.event}</td>
                      <td className="py-3.5 px-4 max-w-sm truncate leading-relaxed">{log.message}</td>
                      <td className="py-3.5 px-6 text-right">
                        <button
                          onClick={() => setSelectedLogContext(log.context)}
                          disabled={!log.context}
                          className="text-primary hover:underline font-bold disabled:opacity-30 disabled:no-underline"
                        >
                          View JSON
                        </button>
                      </td>
                    </tr>
                  ))}
                  {systemLogs.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-10 text-gray-500 font-semibold">No system logs found</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {activeSubTab === 'audit' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-gray-100">
                    <th className="py-4 px-6">Timestamp</th>
                    <th className="py-4 px-4">Admin Email</th>
                    <th className="py-4 px-4">Action</th>
                    <th className="py-4 px-4">Resource</th>
                    <th className="py-4 px-6">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-medium text-gray-700">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50/40 transition-colors">
                      <td className="py-3.5 px-6 font-mono text-gray-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('en-GH')}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gray-950">{log.user_email}</td>
                      <td className="py-3.5 px-4 font-bold text-primary">{log.action}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 bg-gray-100 border rounded-md uppercase font-bold text-[10px] text-gray-500">
                          {log.resource_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 leading-relaxed text-gray-600">{log.message}</td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-10 text-gray-500 font-semibold">No audit logs found</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {activeSubTab === 'sms' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-gray-100">
                    <th className="py-4 px-6">Timestamp</th>
                    <th className="py-4 px-4">Recipient Phone</th>
                    <th className="py-4 px-4">Type</th>
                    <th className="py-4 px-4">Message</th>
                    <th className="py-4 px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-medium text-gray-700">
                  {smsLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50/40 transition-colors">
                      <td className="py-3.5 px-6 font-mono text-gray-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('en-GH')}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-800">{log.recipient_phone}</td>
                      <td className="py-3.5 px-4 capitalize text-gray-500">{log.message_type}</td>
                      <td className="py-3.5 px-4 max-w-sm truncate leading-relaxed text-gray-600">{log.message}</td>
                      <td className="py-3.5 px-6">
                        <span className={`status-badge ${log.status === 'delivered' ? 'approved' : 'unpaid'}`}>
                          <span className="dot" />
                          <span className="uppercase text-[10px]">{log.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                  {smsLogs.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-10 text-gray-500 font-semibold">No SMS logs found</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {/* Pagination controls */}
      {!loadingData && totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <p className="text-xs font-bold text-gray-400">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="btn-outline px-4 py-1.5 text-xs font-bold disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="btn-outline px-4 py-1.5 text-xs font-bold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Expandable context modal */}
      {selectedLogContext && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedLogContext(null)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <h3 className="text-base font-extrabold text-primary uppercase">Log Raw Context</h3>
              <button 
                onClick={() => setSelectedLogContext(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
              >
                &times;
              </button>
            </div>
            <div className="p-6">
              <pre className="bg-gray-950 text-green-400 p-5 rounded-2xl text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                {JSON.stringify(selectedLogContext, null, 2)}
              </pre>
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end">
              <button onClick={() => setSelectedLogContext(null)} className="btn-secondary text-xs px-6 py-2">
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}
