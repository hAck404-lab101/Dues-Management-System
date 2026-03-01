'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const LEVELS = ['100', '200', '300', '400'];

interface Due {
  id: string;
  name: string;
  amount: number;
  academic_year: string;
  deadline: string | null;
  late_fee: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  created_by_email: string;
}

const emptyForm = { name: '', amount: '', academicYear: '', deadline: '', lateFee: '0', description: '' };
const emptyBulk = { level: '', programme: '', academicYear: '', amount: '' };

export default function AdminDuesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [dues, setDues] = useState<Due[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editDue, setEditDue] = useState<Due | null>(null);
  const [bulkDue, setBulkDue] = useState<Due | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [bulkForm, setBulkForm] = useState(emptyBulk);
  const [submitting, setSubmitting] = useState(false);
  const [availableProgrammes, setAvailableProgrammes] = useState<string[]>([]);
  const [availableAcademicYears, setAvailableAcademicYears] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && (!user || user.role === 'student')) router.push('/admin/login');
  }, [user, loading, router]);

  const fetchDues = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await api.get('/dues');
      if (res.data.success) setDues(res.data.data);
    } catch {
      toast.error('Failed to load dues');
    } finally {
      setLoadingData(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get('/settings/public');
      if (res.data.success) {
        setAvailableProgrammes(res.data.data.available_programmes?.split(',').map((p: string) => p.trim()).filter(Boolean) || []);
        setAvailableAcademicYears(res.data.data.available_academic_years?.split(',').map((y: string) => y.trim()).filter(Boolean) || []);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }, []);

  useEffect(() => {
    if (user && user.role !== 'student') {
      fetchDues();
      fetchSettings();
    }
  }, [user, fetchDues, fetchSettings]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/dues', {
        name: form.name, amount: parseFloat(form.amount),
        academicYear: form.academicYear,
        deadline: form.deadline || null,
        lateFee: parseFloat(form.lateFee) || 0,
        description: form.description || null,
      });
      toast.success('Due created successfully');
      setShowCreateModal(false);
      setForm(emptyForm);
      fetchDues();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create due');
    } finally { setSubmitting(false); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDue) return;
    setSubmitting(true);
    try {
      await api.put(`/dues/${editDue.id}`, {
        name: form.name, amount: parseFloat(form.amount),
        academicYear: form.academicYear,
        deadline: form.deadline || null,
        lateFee: parseFloat(form.lateFee) || 0,
        description: form.description || null,
      });
      toast.success('Due updated successfully');
      setShowEditModal(false);
      fetchDues();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update due');
    } finally { setSubmitting(false); }
  };

  const handleToggleActive = async (due: Due) => {
    try {
      const endpoint = due.is_active ? `/dues/${due.id}/deactivate` : `/dues/${due.id}/activate`;
      await api.patch(endpoint);
      toast.success(`Due ${due.is_active ? 'deactivated' : 'activated'}`);
      fetchDues();
    } catch {
      toast.error('Failed to update due status');
    }
  };

  const handleBulkAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkDue) return;
    setSubmitting(true);
    try {
      const payload: any = {};
      if (bulkForm.level) payload.level = bulkForm.level;
      if (bulkForm.programme) payload.programme = bulkForm.programme;
      if (bulkForm.academicYear) payload.academicYear = bulkForm.academicYear;
      if (bulkForm.amount) payload.amount = parseFloat(bulkForm.amount);
      await api.post(`/dues/${bulkDue.id}/assign-bulk`, payload);
      toast.success('Bulk assigned successfully');
      setShowBulkModal(false);
      setBulkForm(emptyBulk);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Bulk assign failed');
    } finally { setSubmitting(false); }
  };

  const openEdit = (d: Due) => {
    setEditDue(d);
    setForm({
      name: d.name, amount: d.amount.toString(),
      academicYear: d.academic_year,
      deadline: d.deadline ? d.deadline.split('T')[0] : '',
      lateFee: d.late_fee?.toString() || '0',
      description: d.description || '',
    });
    setShowEditModal(true);
  };

  return (
    <>
      <Layout title="Manage Dues">
        <div className="flex justify-end mb-6">
          <button onClick={() => { setForm(emptyForm); setShowCreateModal(true); }} className="btn-primary">
            + Create Due
          </button>
        </div>

        <div className="card overflow-x-auto">
          {loadingData ? (
            <div className="space-y-3 p-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : dues.length === 0 ? (
            <p className="text-gray-500 text-center py-10">No dues found. Create one to get started.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="py-3 px-3 font-semibold text-gray-600">Name</th>
                  <th className="py-3 px-3 font-semibold text-gray-600">Amount (GHS)</th>
                  <th className="py-3 px-3 font-semibold text-gray-600">Academic Year</th>
                  <th className="py-3 px-3 font-semibold text-gray-600">Deadline</th>
                  <th className="py-3 px-3 font-semibold text-gray-600">Late Fee</th>
                  <th className="py-3 px-3 font-semibold text-gray-600">Status</th>
                  <th className="py-3 px-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dues.map(d => (
                  <tr key={d.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3 font-medium">
                      {d.name}
                      {d.description && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{d.description}</p>}
                    </td>
                    <td className="py-3 px-3 font-semibold text-primary">GHS {Number(d.amount).toFixed(2)}</td>
                    <td className="py-3 px-3">{d.academic_year}</td>
                    <td className="py-3 px-3 text-gray-500">{d.deadline ? new Date(d.deadline).toLocaleDateString() : '—'}</td>
                    <td className="py-3 px-3 text-red-500 font-medium">GHS {Number(d.late_fee).toFixed(2)}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {d.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => openEdit(d)} className="text-xs btn-outline px-2 py-1">Edit</button>
                        <button
                          onClick={() => { setBulkDue(d); setBulkForm({ ...emptyBulk, amount: d.amount.toString() }); setShowBulkModal(true); }}
                          className="text-xs px-2 py-1 rounded border border-blue-300 text-blue-600 hover:bg-blue-50 font-medium"
                        >
                          Bulk Assign
                        </button>
                        <button
                          onClick={() => handleToggleActive(d)}
                          className={`text-xs px-2 py-1 rounded border font-medium transition-colors ${d.is_active ? 'border-red-300 text-red-600 hover:bg-red-50' : 'border-green-300 text-green-600 hover:bg-green-50'}`}
                        >
                          {d.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => router.push(`/admin/clearance?studentSearch=true`)} className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium">Clearance</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Layout>

      {/* Modals outside Layout for absolute viewport coverage */}
      {showCreateModal && (
        <Modal title="Create New Due" onClose={() => setShowCreateModal(false)}>
          <DueForm
            form={form}
            setForm={setForm}
            onSubmit={handleCreate}
            submitting={submitting}
            onCancel={() => setShowCreateModal(false)}
            submitLabel="Create Due"
            availablePrograms={availableProgrammes}
            availableYears={availableAcademicYears}
          />
        </Modal>
      )}

      {showEditModal && (
        <Modal title={`Edit: ${editDue?.name}`} onClose={() => setShowEditModal(false)}>
          <DueForm
            form={form}
            setForm={setForm}
            onSubmit={handleEdit}
            submitting={submitting}
            onCancel={() => setShowEditModal(false)}
            submitLabel="Save Changes"
            availablePrograms={availableProgrammes}
            availableYears={availableAcademicYears}
          />
        </Modal>
      )}

      {showBulkModal && bulkDue && (
        <Modal title={`Bulk Assign: ${bulkDue.name}`} onClose={() => setShowBulkModal(false)}>
          <p className="text-sm text-gray-500 mb-4">Assign this due to all students matching the criteria below. Leave fields empty to not filter by them.</p>
          <form onSubmit={handleBulkAssign} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Level</label>
                <select className="input-field" value={bulkForm.level} onChange={e => setBulkForm(f => ({ ...f, level: e.target.value }))}>
                  <option value="">All Levels</option>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Programme</label>
                <select className="input-field" value={bulkForm.programme} onChange={e => setBulkForm(f => ({ ...f, programme: e.target.value }))}>
                  <option value="">All Programmes</option>
                  {availableProgrammes.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Academic Year</label>
                <select className="input-field" value={bulkForm.academicYear} onChange={e => setBulkForm(f => ({ ...f, academicYear: e.target.value }))}>
                  <option value="">All Years</option>
                  {availableAcademicYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Custom Amount (GHS)</label>
                <input type="number" step="0.01" className="input-field" value={bulkForm.amount} onChange={e => setBulkForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Assigning…' : 'Bulk Assign'}</button>
              <button type="button" onClick={() => setShowBulkModal(false)} className="btn-outline flex-1">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function DueForm({ form, setForm, onSubmit, submitting, onCancel, submitLabel, availablePrograms, availableYears }: any) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Due Name *</label>
          <input type="text" className="input-field" value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} required />
        </div>
        <div>
          <label className="label">Amount (GHS) *</label>
          <input type="number" step="0.01" className="input-field" value={form.amount} onChange={e => setForm((f: any) => ({ ...f, amount: e.target.value }))} required />
        </div>
        <div>
          <label className="label">Academic Year *</label>
          <select
            className="input-field"
            value={form.academicYear}
            onChange={e => setForm((f: any) => ({ ...f, academicYear: e.target.value }))}
            required
          >
            <option value="">Select Year</option>
            {(availableYears || []).map((y: string) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Deadline</label>
          <input type="date" className="input-field" value={form.deadline} onChange={e => setForm((f: any) => ({ ...f, deadline: e.target.value }))} />
        </div>
        <div>
          <label className="label">Late Fee (GHS)</label>
          <input type="number" step="0.01" className="input-field" value={form.lateFee} onChange={e => setForm((f: any) => ({ ...f, lateFee: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <label className="label">Description</label>
          <textarea className="input-field" rows={2} value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Saving…' : submitLabel}</button>
        <button type="button" onClick={onCancel} className="btn-outline flex-1">Cancel</button>
      </div>
    </form>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <h3 className="text-xl font-extrabold text-primary">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
}
