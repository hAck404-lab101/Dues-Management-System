'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useBranding } from '@/contexts/BrandingContext';
import { CheckCircleIcon, XCircleIcon, WalletIcon } from '@/components/Icons';
import { SkeletonBlock } from '@/components/Skeletons';

function PaymentCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { appName } = useBranding();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('Confirming your payment. Please do not close this page.');
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');

    const verify = async () => {
      if (!reference) {
        setStatus('failed');
        setMessage('Payment reference is missing. Please check your payment history or contact the admin.');
        return;
      }

      try {
        const res = await api.post('/payments/verify', { reference });
        if (res.data?.success) {
          setStatus('success');
          setMessage(res.data?.message || 'Payment confirmed successfully.');
          if (res.data?.receipt?.receipt_number) setReceiptNumber(res.data.receipt.receipt_number);
          setTimeout(() => router.push('/student/payments'), 3500);
        } else {
          setStatus('failed');
          setMessage(res.data?.message || 'Payment verification failed.');
        }
      } catch (error: any) {
        setStatus('failed');
        setMessage(error.response?.data?.message || 'Payment verification failed. Please check your payment history or contact admin.');
      }
    };

    verify();
  }, [router, searchParams]);

  return (
    <main className="min-h-screen bg-neutral flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="bg-primary text-white p-7 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/10 flex items-center justify-center mb-4">
            <span className="w-8 h-8"><WalletIcon /></span>
          </div>
          <h1 className="text-2xl font-extrabold">Payment Callback</h1>
          <p className="text-white/70 text-sm mt-1">{appName}</p>
        </div>

        <div className="p-8 text-center space-y-5">
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <div className="space-y-2">
                <SkeletonBlock className="h-5 w-48 mx-auto" />
                <SkeletonBlock className="h-4 w-64 mx-auto" />
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-20 h-20 mx-auto text-green-600"><CheckCircleIcon /></div>
              <div>
                <h2 className="text-xl font-extrabold text-green-700">Payment Confirmed</h2>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">{message}</p>
                {receiptNumber && <p className="text-xs font-bold text-primary mt-3">Receipt: {receiptNumber}</p>}
                <p className="text-xs text-gray-400 mt-3">Redirecting you to your payment history...</p>
              </div>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="w-20 h-20 mx-auto text-red-600"><XCircleIcon /></div>
              <div>
                <h2 className="text-xl font-extrabold text-red-700">Payment Verification Failed</h2>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">{message}</p>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t">
            <Link href="/student/payments" className="btn-primary w-full">View Payments</Link>
            <Link href="/student/receipts" className="btn-outline w-full">View Receipts</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-neutral flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="w-14 h-14 mx-auto rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4" />
          <p className="font-bold text-primary">Loading payment callback...</p>
        </div>
      </main>
    }>
      <PaymentCallbackContent />
    </Suspense>
  );
}
