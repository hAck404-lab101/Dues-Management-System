'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ExclamationIcon, CardIcon, SmsIcon } from '@/components/Icons';
import { FormSkeleton, SkeletonBlock } from '@/components/Skeletons';

export default function MakePaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const dueId = searchParams.get('dueId');

  const [due, setDue] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('paystack');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>({});
  const [serviceFee, setServiceFee] = useState(0);
  const [loadingDue, setLoadingDue] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'student') {
        router.push('/admin/dashboard');
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings/public');
      if (res.data.success) {
        setSettings(res.data.data);
        setServiceFee(parseFloat(res.data.data.payment_service_fee || '0'));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!dueId) {
      toast.error('No due selected for payment');
      router.replace('/student/dashboard');
      return;
    }
    fetchDue();
  }, [dueId, loading]);

  const fetchDue = async () => {
    setLoadingDue(true);
    setError(null);
    try {
      const response = await api.get(`/dues/${dueId}`);
      if (response.data.success) {
        setDue(response.data.data);
        setAmount(response.data.data.balance?.toString() || '');
      } else {
        setError('Failed to load due information');
      }
    } catch (error: any) {
      console.error('Fetch due error:', error);
      setError('Failed to load due information');
      toast.error('Failed to load due information');
    } finally {
      setLoadingDue(false);
    }
  };

  const handleOnlinePayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setProcessing(true);
    try {
      const response = await api.post('/payments/initialize', {
        dueId,
        amount: parseFloat(amount),
      });

      if (response.data.success) {
        window.location.assign(response.data.paystack.authorization_url);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to initialize payment');
      setProcessing(false);
    }
  };

  const handleManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofFile) {
      toast.error('Please upload proof of payment');
      return;
    }

    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('dueId', dueId!);
      formData.append('amount', amount);
      formData.append('paymentMethod', paymentMethod);
      formData.append('proof', proofFile);

      const response = await api.post('/payments/manual', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        toast.success('Payment submitted. Waiting for approval.');
        router.push('/student/dashboard');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit payment');
      setProcessing(false);
    }
  };

  if (loading || loadingDue) {
    return (
      <Layout title="Make Payment">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1"><FormSkeleton /></div>
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6 space-y-4">
              <SkeletonBlock className="h-7 w-48" />
              <SkeletonBlock className="h-20 w-full rounded-2xl" />
              <SkeletonBlock className="h-12 w-full rounded-xl" />
            </div>
            <div className="card p-6 space-y-4">
              <SkeletonBlock className="h-7 w-56" />
              <SkeletonBlock className="h-24 w-full rounded-2xl" />
              <SkeletonBlock className="h-12 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || (!due && !loading && dueId)) {
    return (
      <Layout title="Payment Unavailable">
        <div className="max-w-2xl mx-auto text-center py-20 card flex flex-col items-center justify-center">
          <div className="w-16 h-16 text-yellow-500 mb-4"><ExclamationIcon /></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">{error || 'Payment information could not be loaded'}</h2>
          <p className="text-gray-600 mb-8">Please return to your dashboard and select the due again.</p>
          <button onClick={() => router.push('/student/dashboard')} className="btn-primary px-8">Return to Dashboard</button>
        </div>
      </Layout>
    );
  }

  if (!due) {
    return (
      <Layout title="Make Payment">
        <FormSkeleton />
      </Layout>
    );
  }

  return (
    <Layout title="Make Payment">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="card sticky top-24">
              <h2 className="text-xl font-bold text-primary mb-6">Payment Summary</h2>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Service Name</span>
                    <span className="font-bold text-right">{due.name}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Total Due</span>
                    <span>GHS {(due.assigned_amount || due.amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Already Paid</span>
                    <span className="text-green-600">GHS {(due.total_paid || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-3 font-bold text-primary">
                    <span>Current Balance</span>
                    <span>GHS {due.balance.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="label text-xs">Enter Amount to Pay (GHS)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field text-lg font-bold"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    max={due.balance}
                    placeholder={`Max: ${due.balance}`}
                  />
                  <p className="text-[10px] text-gray-400">Payments are non-refundable once verified.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center p-3">
                    <CardIcon />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl">Online Checkout</h3>
                    <p className="text-sm text-gray-500">Fast & Instant Verification</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">RECOMMENDED</span>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Principal Amount</span>
                    <span className="font-medium">GHS {parseFloat(amount || '0').toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Service Fee</span>
                    <span className="font-medium text-secondary">GHS {serviceFee.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-blue-200 pt-3 flex justify-between font-bold text-primary text-lg">
                    <span>Total to Pay</span>
                    <span>GHS {(parseFloat(amount || '0') + serviceFee).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleOnlinePayment}
                disabled={processing || !amount || parseFloat(amount) <= 0}
                className="btn-primary w-full py-4 text-lg shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3"
              >
                {processing ? (
                  <>
                    <span className="w-5 h-5 rounded-full bg-white/30 animate-pulse" />
                    Redirecting to Paystack...
                  </>
                ) : (
                  <>Pay via Paystack</>
                )}
              </button>
              <div className="mt-4 flex items-center justify-center gap-6 opacity-40">
                <span className="text-[10px] font-bold">VISA</span>
                <span className="text-[10px] font-bold">MASTERCARD</span>
                <span className="text-[10px] font-bold">MOMO</span>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center p-3">
                  <SmsIcon />
                </div>
                <div>
                  <h3 className="font-bold text-xl">Offline / Manual Deposit</h3>
                  <p className="text-sm text-gray-500">For MoMo Transfer or Bank Deposit</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-5 bg-orange-50 border border-orange-100 rounded-2xl relative overflow-hidden">
                  <div className="relative z-10 space-y-4">
                    <h4 className="font-bold text-orange-900">Instructions</h4>
                    <p className="text-sm text-orange-800 leading-relaxed whitespace-pre-wrap">
                      {settings.manual_payment_instructions || 'Please send the exact amount to any of the accounts below and upload your proof of payment.'}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleManualPayment} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Method Used</label>
                      <select className="input-field" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                        <option value="mtn_momo">MTN MoMo</option>
                        <option value="vodafone_cash">Telecel Cash</option>
                        <option value="airteltigo">AT Money</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cash">Cash (In-person)</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Proof (Screenshot/Receipt)</label>
                      <label className="relative flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary transition-colors cursor-pointer group">
                        <div className="flex flex-col items-center justify-center pt-2 pb-2">
                          <p className="text-xs text-gray-500">{proofFile ? proofFile.name : 'Click to upload proof'}</p>
                        </div>
                        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setProofFile(e.target.files?.[0] || null)} required />
                      </label>
                    </div>
                  </div>

                  <button type="submit" disabled={processing || !proofFile} className="btn-secondary w-full py-4 text-lg">
                    {processing ? 'Submitting for Approval...' : 'Confirm Manual Payment'}
                  </button>
                  <p className="text-[10px] text-gray-400 text-center">Manual payments are usually approved within 2-24 hours.</p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
