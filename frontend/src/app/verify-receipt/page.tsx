'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ReceiptIcon, CheckCircleIcon, ExclamationIcon } from '@/components/Icons';
import { useBranding } from '@/contexts/BrandingContext';
import { SkeletonBlock } from '@/components/Skeletons';
import Loader from '@/components/Loader';

function VerifyReceiptContent() {
  const { appName, appLogo } = useBranding();
  const searchParams = useSearchParams();
  const [receiptNumber, setReceiptNumber] = useState(searchParams.get('receipt') || searchParams.get('receiptNumber') || '');
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);

  const verifyReceipt = async (value?: string) => {
    const cleanNumber = String(value ?? receiptNumber).trim();
    if (!cleanNumber) {
      toast.error('Enter a receipt number');
      return;
    }
    setLoading(true);
    setReceipt(null);
    setNotFound(false);
    try {
      const res = await api.get(`/receipts/number/${encodeURIComponent(cleanNumber)}`);
      if (res.data.success) {
        setReceipt(res.data.data);
        setReceiptNumber(cleanNumber);
      }
    } catch (error: any) {
      setNotFound(true);
      toast.error(error.response?.data?.message || 'Receipt not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fromLink = searchParams.get('receipt') || searchParams.get('receiptNumber');
    if (fromLink) {
      setReceiptNumber(fromLink);
      verifyReceipt(fromLink);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    verifyReceipt();
  };

  return (
    <div className="min-h-screen bg-neutral">
      <Navbar />
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="card overflow-hidden p-0 border-none outline-none">
            <div className="bg-primary text-white p-6 sm:p-8 relative overflow-hidden">
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                  {appLogo ? <img src={appLogo} alt={appName} className="w-full h-full object-contain p-2" /> : <span className="w-9 h-9"><ReceiptIcon /></span>}
                </div>
                <div>
                  <p className="text-white/60 text-xs font-bold uppercase tracking-[0.18em]">Official Receipt Check</p>
                  <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">Verify Payment Receipt</h1>
                  <p className="text-white/75 mt-2 max-w-2xl text-sm">Confirm that a payment receipt was issued by {appName}. If you opened this page from an SMS, the receipt number is filled automatically.</p>
                </div>
              </div>
              <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-white/10" />
              <div className="absolute right-12 -bottom-16 w-48 h-48 rounded-full bg-secondary/20" />
            </div>

            <div className="p-5 sm:p-8">
              <form onSubmit={handleVerify} className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                <div>
                  <label className="label">Receipt Number</label>
                  <input
                    className="input-field font-mono tracking-wide"
                    placeholder="Example: DMS-2026-000001"
                    value={receiptNumber}
                    onChange={e => setReceiptNumber(e.target.value)}
                  />
                </div>
                <div className="sm:self-end">
                  <button type="submit" disabled={loading} className="btn-primary w-full sm:w-40">
                    {loading ? 'Checking...' : 'Verify'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {loading && (
            <div className="card p-8 space-y-4">
              <SkeletonBlock className="h-6 w-48" />
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-2/3" />
            </div>
          )}

          {notFound && !loading && (
            <div className="card border-l-4 border-red-500 bg-rose-50/50 p-6">
              <div className="flex gap-3 items-start">
                <span className="w-6 h-6 text-red-600 shrink-0"><ExclamationIcon /></span>
                <div>
                  <h2 className="font-bold text-red-800">Receipt not found</h2>
                  <p className="text-sm text-red-700 mt-1">Check the receipt number and try again. If the issue continues, contact the administrator before treating the payment as confirmed.</p>
                </div>
              </div>
            </div>
          )}

          {receipt && !loading && (
            <div className="card overflow-hidden p-0 border-none outline-none">
              <div className="bg-blue-50/50 p-6 flex gap-3.5 items-start">
                <span className="w-8 h-8 text-blue-600 shrink-0"><CheckCircleIcon /></span>
                <div>
                  <h2 className="text-xl font-bold text-blue-900">Receipt Verified</h2>
                  <p className="text-sm text-blue-600 font-medium">This receipt exists in the official system records.</p>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Info label="Receipt Number" value={receipt.receipt_number} />
                <Info label="Student" value={receipt.full_name || receipt.student_name || '—'} />
                <Info label="Index Number" value={receipt.student_id || '—'} />
                <Info label="Due" value={receipt.due_name || '—'} />
                <Info label="Amount Paid" value={`GHS ${Number(receipt.amount_paid || 0).toFixed(2)}`} />
                <Info label="Balance" value={`GHS ${Number(receipt.balance || 0).toFixed(2)}`} />
                <Info label="Total Amount" value={`GHS ${Number(receipt.total_amount || 0).toFixed(2)}`} />
                <Info label="Issued" value={receipt.issued_at ? new Date(receipt.issued_at).toLocaleString('en-GH') : '—'} />
              </div>
            </div>
          )}

          <div className="text-center text-sm text-gray-500 pt-4">
            <Link href="/" className="text-primary hover:underline font-semibold">Back to Home</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function VerifyReceiptPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral flex items-center justify-center">
        <div className="bg-white rounded-3xl p-10 shadow-[0_8px_30px_rgba(0,0,0,0.015),0_30px_60px_rgba(0,0,0,0.015)]">
          <Loader />
        </div>
      </div>
    }>
      <VerifyReceiptContent />
    </Suspense>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50/60 rounded-2xl p-4 border-none outline-none">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-800 break-words">{value}</p>
    </div>
  );
}
