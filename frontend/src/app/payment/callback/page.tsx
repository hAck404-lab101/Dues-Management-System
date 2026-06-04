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
  const [message, setMessage] = useState('Please wait while we confirm your payment.');
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');

    const verify = async () => {
      if (!reference) {
        setStatus('failed');
        setMessage('We could not find your payment reference. Please check your payment history or contact the admin.');
        return;
      }

      try {
        const res = await api.post('/payments/verify', { reference });
        if (res.data?.success) {
          setStatus('success');
          setMessage('Your payment has been confirmed successfully. Your receipt will be available on your dashboard.');
          if (res.data?.receipt?.receipt_number) setReceiptNumber(res.data.receipt.receipt_number);
          setTimeout(() => router.push('/student/dashboard'), 3000);
        } else {
          setStatus('failed');
          setMessage(res.data?.message || 'We could not confirm your payment. Please check your payment history or contact the admin.');
        }
      } catch (error: any) {
        setStatus('failed');
        setMessage(error.response?.data?.message || 'We could not confirm your payment. Please check your payment history or contact the admin.');
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
          <h1 className="text-2xl font-extrabold">Confirming Payment</h1>
          <p className="text-white/70 text-sm mt-1">{appName}</p>
        </div>

        <div className="p-8 text-center space-y-5">
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <div className="space-y-2">
                <h2 className="text-lg font-extrabold text-primary">Processing your payment</h2>
                <p className="text-sm text-gray-500">Please stay on this page while we confirm your transaction.</p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-20 h-20 mx-auto text-green-600"><CheckCircleIcon /></div>
              <div>
                <h2 className="text-xl font-extrabold text-green-700">Payment Successful</h2>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">{message}</p>
                {receiptNumber && <p className="text-xs font-bold text-primary mt-3">Receipt: {receiptNumber}</p>}
                <p className="text-xs text-gray-400 mt-3">Taking you back to your dashboard...</p>
              </div>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="w-20 h-20 mx-auto text-red-600"><XCircleIcon /></div>
              <div>
                <h2 className="text-xl font-extrabold text-red-700">Payment Not Confirmed</h2>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">{message}</p>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t">
            <Link href="/student/dashboard" className="btn-primary w-full">Go to Dashboard</Link>
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
          <p className="font-bold text-primary">Confirming your payment...</p>
        </div>
      </main>
    }>
      <PaymentCallbackContent />
    </Suspense>
  );
}
