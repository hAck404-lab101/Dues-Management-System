'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
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
  const [proofName, setProofName] = useState('Payment proof');
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewPayment, setViewPayment] = useState<Payment | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

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

  const openProof = (payment: Payment) => {
    if (!payment.proof_image_url) return;
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace('/api', '');
    setProofUrl(`${baseUrl}${payment.proof_image_url}`);
    setProofName(`${payment.student_name} - ${payment.due_name}`);
  };

  const isPdfProof = proofUrl?.toLowerCase().split('?')[0].endsWith('.pdf');

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
      <AdminLayout title="Manage Payments">
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
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-4 font-semibold">Student</th>
                  <th className="py-4 px-4 font-semibold">Due</th>
                  <th className="py-4 px-4 font-semibold">Amount</th>
                  <th className="py-4 px-4 font-semibold">Method</th>
                  <th className="py-4 px-4 font-semibold">Type</th>
                  <th className="py-4 px-4 font-semibold">Status</th>
                  <th className="py-4 px-4 font-semibold">Receipt</th>
                  <th className="py-4 px-4 font-semibold">Date</th>
                  <th className="py-4 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/60">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-semibold text-gray-900 text-sm">{p.student_name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{p.student_id}</div>
                      {p.student_phone && <p className="text-[11px] text-gray-400">{p.student_phone}</p>}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-700 max-w-[160px] truncate">{p.due_name}</td>
                    <td className="py-4 px-4 font-semibold text-gray-900 text-sm">GHS {Number(p.amount).toFixed(2)}</td>
                    <td className="py-4 px-4 text-sm text-gray-600 capitalize">{p.payment_method.replace(/_/g, ' ')}</td>
                    <td className="py-4 px-4 text-sm text-gray-600 capitalize">{p.payment_type}</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 capitalize">
                        <span className={`w-2 h-2 rounded-full ${
                          p.status === 'approved' || p.status === 'completed'
                            ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                            : p.status === 'pending'
                            ? 'bg-amber-500 shadow-sm shadow-amber-500/50'
                            : p.status === 'rejected'
                            ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                            : 'bg-gray-400'
                        }`} />
                        <span>{p.status}</span>
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm">
                      {p.receipt_number ? <span className="font-semibold text-emerald-700">{p.receipt_number}</span> : <span className="text-gray-400">No receipt yet</span>}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-500 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="py-4 px-4 text-right relative">
                      <button
                        onClick={() => setActiveDropdownId(activeDropdownId === p.id ? null : p.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none inline-flex items-center justify-center"
                      >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                        </svg>
                      </button>
                      {activeDropdownId === p.id && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setActiveDropdownId(null)} />
                          <div className="absolute right-4 mt-1 w-44 bg-white border border-gray-100 rounded-xl shadow-xl z-40 py-1 text-left animate-in fade-in slide-in-from-top-2 duration-100">
                            <button
                              onClick={() => {
                                setViewPayment(p);
                                setShowViewModal(true);
                                setActiveDropdownId(null);
                              }}
                              className="w-full px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2 border-b border-gray-50"
                            >
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View Details
                            </button>
                            {p.proof_image_url && p.proof_image_url !== 'null' && (
                              <button
                                onClick={() => {
                                  openProof(p);
                                  setActiveDropdownId(null);
                                }}
                                className="w-full px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                View Proof
                              </button>
                            )}
                            {p.status === 'pending' && p.payment_type === 'manual' && (
                              <>
                                <button
                                  onClick={() => {
                                    handleApprove(p.id);
                                    setActiveDropdownId(null);
                                  }}
                                  disabled={submitting === p.id}
                                  className="w-full px-4 py-2.5 text-xs font-semibold text-green-700 hover:bg-green-50 flex items-center gap-2 border-t border-gray-50 disabled:opacity-50"
                                >
                                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {submitting === p.id ? 'Approving…' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectId(p.id);
                                    setRejectReason('');
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Reject
                                </button>
                              </>
                            )}
                            {(p.status === 'approved' || p.status === 'completed') && (
                              <>
                                <button
                                  onClick={() => {
                                    handleResendSMS(p);
                                    setActiveDropdownId(null);
                                  }}
                                  disabled={submitting === `${p.id}-sms` || !canSendReceipt(p)}
                                  className="w-full px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2 border-t border-gray-50 disabled:opacity-40"
                                  title={canSendReceipt(p) ? 'Send payment receipt SMS again' : 'Receipt must exist before SMS can be resent'}
                                >
                                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                  </svg>
                                  {submitting === `${p.id}-sms` ? 'Sending…' : 'Resend SMS'}
                                </button>
                                <button
                                  onClick={() => {
                                    handleResendEmail(p);
                                    setActiveDropdownId(null);
                                  }}
                                  disabled={submitting === `${p.id}-email` || !canSendReceipt(p)}
                                  className="w-full px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2 disabled:opacity-40"
                                >
                                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  {submitting === `${p.id}-email` ? 'Sending…' : 'Resend Email'}
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
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
      </AdminLayout>

      {rejectId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={() => setRejectId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-extrabold text-primary">Reject Payment</h3>
              <button onClick={() => setRejectId(null)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <label className="label">Reason for rejection</label>
            <textarea className="input-field mb-6" rows={3} placeholder="e.g. Payment proof is unclear or does not match amount" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={handleReject} disabled={!!submitting} className="btn-primary flex-1 bg-red-600 hover:bg-red-700">{submitting ? 'Rejecting…' : 'Reject Payment'}</button>
              <button onClick={() => setRejectId(null)} className="btn-outline flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {proofUrl && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[120] p-4" onClick={() => setProofUrl(null)}>
          <div className="relative max-w-5xl w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between mb-4 text-white">
              <div>
                <h3 className="font-bold text-lg">{proofName}</h3>
                <p className="text-xs text-white/60">Payment proof preview</p>
              </div>
              <button onClick={() => setProofUrl(null)} className="bg-white/10 hover:bg-white/20 w-10 h-10 rounded-full flex items-center justify-center text-white text-2xl transition-all">&times;</button>
            </div>

            <div className="w-full bg-white rounded-2xl shadow-2xl ring-4 ring-white/10 overflow-hidden min-h-[70vh] flex items-center justify-center">
              {isPdfProof ? (
                <iframe src={proofUrl} title="Proof of payment PDF" className="w-full h-[78vh] bg-white" />
              ) : (
                <img src={proofUrl} alt="Proof of payment" className="w-full max-h-[78vh] object-contain bg-white" />
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-4 justify-center">
              <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary px-6">Open in New Tab</a>
              <a href={proofUrl} download className="btn-outline border-white text-white hover:bg-white hover:text-primary px-6">Download Proof</a>
              <button onClick={() => setProofUrl(null)} className="btn-outline border-white text-white hover:bg-white hover:text-primary px-6">Close</button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && viewPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={() => { setShowViewModal(false); setViewPayment(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <h3 className="text-xl font-extrabold text-primary">Payment Details</h3>
              <button onClick={() => { setShowViewModal(false); setViewPayment(null); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-8 space-y-4 text-gray-800 text-sm">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="font-bold text-gray-400">Student Name:</span>
                <span className="font-semibold text-gray-900">{viewPayment.student_name}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="font-bold text-gray-400">Student Index No:</span>
                <span className="font-mono text-gray-900">{viewPayment.student_id}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="font-bold text-gray-400">Email Address:</span>
                <span className="text-gray-900 font-semibold">{viewPayment.student_email}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="font-bold text-gray-400">Phone Number:</span>
                <span className="text-gray-900 font-semibold">{viewPayment.student_phone || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="font-bold text-gray-400">Assigned Due:</span>
                <span className="text-gray-900 font-semibold">{viewPayment.due_name}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="font-bold text-gray-400">Amount Paid:</span>
                <span className="text-gray-900 font-bold">GHS {Number(viewPayment.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="font-bold text-gray-400">Payment Method:</span>
                <span className="text-gray-900 font-semibold capitalize">{viewPayment.payment_method.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="font-bold text-gray-400">Payment Type:</span>
                <span className="text-gray-900 font-semibold capitalize">{viewPayment.payment_type}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="font-bold text-gray-400">Receipt No:</span>
                <span className="text-emerald-700 font-bold">{viewPayment.receipt_number || 'No receipt generated'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="font-bold text-gray-400">Transaction Date:</span>
                <span className="text-gray-900 font-semibold">{new Date(viewPayment.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="font-bold text-gray-400">Status:</span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900 capitalize">
                  <span className={`w-2 h-2 rounded-full ${
                    viewPayment.status === 'approved' || viewPayment.status === 'completed'
                      ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                      : viewPayment.status === 'pending'
                      ? 'bg-amber-500 shadow-sm shadow-amber-500/50'
                      : viewPayment.status === 'rejected'
                      ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                      : 'bg-gray-400'
                  }`} />
                  <span>{viewPayment.status}</span>
                </span>
              </div>
              {viewPayment.approved_by_email && (
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="font-bold text-gray-400">Approved By:</span>
                  <span className="text-gray-900 font-semibold">{viewPayment.approved_by_email}</span>
                </div>
              )}
              {viewPayment.notes && (
                <div className="flex flex-col border-b border-gray-100 pb-2">
                  <span className="font-bold text-gray-400">Admin Notes:</span>
                  <span className="text-gray-900 font-semibold mt-1">{viewPayment.notes}</span>
                </div>
              )}
              <div className="pt-2">
                <button type="button" onClick={() => { setShowViewModal(false); setViewPayment(null); }} className="btn-outline w-full py-2.5">Close Details</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
