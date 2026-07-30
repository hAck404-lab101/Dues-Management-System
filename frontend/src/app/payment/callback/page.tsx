'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useBranding } from '@/contexts/BrandingContext';
import { CheckCircleIcon, XCircleIcon, WalletIcon } from '@/components/Icons';

function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const { appName } = useBranding();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('Checking payment status. Please wait...');
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    if (!reference) {
      setStatus('failed');
      setMessage('No payment reference found. If you believe this is an error, please contact support.');
      return;
    }

    let timer: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const res = await api.get('/public/payment-status', { params: { reference } });
        if (res.data?.success && res.data?.payment) {
          const payment = res.data.payment;
          if (payment.status === 'approved' || payment.status === 'completed') {
            setStatus('success');
            setMessage('Your payment has been successfully processed and verified.');
            setReceiptNumber(payment.receipt_number);
            setReceiptUrl(payment.receipt_url);
          } else if (payment.status === 'pending') {
            if (pollCount < 6) {
              setMessage(`Waiting for transaction confirmation... (Attempt ${pollCount + 1}/6)`);
              timer = setTimeout(() => {
                setPollCount(prev => prev + 1);
              }, 2500);
            } else {
              setStatus('failed');
              setMessage('Payment is still pending. If MTN MoMo or Card has been debited, your receipt will be sent via SMS/Email shortly. You can also verify your receipt later.');
            }
          } else {
            setStatus('failed');
            setMessage(`Payment status: ${payment.status}. If you experienced a debit, please contact the administrator.`);
          }
        } else {
          setStatus('failed');
          setMessage('Transaction not found. Check the reference or try again.');
        }
      } catch (error: any) {
        console.error(error);
        setStatus('failed');
        setMessage(error.response?.data?.message || 'Error checking payment status.');
      }
    };

    checkStatus();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [searchParams, pollCount]);

  const reference = searchParams.get('reference') || searchParams.get('trxref');

  return (
    <main className="min-h-screen bg-neutral flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="bg-primary text-white p-7 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/10 flex items-center justify-center mb-4">
            <span className="w-8 h-8"><WalletIcon /></span>
          </div>
          <h1 className="text-2xl font-extrabold">Payment Confirmation</h1>
          <p className="text-white/70 text-sm mt-1">{appName}</p>
        </div>

        <div className="p-8 text-center space-y-6">
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <div className="space-y-2">
                <h2 className="text-lg font-extrabold text-primary">Confirming transaction</h2>
                <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-20 h-20 mx-auto text-blue-600"><CheckCircleIcon /></div>
              <div>
                <h2 className="text-xl font-extrabold text-blue-700">Payment Successful!</h2>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">{message}</p>
                {receiptNumber && (
                  <div className="mt-4 p-3 bg-blue-50/50 rounded-2xl inline-block border border-blue-100">
                    <p className="text-xs text-blue-800 font-bold">Receipt Number: <span className="font-mono">{receiptNumber}</span></p>
                  </div>
                )}
              </div>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="w-20 h-20 mx-auto text-red-600"><XCircleIcon /></div>
              <div>
                <h2 className="text-xl font-extrabold text-red-700">Status Check Finished</h2>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">{message}</p>
              </div>
            </>
          )}

          {reference && (
            <div className="text-[10px] text-gray-400 font-mono">
              Ref: {reference}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-5 border-t border-gray-100">
            {status === 'success' && receiptUrl ? (
              <a 
                href={receiptUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn-primary w-full text-center"
              >
                Download Receipt
              </a>
            ) : (
              <button 
                onClick={() => setPollCount(0)}
                disabled={status === 'loading'}
                className="btn-primary w-full disabled:opacity-50"
              >
                Re-check Status
              </button>
            )}
            
            <Link href="/" className="btn-outline w-full text-center">
              Back to Home
            </Link>
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
          <p className="font-bold text-primary">Loading payment verification...</p>
        </div>
      </main>
    }>
      <PaymentCallbackContent />
    </Suspense>
  );
}
