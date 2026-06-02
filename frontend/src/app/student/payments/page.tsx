'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { DownloadIcon, EnvelopeIcon, SmsIcon } from '@/components/Icons';
import { TableSkeleton } from '@/components/Skeletons';

export default function PaymentsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchPayments();
    }
  }, [user]);

  const fetchPayments = async () => {
    try {
      const response = await api.get('/payments');
      if (response.data.success) {
        setPayments(response.data.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load payments');
    } finally {
      setLoadingData(false);
    }
  };

  const handleResendSMS = async (id: string) => {
    setSubmitting(id + '-sms');
    try {
      await api.post(`/payments/${id}/resend-sms`);
      toast.success('SMS receipt sent successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send SMS receipt');
    } finally {
      setSubmitting(null);
    }
  };

  const handleResendEmail = async (id: string) => {
    setSubmitting(id + '-email');
    try {
      await api.post(`/payments/${id}/resend-email`);
      toast.success('Email receipt sent successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send email receipt');
    } finally {
      setSubmitting(null);
    }
  };

  if (loading || loadingData) {
    return (
      <Layout title="My Payments">
        <TableSkeleton rows={6} columns={6} />
      </Layout>
    );
  }

  return (
    <Layout title="My Payments">
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-primary">Payment History</h2>
          <Link href="/student/payments/make">
            <button className="btn-primary">Make New Payment</button>
          </Link>
        </div>

        {payments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No payments found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 text-gray-500 font-semibold">Due Name</th>
                  <th className="text-left py-3 text-gray-500 font-semibold">Amount</th>
                  <th className="text-left py-3 text-gray-500 font-semibold">Method</th>
                  <th className="text-left py-3 text-gray-500 font-semibold">Status</th>
                  <th className="text-left py-3 text-gray-500 font-semibold">Date</th>
                  <th className="text-right py-3 pr-4 text-gray-500 font-semibold">Receipt Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 font-medium text-gray-900">{payment.due_name}</td>
                    <td className="py-4 font-bold text-primary">GHS {Number(payment.amount).toFixed(2)}</td>
                    <td className="py-4 capitalize text-gray-600">{payment.payment_method.replace(/_/g, ' ')}</td>
                    <td className="py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide capitalize ${
                        payment.status === 'completed' || payment.status === 'approved' 
                          ? 'bg-green-50 text-green-700 border border-green-200' 
                          : payment.status === 'pending' 
                            ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' 
                            : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="py-4 text-gray-500">{new Date(payment.created_at).toLocaleDateString()}</td>
                    <td className="py-4 text-right pr-4">
                      {payment.receipt_url ? (
                        <div className="flex justify-end items-center gap-2">
                          <button
                            onClick={() => {
                              const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '');
                              window.open(`${apiBaseUrl}${payment.receipt_url}`, '_blank');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/20 text-primary hover:bg-primary/5 text-xs font-semibold shadow-sm hover:shadow transition-all"
                            title="Download PDF"
                          >
                            <span className="w-3.5 h-3.5"><DownloadIcon /></span>
                            <span>PDF</span>
                          </button>
                          
                          <button
                            onClick={() => handleResendEmail(payment.id)}
                            disabled={submitting === payment.id + '-email' || submitting === payment.id + '-sms'}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-yellow-600/20 text-yellow-700 hover:bg-yellow-50 text-xs font-semibold shadow-sm hover:shadow transition-all disabled:opacity-50"
                            title="Send Email"
                          >
                            {submitting === payment.id + '-email' ? (
                              <span className="w-3.5 h-3.5 animate-pulse bg-yellow-200 rounded-full" />
                            ) : (
                              <span className="w-3.5 h-3.5"><EnvelopeIcon /></span>
                            )}
                            <span>Email</span>
                          </button>

                          <button
                            onClick={() => handleResendSMS(payment.id)}
                            disabled={submitting === payment.id + '-email' || submitting === payment.id + '-sms'}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-600/20 text-blue-700 hover:bg-blue-50 text-xs font-semibold shadow-sm hover:shadow transition-all disabled:opacity-50"
                            title="Send SMS"
                          >
                            {submitting === payment.id + '-sms' ? (
                              <span className="w-3.5 h-3.5 animate-pulse bg-blue-200 rounded-full" />
                            ) : (
                              <span className="w-3.5 h-3.5"><SmsIcon /></span>
                            )}
                            <span>SMS</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No receipt available</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
