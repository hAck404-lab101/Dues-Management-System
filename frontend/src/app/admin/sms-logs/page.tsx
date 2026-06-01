'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { SmsIcon, CheckCircleIcon, ExclamationIcon } from '@/components/Icons';

type SmsLog = {
  id: string;
  created_at: string;
  recipient_phone: string;
  message_type?: string;
  provider?: string;
  status: 'sent' | 'failed';
  message: string;
  provider_response?: string;
};

export default function SmsLogsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState('');
  const [phone, setPhone] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role === 'student')) router.push('/admin/login');
  }, [user, loading, router]);

  const fetchLogs = useCallback(async () => {
    setLoadingData(true);
    try {
      const params: Record<string, string | number> = { page, limit: 25 };
      if (status) params.status = status;
      if (phone) params.phone = phone;
      const res = await api.get('/admin/sms-logs', { params });
      if (res.data.success) {
        setLogs(res.data.data || []);
        setTotalPages(res.data.pagination?.pages || 1);
      }
    } catch (error: unknown) {
      const message = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      toast.error(message || 'Failed to load SMS logs');
    } finally {
      setLoadingData(false);
    }
  }, [page, status, phone]);

  useEffect(() => {
    if (user && user.role !== 'student') fetchLogs();
  }, [user, fetchLogs]);

  return (
    <Layout title="SMS Logs">
      <div className="space-y-5">
        <div className="card p-5 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-primary flex items-center gap-2">
              <span className="w-5 h-5"><SmsIcon /></span>
              <span>SMS Delivery Logs</span>
            </h2>
            <p className="text-sm text-gray-500 mt-1">Track sent and failed SMS messages, including provider responses.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              className="input-field w-full sm:w-44"
              placeholder="Search phone"
              value={phone}
              onChange={e => { setPhone(e.target.value); setPage(1); }}
            />
            <select className="input-field w-full sm:w-36" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All status</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>
            <button className="btn-outline" onClick={fetchLogs}>Refresh</button>
          </div>
        </div>

        <div className="card overflow-x-auto">
          {loadingData ? (
            <div className="space-y-3 p-4">{[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : logs.length === 0 ? (
            <p className="text-gray-500 text-center py-12">No SMS logs found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left border-b">
                  <th className="py-3 px-4 font-semibold text-gray-600 text-xs uppercase">Time</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 text-xs uppercase">Phone</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 text-xs uppercase">Type</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 text-xs uppercase">Provider</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 text-xs uppercase">Status</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 text-xs uppercase">Message</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 text-xs uppercase">Response</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <Fragment key={log.id}>
                    <tr className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('en-GH', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">{log.recipient_phone}</td>
                      <td className="py-3 px-4 text-xs text-gray-500">{log.message_type || 'general'}</td>
                      <td className="py-3 px-4 text-xs text-gray-500">{log.provider || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${log.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          <span className="w-3 h-3">{log.status === 'sent' ? <CheckCircleIcon /> : <ExclamationIcon />}</span>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-gray-700">{log.message}</td>
                      <td className="py-3 px-4">
                        <button onClick={() => setExpanded(expanded === log.id ? null : log.id)} className="text-xs text-primary hover:underline">
                          {expanded === log.id ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>
                    {expanded === log.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Message</p>
                              <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-white p-3 rounded-lg border">{log.message}</pre>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Provider Response</p>
                              <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-white p-3 rounded-lg border">{log.provider_response || 'No response saved'}</pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 p-4 border-t">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-outline px-3 py-1 text-sm disabled:opacity-40">Prev</button>
              <span className="text-sm text-gray-600 px-2 py-1">Page {page} of {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-outline px-3 py-1 text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
