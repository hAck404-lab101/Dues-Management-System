'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const ACTION_COLORS: Record<string, string> = {
    CREATE_STUDENT: 'bg-green-100 text-green-800',
    UPDATE_STUDENT: 'bg-blue-100 text-blue-800',
    ACTIVATE_STUDENT: 'bg-green-100 text-green-800',
    DEACTIVATE_STUDENT: 'bg-red-100 text-red-800',
    APPROVE_PAYMENT: 'bg-green-100 text-green-800',
    REJECT_PAYMENT: 'bg-red-100 text-red-800',
    RESEND_SMS: 'bg-purple-100 text-purple-800',
    BULK_IMPORT_STUDENTS: 'bg-indigo-100 text-indigo-800',
    BULK_SMS: 'bg-purple-100 text-purple-800',
};

export default function AuditLogPage() {
    const router = useRouter();
    const { user, loading } = useAuth();

    const [logs, setLogs] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [filterAction, setFilterAction] = useState('');
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && (!user || user.role === 'student')) router.push('/admin/login');
    }, [user, loading, router]);

    const fetchLogs = useCallback(async () => {
        setLoadingData(true);
        try {
            const params: any = { page, limit: 25 };
            if (filterAction) params.action = filterAction;
            const res = await api.get('/admin/audit-logs', { params });
            if (res.data.success) {
                setLogs(res.data.data);
                setTotalPages(res.data.pagination?.pages || 1);
                setTotal(res.data.pagination?.total || 0);
            }
        } catch {
            toast.error('Failed to load audit logs');
        } finally {
            setLoadingData(false);
        }
    }, [page, filterAction]);

    useEffect(() => { if (user && user.role !== 'student') fetchLogs(); }, [user, fetchLogs]);

    const ACTIONS = ['CREATE_STUDENT', 'UPDATE_STUDENT', 'ACTIVATE_STUDENT', 'DEACTIVATE_STUDENT', 'APPROVE_PAYMENT', 'REJECT_PAYMENT', 'RESEND_SMS', 'BULK_IMPORT_STUDENTS', 'BULK_SMS'];

    return (
        <Layout title="Audit Log">
            <div className="space-y-5">

                {/* Header + Filter */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-primary">🔍 Audit Log</h2>
                        <p className="text-sm text-gray-500">{total} total events recorded</p>
                    </div>
                    <select
                        className="input-field w-52"
                        value={filterAction}
                        onChange={e => { setFilterAction(e.target.value); setPage(1); }}
                    >
                        <option value="">All Actions</option>
                        {ACTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
                    </select>
                </div>

                {/* Table */}
                <div className="card overflow-x-auto">
                    {loadingData ? (
                        <div className="space-y-3 p-4">{[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
                    ) : logs.length === 0 ? (
                        <p className="text-gray-500 text-center py-12">No audit logs found.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 text-left border-b">
                                    <th className="py-3 px-4 font-semibold text-gray-600 text-xs uppercase">Time</th>
                                    <th className="py-3 px-4 font-semibold text-gray-600 text-xs uppercase">Admin</th>
                                    <th className="py-3 px-4 font-semibold text-gray-600 text-xs uppercase">Action</th>
                                    <th className="py-3 px-4 font-semibold text-gray-600 text-xs uppercase">Resource</th>
                                    <th className="py-3 px-4 font-semibold text-gray-600 text-xs uppercase">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <>
                                        <tr key={log.id} className="border-b hover:bg-gray-50 transition-colors">
                                            <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">
                                                {new Date(log.created_at).toLocaleString('en-GH', { dateStyle: 'short', timeStyle: 'short' })}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="text-xs">
                                                    <p className="font-medium text-gray-800">{log.user_email || 'System'}</p>
                                                    <p className="text-gray-400">{log.role}</p>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                                                    {log.action.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-gray-500 text-xs">
                                                {log.resource_type && <span>{log.resource_type}</span>}
                                                {log.resource_id && <span className="ml-1 text-gray-300">#{log.resource_id.slice(0, 8)}</span>}
                                            </td>
                                            <td className="py-3 px-4">
                                                {(log.new_values || log.old_values) && (
                                                    <button
                                                        onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                                                        className="text-xs text-primary hover:underline"
                                                    >
                                                        {expanded === log.id ? 'Hide ▲' : 'View ▼'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                        {expanded === log.id && (
                                            <tr key={`${log.id}-detail`} className="bg-gray-50">
                                                <td colSpan={5} className="px-4 py-3">
                                                    <pre className="text-xs text-gray-600 overflow-x-auto bg-white p-3 rounded-lg border">
                                                        {JSON.stringify(log.new_values ? (typeof log.new_values === 'string' ? JSON.parse(log.new_values) : log.new_values) : {}, null, 2)}
                                                    </pre>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center gap-2 p-4 border-t">
                            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-outline px-3 py-1 text-sm disabled:opacity-40">← Prev</button>
                            <span className="text-sm text-gray-600 px-2 py-1">Page {page} of {totalPages}</span>
                            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-outline px-3 py-1 text-sm disabled:opacity-40">Next →</button>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
