'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function PaymentsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

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

  if (loading || loadingData) {
    return (
      <Layout title="My Payments">
        <div className="text-center py-12">Loading...</div>
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
                  <th className="text-left py-2">Due Name</th>
                  <th className="text-left py-2">Amount</th>
                  <th className="text-left py-2">Method</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b">
                    <td className="py-2">{payment.due_name}</td>
                    <td className="py-2">GHS {Number(payment.amount).toFixed(2)}</td>
                    <td className="py-2">{payment.payment_method.replace('_', ' ')}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded text-xs ${payment.status === 'completed' || payment.status === 'approved' ? 'bg-green-100 text-green-800' :
                          payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                        }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="py-2">{new Date(payment.created_at).toLocaleDateString()}</td>
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

