'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { TableSkeleton } from '@/components/Skeletons';

const STATUSES = ['all', 'pending', 'approved', 'completed', 'rejected'];
const METHODS = ['all', 'paystack', 'mtn_momo', 'vodafone_cash', 'airteltigo', 'bank_transfer', 'cash', 'other'];
const TYPES = ['all', 'online', 'manual'];

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  payment_type: string;
  status: string;
  notes: string | null;
  proof_image_url: string | null;
  created_at: string;
  approved_at: string | null;
  student_name: string;
  student_id: string;
  student_email: string;
  student_phone?: string;
  due_name: string;
  approved_by_email: string | null;
  receipt_number?: string | null;
  receipt_url?: string | null;
}

export default function AdminPaymentsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [paymentType, setPaymentType] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    if (rejectId || proofUrl) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [rejectId, proofUrl]);

  useEffect(() => {
    if (!loading && (!user || user.role === 'student')) router.push('/admin/login');
  }, [user, loading, router]);

  const fetchPayments = useCallback(async () => {
    setLoadingData(true);
    try {
      const params: Record<string, string | number> = { page, limit: 15 };
      if (filterStatus !== 'all') params.status = filterStatus;
      if (paymentMethod !== 'all') params.paymentMethod = paymentMethod;
      if (paymentType !== 'all') params.paymentType = paymentType;
      if (search.trim()) params.search = search.trim();
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const res = await api.get('/payments', { params });
      if (res.data.success) {
        setPayments(res.data.data || []);
        setTotalPages(res.data.pagination?.pages || 1);
        setTotalRecords(res.data.pagination?.total || 0);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load payments');
    } finally {
      setLoadingData(false);
    }
  }, [page, filterStatus, paymentMethod, paymentType, search, dateFrom, dateTo]);

  useEffect(() => { if (user && user.role !== 'student') fetchPayments(); }, [user, fetchPayments]);

  const applyFilters = () => {
    setPage(1);
    fetchPayments();
  };

  const resetFilters = () => {
    setFilterStatus('all');
    setPaymentMethod('all');
    setPaymentType('all');
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const handleApprove = async (id: string) => {
    setSubmitting(id);
    try {
      const res = await api.patch(`/payments/${id}/approve`);
      toast.success(res.data?.message || 'Payment approved');
      fetchPayments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    } finally { setSubmitting(null); }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    setSubmitting(rejectId);
    try {
      await api.patch(`/payments/${rejectId}/reject`, { reason: rejectReason || 'Payment proof not acceptable' });
      toast.success('Payment rejected');
      setRejectId(null);
      setRejectReason('');
      fetchPayments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    } finally { setSubmitting(null); }
  };

  const handleResendSMS = async (payment: Payment) => {
    setSubmitting(`${payment.id}-sms`);
    try {
      const res = await api.post(`/payments/${payment.id}/resend-sms`);
      toast.success(res.data?.message || `SMS sent to ${payment.student_name}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resend SMS');
    } finally {
      setSubmitting(null);
    }
  };

  const handleResendEmail = async (payment: Payment) => {
    setSubmitting(`${payment.id}-email`);
    try {
      await api.post(`/payments/${payment.id}/resend-email`);
      toast.success(`Email receipt sent to ${payment.student_name}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resend email');
    } finally {
      setSubmitting(null);
    }
  };

  const statusStyle = (status: string) => {
    switch (status) {
      case 'approved': case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const canSendReceipt = (p: Payment) => (p.status === 'approved' || p.status === 'completed') && !!p.receipt_number;

  return (
    <>
      <Layout title="Manage Payments">
        <div className="card p-5 mb-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="flex-1 min-w-[220px]">
              <label className="label">Search student, index, due, receipt or reference</label>
              <input
                className="input-field"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="e.g. Yaw, 0123, Development Dues"
              />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input-field min-w-[140px]" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Method</label>
              <select className="input-field min-w-[150px]" value={paymentMethod} onChange={e => { setPaymentMethod(e.target.value); setPage(1); }}>
                {METHODS.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input-field min-w-[120px]" value={paymentType} onChange={e => { setPaymentType(e.target.value); setPage(1); }}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div>
              <label className="label">Date From</label>
              <input type="date" className="input-field" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
            </div>
            <div>
              <label className="label">Date To</label>
              <input type="date" className="input-field" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
            </div>
            <button onClick={applyFilters} className="btn-primary">Apply Filters</button>
            <button onClick={resetFilters} className="btn-outline">Reset</button>
            <p className="text-sm text-gray-500 md:ml-auto pb-2">{totalRecords} payment record{totalRecords === 1 ? '' : 's'} found</p>
          </div>
        </div>

        <div className="card overflow-x-auto">
          {loadingData ? (
            <TableSkeleton rows={7} columns={9} />
          ) : payments.length === 0 ? (
            <p className="text-gray-500 text-center py-10">No payments found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="py-3 px-3 font-semibold text-gray-600">Student</th>
                  <th className="py-3 px-3 font-semibold text-gray-600">Due</th>
                  <th className="py-3 px-3 font-semibold text-gray-600">Amount</th>
                  <th className="py-3 px-3 font-semibold text-gray-600">Method</th>
                  <th className="py-3 px-3 font-semibold text-gray-600">Type</th>
                  <th className="py-3 px-3 font-semibold text-gray-600">Status</th>
                  <th className="py-3 px-3 font-semibold text-gray-600">Receipt</th>
                  <th className="py-3 px-3 font-semibold text-gray-600">Date</th>
                  <th className="py-3 px-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3">
                      <p className="font-medium">{p.student_name}</p>
                      <p className="text-xs text-gray-400">{p.student_id}</p>
                      {p.student_phone && <p className="text-[11px] text-gray-400">{p.student_phone}</p>}
                    </td>
                    <td className="py-3 px-3 max-w-[160px] truncate">{p.due_name}</td>
                    <td className="py-3 px-3 font-semibold text-primary">GHS {Number(p.amount).toFixed(2)}</td>
                    <td className="py-3 px-3 capitalize">{p.payment_method.replace(/_/g, ' ')}</td>
                    <td className="py-3 px-3 capitalize">{p.payment_type}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyle(p.status)}`}>{p.status}</span>
                    </td>
                    <td className="py-3 px-3">
                      {p.receipt_number ? (
                        <span className="text-xs font-semibold text-green-700">{p.receipt_number}</span>
                      ) : (
                        <span className="text-xs text-gray-400">No receipt yet</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-gray-500 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-3">
                      <div className="flex gap-2 flex-wrap">
                        {p.proof_image_url && p.proof_image_url !== 'null' && (
                          <button
                            onClick={() => {
                              const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace('/api', '');
                              setProofUrl(`${baseUrl}${p.proof_image_url}`);
                            }}
                            className="text-xs px-2 py-1 rounded border border-blue-300 text-blue-600 hover:bg-blue-50 font-medium"
                          >
                            Proof
                          </button>
                        )}
                        {p.status === 'pending' && p.payment_type === 'manual' && (
                          <>
                            <button
                              onClick={() => handleApprove(p.id)}
                              disabled={submitting === p.id}
                              className="text-xs px-2 py-1 rounded border border-green-400 text-green-700 hover:bg-green-50 font-medium disabled:opacity-50"
                            >
                              {submitting === p.id ? 'Approving…' : 'Approve'}
                            </button>
                            <button
                              onClick={() => { setRejectId(p.id); setRejectReason(''); }}
                              className="text-xs px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 font-medium"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {(p.status === 'approved' || p.status === 'completed') && (
                          <>
                            <button
                              onClick={() => handleResendSMS(p)}
                              disabled={submitting === `${p.id}-sms` || !canSendReceipt(p)}
                              className="text-xs px-2 py-1 rounded border border-secondary text-secondary-dark hover:bg-secondary/10 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                              title={canSendReceipt(p) ? 'Send payment receipt SMS again' : 'Receipt must exist before SMS can be resent'}
                            >
                              {submitting === `${p.id}-sms` ? 'Sending…' : 'Resend SMS'}
                            </button>
                            <button
                              onClick={() => handleResendEmail(p)}
                              disabled={submitting === `${p.id}-email` || !canSendReceipt(p)}
                              className="text-xs px-2 py-1 rounded border border-primary text-primary hover:bg-primary/10 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {submitting === `${p.id}-email` ? 'Sending…' : 'Resend Email'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4 pb-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-outline px-3 py-1 text-sm disabled:opacity-40">Prev</button>
              <span className="text-sm text-gray-600 px-2 py-1">Page {page} of {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-outline px-3 py-1 text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      </Layout>

      {rejectId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={() => setRejectId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-extrabold text-primary">Reject Payment</h3>
              <button onClick={() => setRejectId(null)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <label className="label">Reason for rejection</label>
            <textarea
              className="input-field mb-6" rows={3}
              placeholder="e.g. Payment proof is unclear or does not match amount"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={handleReject} disabled={!!submitting} className="btn-primary flex-1 bg-red-600 hover:bg-red-700">{submitting ? 'Rejecting…' : 'Reject Payment'}</button>
              <button onClick={() => setRejectId(null)} className="btn-outline flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {proofUrl && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[120] p-4" onClick={() => setProofUrl(null)}>
          <div className="relative max-w-4xl w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setProofUrl(null)} className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 w-10 h-10 rounded-full flex items-center justify-center text-white text-2xl transition-all">&times;</button>
            <img src={proofUrl} alt="Proof of payment" className="w-full rounded-2xl shadow-2xl max-h-[85vh] object-contain bg-white ring-4 ring-white/10" />
            <div className="mt-4 flex gap-4">
              <a href={proofUrl} download className="btn-secondary px-6">Download Proof</a>
              <button onClick={() => setProofUrl(null)} className="btn-outline border-white text-white hover:bg-white hover:text-primary px-6">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
