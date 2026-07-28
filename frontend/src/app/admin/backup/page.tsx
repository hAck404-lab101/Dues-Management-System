'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ShieldIcon, DownloadIcon, ExclamationIcon } from '@/components/Icons';

export default function AdminBackupPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [confirmText, setConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !['admin', 'president'].includes(user.role))) {
      router.push('/admin/login');
    }
  }, [user, loading, router]);

  const handleExportData = async (type: 'paid-students' | 'defaulters' | 'revenue') => {
    setExporting(true);
    try {
      const res = await api.get('/reports/export/csv', {
        params: { reportType: type },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${type}-${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`${type.replace('-', ' ')} export downloaded`);
    } catch {
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleResetSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText.trim() !== 'RESET') {
      return toast.error('Please type RESET to confirm');
    }

    if (!window.confirm('WARNING: This will permanently delete ALL students, payments, dues, receipts, and audit logs. Are you completely sure?')) {
      return;
    }

    setResetting(true);
    try {
      const res = await api.post('/settings/reset-site');
      if (res.data?.success) {
        toast.success(res.data.message || 'Site data reset successfully');
        setConfirmText('');
        router.push('/admin/dashboard');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reset site data');
    } finally {
      setResetting(false);
    }
  };

  return (
    <Layout title="Backup & Recovery">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Data Export / Backup */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="w-5 h-5"><ShieldIcon /></span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary">Data Backup Center</h2>
              <p className="text-xs text-gray-500">Download CSV backups of system records</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => handleExportData('revenue')}
              disabled={exporting}
              className="p-4 rounded-xl border border-gray-200 hover:border-primary hover:shadow-md transition-all text-left bg-gray-50 hover:bg-white"
            >
              <span className="w-6 h-6 text-primary block mb-2"><DownloadIcon /></span>
              <p className="font-bold text-sm text-primary">Revenue Backup</p>
              <p className="text-xs text-gray-500 mt-1">Export all dues revenue breakdown</p>
            </button>

            <button
              onClick={() => handleExportData('paid-students')}
              disabled={exporting}
              className="p-4 rounded-xl border border-gray-200 hover:border-primary hover:shadow-md transition-all text-left bg-gray-50 hover:bg-white"
            >
              <span className="w-6 h-6 text-primary block mb-2"><DownloadIcon /></span>
              <p className="font-bold text-sm text-primary">Paid Records</p>
              <p className="text-xs text-gray-500 mt-1">Export list of fully paid students</p>
            </button>

            <button
              onClick={() => handleExportData('defaulters')}
              disabled={exporting}
              className="p-4 rounded-xl border border-gray-200 hover:border-primary hover:shadow-md transition-all text-left bg-gray-50 hover:bg-white"
            >
              <span className="w-6 h-6 text-primary block mb-2"><DownloadIcon /></span>
              <p className="font-bold text-sm text-primary">Defaulters List</p>
              <p className="text-xs text-gray-500 mt-1">Export list of students with balance</p>
            </button>
          </div>
        </div>

        {/* Danger Zone: Reset System Data */}
        <div className="card border-2 border-red-200 bg-red-50/40">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-red-200">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <span className="w-5 h-5"><ExclamationIcon /></span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-700">Danger Zone: Data Reset</h2>
              <p className="text-xs text-red-600">Clear all student records, payments, dues, and receipts</p>
            </div>
          </div>

          <p className="text-xs text-gray-600 mb-4 leading-relaxed">
            This action will clear all student profiles, due assignments, payments, receipts, and logs.
            Admin accounts will remain intact. This operation is <strong>IRREVERSIBLE</strong>.
          </p>

          <form onSubmit={handleResetSite} className="space-y-3">
            <div>
              <label className="label text-red-700">Type <span className="font-mono font-bold">RESET</span> to confirm *</label>
              <input
                type="text"
                className="input-field border-red-300 focus:ring-red-500"
                placeholder="RESET"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={resetting || confirmText.trim() !== 'RESET'}
              className="btn-primary bg-red-600 hover:bg-red-700 border-red-600 shadow-red-200 w-full py-2.5 font-bold disabled:opacity-50"
            >
              {resetting ? 'Resetting System Data...' : 'Reset All System Data'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
