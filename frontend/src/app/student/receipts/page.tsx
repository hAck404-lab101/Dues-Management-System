'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function ReceiptsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchReceipts();
    }
  }, [user]);

  const fetchReceipts = async () => {
    try {
      const response = await api.get('/receipts');
      if (response.data.success) {
        setReceipts(response.data.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load receipts');
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || loadingData) {
    return (
      <Layout title="My Receipts">
        <div className="text-center py-12">Loading...</div>
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
              <div key={receipt.id} className="border rounded-lg p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">{receipt.due_name}</h3>
                  <p className="text-sm text-gray-600">Receipt: {receipt.receipt_number}</p>
                  <p className="text-sm text-gray-600">Amount: GHS {Number(receipt.amount_paid).toFixed(2)}</p>
                  <p className="text-sm text-gray-600">Date: {new Date(receipt.issued_at).toLocaleDateString()}</p>
                </div>
                <a
                  href={`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace('/api', '')}${receipt.receipt_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline"
                >
                  Download PDF
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

