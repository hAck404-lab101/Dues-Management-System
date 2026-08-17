'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useBranding } from '@/contexts/BrandingContext';
import { CheckCircleIcon, XCircleIcon, WalletIcon } from '@/components/Icons';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const MAX_VERIFY_ATTEMPTS = 10;
const VERIFY_INTERVAL_MS = 3000;

function PaymentCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { appName } = useBranding();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('Please wait while we confirm your payment.');
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(1);

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    let cancelled = false;
    let redirectTimer: ReturnType<typeof setTimeout> | null = null;

    const verify = async () => {
      if (!reference) {
        setStatus('failed');
        setMessage('We could not find your payment reference. Please check your payment history or contact the admin.');
        return;
      }

      for (let currentAttempt = 1; currentAttempt <= MAX_VERIFY_ATTEMPTS && !cancelled; currentAttempt++) {
        setAttempt(currentAttempt);
        setStatus('loading');

        try {
          const res = await api.post('/payments/verify', { reference });

          if (res.data?.success && res.data?.confirmed) {
            if (cancelled) return;
            setStatus('success');
            setMessage(res.data?.message || 'Your payment has been confirmed successfully.');
            if (res.data?.receipt?.receipt_number) setReceiptNumber(res.data.receipt.receipt_number);
            redirectTimer = setTimeout(() => router.push('/student/dashboard'), 3500);
            return;
          }

          if (res.data?.pending) {
            setMessage(res.data?.message || 'Your payment is still being confirmed by Paystack. Please keep this page open.');
          } else {
            if (cancelled) return;
            setStatus('failed');
            setMessage(res.data?.message || 'Paystack did not confirm this payment. Please check your payment history or contact the admin.');
            return;
          }
        } catch (error: any) {
          const data = error.response?.data;
          const retryable = Boolean(data?.pending) || error.response?.status === 502 || error.response?.status === 503 || !error.response;

          if (!retryable) {
            if (cancelled) return;
            setStatus('failed');
            setMessage(data?.message || 'We could not confirm your payment. Please check your payment history or contact the admin.');
            return;
          }

          setMessage(data?.message || 'Paystack is still confirming your transaction. We are checking again automatically.');
        }

        if (currentAttempt < MAX_VERIFY_ATTEMPTS && !cancelled) {
          await sleep(VERIFY_INTERVAL_MS);
        }
      }

      if (!cancelled) {
        setStatus('failed');
        setMessage(
          'Your payment is taking longer than expected to confirm. Do not pay again. If funds were deducted, the Paystack webhook can still confirm it automatically; check your dashboard shortly or contact the admin with your payment reference.'
        );
      }
    };

    verify();

    return () => {
      cancelled = true;
      if (redirectTimer) clearTimeout(redirectTimer);
    };
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
                <p className="text-sm text-gray-500">{message}</p>
                <p className="text-xs text-gray-400">Verification attempt {attempt} of {MAX_VERIFY_ATTEMPTS}</p>
                <p className="text-xs font-semibold text-amber-700">Do not close this page or pay again while confirmation is in progress.</p>
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
                <h2 className="text-xl font-extrabold text-red-700">Payment Not Yet Confirmed</h2>
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
