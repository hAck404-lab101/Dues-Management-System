'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { TableSkeleton } from '@/components/Skeletons';

export default function ReceiptsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

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
    if (user) fetchReceipts();
  }, [user]);

  const fetchReceipts = async () => {
    try {
      const response = await api.get('/receipts');
      if (response.data.success) setReceipts(response.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load receipts');
    } finally {
      setLoadingData(false);
    }
  };

  const downloadReceipt = async (receiptNumber: string) => {
    setDownloading(receiptNumber);
    try {
      const response = await api.get(`/receipts/download/${encodeURIComponent(receiptNumber)}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${receiptNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Receipt download failed');
    } finally {
      setDownloading(null);
    }
  };

  if (loading || loadingData) {
    return (
      <Layout title="My Receipts">
        <TableSkeleton rows={5} columns={4} />
      </Layout>
    );
  }

  return (
    <Layout title="My Receipts">
      <div className="card">
        <h2 className="text-2xl font-bold text-primary mb-6">Receipts</h2>
        {receipts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No receipts found</p>
        ) : (
          <div className="space-y-4">
            {receipts.map((receipt) => (
              <div key={receipt.id} className="border rounded-lg p-4 flex justify-between items-center gap-4">
                <div>
                  <h3 className="font-semibold text-lg">{receipt.due_name}</h3>
                  <p className="text-sm text-gray-600">Receipt: {receipt.receipt_number}</p>
                  <p className="text-sm text-gray-600">Amount: GHS {Number(receipt.amount_paid).toFixed(2)}</p>
                  <p className="text-sm text-gray-600">Date: {new Date(receipt.issued_at).toLocaleDateString()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadReceipt(receipt.receipt_number)}
                  disabled={downloading === receipt.receipt_number}
                  className="btn-outline whitespace-nowrap disabled:opacity-60"
                >
                  {downloading === receipt.receipt_number ? 'Downloading...' : 'Download PDF'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
