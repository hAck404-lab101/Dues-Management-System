'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface DashboardData {
  student: any;
  summary: {
    totalDues: number;
    totalDuesAmount: number;
    totalPaid: number;
    outstandingBalance: number;
  };
  recentPayments: any[];
  recentReceipts: any[];
  dues: any[];
}

export default function StudentDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchDashboard();
    }
  }, [user]);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/dashboard/student');
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || loadingData) {
    return (
      <Layout>
        <div className="text-center py-12">Loading...</div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="text-center py-12">No data available</div>
      </Layout>
    );
  }

  return (
    <Layout title="Student Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card bg-primary text-white">
          <h3 className="text-sm font-medium opacity-90">Total Dues</h3>
          <p className="text-3xl font-bold mt-2">{data.summary.totalDues}</p>
        </div>
        <div className="card bg-secondary text-white">
          <h3 className="text-sm font-medium opacity-90">Total Amount</h3>
          <p className="text-3xl font-bold mt-2">GHS {data.summary.totalDuesAmount.toFixed(2)}</p>
        </div>
        <div className="card bg-green-600 text-white">
          <h3 className="text-sm font-medium opacity-90">Total Paid</h3>
          <p className="text-3xl font-bold mt-2">GHS {data.summary.totalPaid.toFixed(2)}</p>
        </div>
        <div className="card bg-red-600 text-white">
          <h3 className="text-sm font-medium opacity-90">Outstanding</h3>
          <p className="text-3xl font-bold mt-2">GHS {data.summary.outstandingBalance.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h2 className="text-xl font-bold text-primary mb-4">My Dues</h2>
          <div className="space-y-3">
            {data.dues.map((due) => (
              <div key={due.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{due.name}</h3>
                  <span className={`px-2 py-1 rounded text-xs ${due.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                    due.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                    {due.payment_status}
                  </span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Assigned: GHS {due.assigned_amount.toFixed(2)}</p>
                  <p>Paid: GHS {due.total_paid.toFixed(2)}</p>
                  <p>Balance: GHS {due.balance.toFixed(2)}</p>
                </div>
                {due.balance > 0 && (
                  <Link href={`/student/payments/make?dueId=${due.id}`}>
                    <button className="btn-primary mt-3 w-full">Make Payment</button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-primary mb-4">Recent Payments</h2>
          <div className="space-y-3">
            {data.recentPayments.length === 0 ? (
              <p className="text-gray-500">No payments yet</p>
            ) : (
              data.recentPayments.map((payment) => (
                <div key={payment.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{payment.due_name}</h3>
                      <p className="text-sm text-gray-600">GHS {Number(payment.amount).toFixed(2)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${payment.status === 'completed' || payment.status === 'approved' ? 'bg-green-100 text-green-800' :
                      payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                      {payment.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold text-primary mb-4">Recent Receipts</h2>
        <div className="space-y-3">
          {data.recentReceipts.length === 0 ? (
            <p className="text-gray-500">No receipts yet</p>
          ) : (
            data.recentReceipts.map((receipt) => (
              <div key={receipt.id} className="border rounded-lg p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{receipt.due_name}</h3>
                  <p className="text-sm text-gray-600">Receipt: {receipt.receipt_number}</p>
                  <p className="text-sm text-gray-600">Amount: GHS {Number(receipt.amount_paid).toFixed(2)}</p>
                </div>
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL}/receipts/${receipt.receipt_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline"
                >
                  Download
                </a>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}

