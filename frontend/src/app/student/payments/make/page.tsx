'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';

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

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
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
    if (!dueId && !loading) {
      toast.error('No due selected for payment');
      router.push('/student/dashboard');
      return;
    }
    if (dueId) {
      fetchDue();
    }
  }, [dueId, loading]);

  const fetchDue = async () => {
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
        // Redirect to Paystack payment page
        window.location.href = response.data.paystack.authorization_url;
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

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-500 font-medium">Loading auth state...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || (!due && !loading && dueId)) {
    return (
      <Layout title="Error">
        <div className="max-w-2xl mx-auto text-center py-20 card">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">{error || 'Something went wrong'}</h2>
          <p className="text-gray-600 mb-8">We couldn't retrieve the due information. Please try again or contact support.</p>
          <button onClick={() => router.push('/student/dashboard')} className="btn-primary px-8">Return to Dashboard</button>
        </div>
      </Layout>
    );
  }

  if (!due) return null;

  return (
    <Layout title="Make Payment">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT COLUMN: Summary */}
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

          {/* RIGHT COLUMN: Payment Methods */}
          <div className="lg:col-span-2 space-y-8">
            {/* ONLINE OPTION */}
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl">💳</div>
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
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    Pay via Paystack
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
              <div className="mt-4 flex items-center justify-center gap-6 opacity-40">
                <span className="text-[10px] font-bold">VISA</span>
                <span className="text-[10px] font-bold">MASTERCARD</span>
                <span className="text-[10px] font-bold">MOMO</span>
              </div>
            </div>

            {/* MANUAL OPTION */}
            <div className="card">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xl">📱</div>
                <div>
                  <h3 className="font-bold text-xl">Offline / Manual Deposit</h3>
                  <p className="text-sm text-gray-500">For MoMo Transfer or Bank Deposit</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-5 bg-orange-50 border border-orange-100 rounded-2xl relative overflow-hidden">
                  <div className="relative z-10 space-y-4">
                    <h4 className="font-bold text-orange-900 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Instructions
                    </h4>
                    <p className="text-sm text-orange-800 leading-relaxed whitespace-pre-wrap">
                      {settings.manual_payment_instructions || 'Please send the exact amount to any of the accounts below and upload your proof of payment.'}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {settings.manual_payment_phone && (
                        <div className="bg-white/60 p-4 rounded-xl border border-orange-200">
                          <span className="text-[10px] uppercase font-bold text-orange-600 block mb-1">Momo Account</span>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-lg select-all">{settings.manual_payment_phone}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(settings.manual_payment_phone);
                                toast.success('Copied!');
                              }}
                              className="p-1 hover:bg-orange-100 rounded text-orange-600"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                            </button>
                          </div>
                        </div>
                      )}
                      {settings.manual_payment_bank && (
                        <div className="bg-white/60 p-4 rounded-xl border border-orange-200">
                          <span className="text-[10px] uppercase font-bold text-orange-600 block mb-1">Bank Details</span>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm whitespace-pre-wrap select-all">{settings.manual_payment_bank}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(settings.manual_payment_bank);
                                toast.success('Copied!');
                              }}
                              className="p-1 hover:bg-orange-100 rounded text-orange-600"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <form onSubmit={handleManualPayment} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Method Used</label>
                      <select
                        className="input-field"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      >
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
                          <svg className="w-8 h-8 text-gray-400 group-hover:text-primary mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-xs text-gray-500">{proofFile ? proofFile.name : 'Click to upload proof'}</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                          required
                        />
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={processing || !proofFile}
                    className="btn-secondary w-full py-4 text-lg"
                  >
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
