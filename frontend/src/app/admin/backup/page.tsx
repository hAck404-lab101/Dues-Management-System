'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { DownloadIcon, ShieldIcon, WrenchIcon } from '@/components/Icons';

export default function AdminBackupPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const allowedRoles = ['admin', 'treasurer', 'president'];

  useEffect(() => {
    if (!loading && (!user || !allowedRoles.includes(user.role))) {
      router.push('/admin/login');
    }
  }, [user, loading, router]);

  const downloadBackup = async () => {
    setBusy(true);
    try {
      const res = await api.get('/settings/backup/download', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dues-management-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Backup downloaded successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to download backup');
    } finally {
      setBusy(false);
    }
  };

  const restoreBackup = async () => {
    if (!selectedFile) {
      toast.error('Select a backup JSON file first');
      return;
    }

    const firstConfirm = window.confirm('This will replace the current database data with the selected backup. Continue?');
    if (!firstConfirm) return;

    const typed = window.prompt("Type 'RESTORE BACKUP' to confirm restore:");
    if (typed !== 'RESTORE BACKUP') {
      toast.error('Restore cancelled');
      return;
    }

    const formData = new FormData();
    formData.append('backup', selectedFile);
    formData.append('confirmation', 'RESTORE BACKUP');

    setBusy(true);
    try {
      const res = await api.post('/settings/backup/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(res.data?.message || 'Backup restored successfully');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to restore backup');
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) {
    return (
      <AdminLayout title="Backup & Recovery">
        <div className="card p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-100 rounded w-1/3" />
            <div className="h-24 bg-gray-100 rounded" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Backup & Recovery">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="card p-6 bg-gradient-to-br from-primary to-primary-dark text-white overflow-hidden relative">
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
              <span className="w-7 h-7"><ShieldIcon /></span>
            </div>
            <h1 className="text-2xl font-extrabold">Backup & Recovery</h1>
            <p className="text-white/75 text-sm mt-2 max-w-2xl">
              Download a full database backup before major changes, and restore from a saved backup if anything goes wrong.
            </p>
          </div>
          <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-white/10" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <span className="w-6 h-6"><DownloadIcon /></span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary">Download Backup</h2>
              <p className="text-sm text-gray-500 mt-1">
                Exports students, dues, payments, receipts, settings, logs, and other database records as a JSON file.
              </p>
            </div>
            <button onClick={downloadBackup} disabled={busy} className="btn-primary w-full disabled:opacity-60">
              {busy ? 'Processing...' : 'Download Full Backup'}
            </button>
          </div>

          <div className="card p-6 space-y-4 border-red-100 bg-red-50/30">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center">
              <span className="w-6 h-6"><WrenchIcon /></span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-900">Restore Backup</h2>
              <p className="text-sm text-red-700 mt-1">
                Restoring replaces current live database data. Always download a fresh backup first.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white file:text-red-700 file:font-bold"
            />
            {selectedFile && <p className="text-xs text-gray-500">Selected: {selectedFile.name}</p>}
            <button onClick={restoreBackup} disabled={busy || !selectedFile} className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-xl font-bold w-full disabled:opacity-60">
              {busy ? 'Processing...' : 'Restore Selected Backup'}
            </button>
          </div>
        </div>

        <div className="card p-5 border-yellow-100 bg-yellow-50">
          <h3 className="font-bold text-yellow-900">Important</h3>
          <p className="text-sm text-yellow-800 mt-1">
            This backs up the database records. Your source code is already backed up in GitHub. Uploaded proof images/logos may still depend on Railway file storage, so keep important originals separately.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
