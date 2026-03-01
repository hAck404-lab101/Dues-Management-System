'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const LEVELS = ['100', '200', '300', '400'];

interface Student {
  id: string;
  student_id: string;
  full_name: string;
  email: string;
  level: string;
  programme: string;
  academic_year: string;
  phone_number: string;
  is_active: boolean;
  created_at: string;
}

const emptyForm = {
  studentId: '', fullName: '', email: '', level: '100',
  programme: '', academicYear: '', phoneNumber: '', password: '',
};

export default function AdminStudentsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [availableProgrammes, setAvailableProgrammes] = useState<string[]>([]);
  const [availableAcademicYears, setAvailableAcademicYears] = useState<string[]>([]);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && (!user || user.role === 'student')) router.push('/admin/login');
  }, [user, loading, router]);

  const fetchStudents = useCallback(async () => {
    setLoadingData(true);
    try {
      const params: any = { page, limit: 15 };
      if (search) params.search = search;
      if (filterLevel) params.level = filterLevel;
      const res = await api.get('/students', { params });
      if (res.data.success) {
        setStudents(res.data.data);
        setTotalPages(res.data.pagination.pages || 1);
        setTotal(res.data.pagination.total || 0);
        setSelectedIds([]); // Reset selection on page change or filter
      }
    } catch {
      toast.error('Failed to load students');
    } finally {
      setLoadingData(false);
    }
  }, [page, search, filterLevel]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get('/settings/public');
      if (res.data.success) {
        const programmes = res.data.data.available_programmes?.split(',').map((p: string) => p.trim()).filter(Boolean) || [];
        const years = res.data.data.available_academic_years?.split(',').map((y: string) => y.trim()).filter(Boolean) || [];
        setAvailableProgrammes(programmes);
        setAvailableAcademicYears(years);

        setForm(f => ({
          ...f,
          programme: f.programme || (programmes.length > 0 ? programmes[0] : ''),
          academicYear: f.academicYear || (years.length > 0 ? years[0] : '')
        }));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }, []);

  useEffect(() => {
    if (user && user.role !== 'student') {
      fetchStudents();
      fetchSettings();
    }
  }, [user, fetchStudents, fetchSettings]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/students', form);
      toast.success('Student added successfully');
      setShowAddModal(false);
      setForm(emptyForm);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add student');
    } finally { setSubmitting(false); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudent) return;
    setSubmitting(true);
    try {
      await api.put(`/students/${editStudent.id}`, {
        fullName: form.fullName, email: form.email, level: form.level,
        programme: form.programme, academicYear: form.academicYear,
        phoneNumber: form.phoneNumber,
      });
      toast.success('Student updated successfully');
      setShowEditModal(false);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update student');
    } finally { setSubmitting(false); }
  };

  const handleToggleActive = async (student: Student) => {
    try {
      const endpoint = student.is_active
        ? `/students/${student.id}/deactivate`
        : `/students/${student.id}/activate`;
      await api.patch(endpoint);
      toast.success(`Student ${student.is_active ? 'deactivated' : 'activated'}`);
      fetchStudents();
    } catch {
      toast.error('Failed to update student status');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This will also delete all their payments and receipts.`)) return;

    try {
      await api.delete(`/students/${id}`);
      toast.success('Student deleted successfully');
      fetchStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete student');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected students? This action is irreversible.`)) return;

    setSubmitting(true);
    try {
      const res = await api.delete('/students/bulk', { data: { ids: selectedIds } });
      if (res.data.success) {
        toast.success(res.data.message);
        setSelectedIds([]);
        fetchStudents();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Bulk delete failed');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === students.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(students.map(s => s.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const openEdit = (s: Student) => {
    setEditStudent(s);
    setForm({ ...emptyForm, fullName: s.full_name, level: s.level, programme: s.programme, academicYear: s.academic_year, phoneNumber: s.phone_number || '', email: s.email || '' });
    setShowEditModal(true);
  };

  return (
    <>
      <Layout title="Manage Students">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
          <div className="flex gap-3 flex-wrap items-center">
            <input
              type="text" placeholder="Search name, ID, email…"
              className="input-field w-64"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
            <select className="input-field w-36" value={filterLevel} onChange={e => { setFilterLevel(e.target.value); setPage(1); }}>
              <option value="">All Levels</option>
              {LEVELS.map(l => <option key={l} value={l}>Level {l}</option>)}
            </select>

            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={submitting}
                className="btn-primary bg-red-600 hover:bg-red-700 border-red-600 shadow-red-200 animate-in zoom-in duration-200"
              >
                Delete Selected ({selectedIds.length})
              </button>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-500">{total} student{total !== 1 ? 's' : ''}</span>
            <button onClick={() => { setForm(emptyForm); setShowAddModal(true); }} className="btn-primary">
              + Add Student
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-x-auto">
          {loadingData ? (
            <div className="space-y-3 p-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : students.length === 0 ? (
            <p className="text-gray-500 text-center py-10">No students found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="py-3 px-3 w-10">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                      checked={students.length > 0 && selectedIds.length === students.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="py-3 px-3 font-semibold text-gray-600">Index No.</th>
                  <th className="py-3 px-3 font-semibold text-gray-600">Name</th>
                  <th className="py-3 px-3 font-semibold text-gray-600">Email</th>
                  <th className="py-3 px-3 font-semibold text-gray-600">Level</th>
                  <th className="py-3 px-3 font-semibold text-gray-600">Programme</th>
                  <th className="py-3 px-3 font-semibold text-gray-600">Status</th>
                  <th className="py-3 px-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id} className={`border-b hover:bg-gray-50 transition-colors ${selectedIds.includes(s.id) ? 'bg-primary/5' : ''}`}>
                    <td className="py-3 px-3">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                        checked={selectedIds.includes(s.id)}
                        onChange={() => toggleSelect(s.id)}
                      />
                    </td>
                    <td className="py-3 px-3 font-mono">{s.student_id}</td>
                    <td className="py-3 px-3 font-medium">{s.full_name}</td>
                    <td className="py-3 px-3 text-gray-600">{s.email}</td>
                    <td className="py-3 px-3">Lvl {s.level}</td>
                    <td className="py-3 px-3 max-w-[160px] truncate">{s.programme}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(s)} className="text-xs btn-outline px-2 py-1">Edit</button>
                        <button
                          onClick={() => handleToggleActive(s)}
                          className={`text-xs px-2 py-1 rounded border font-medium transition-colors ${s.is_active ? 'border-red-300 text-red-600 hover:bg-red-50' : 'border-green-300 text-green-600 hover:bg-green-50'}`}
                        >
                          {s.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDelete(s.id, s.full_name)}
                          className="text-xs px-2 py-1 rounded border border-red-200 text-red-400 hover:bg-red-50 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4 pb-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-outline px-3 py-1 text-sm disabled:opacity-40">← Prev</button>
              <span className="text-sm text-gray-600 px-2 py-1">Page {page} of {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-outline px-3 py-1 text-sm disabled:opacity-40">Next →</button>
            </div>
          )}
        </div>
      </Layout>

      {/* Modals outside Layout for absolute viewport coverage */}
      {showAddModal && (
        <Modal title="Add New Student" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Index Number *" value={form.studentId} onChange={v => setForm(f => ({ ...f, studentId: v }))} placeholder="e.g. UCC/CS/21/001" required />
              <FormField label="Full Name *" value={form.fullName} onChange={v => setForm(f => ({ ...f, fullName: v }))} required />
              <FormField label="Email *" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} required />
              <FormField label="Phone" value={form.phoneNumber} onChange={v => setForm(f => ({ ...f, phoneNumber: v }))} placeholder="0244123456" />
              <div>
                <label className="label">Level *</label>
                <select className="input-field" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Programme *</label>
                <select
                  className="input-field"
                  value={form.programme}
                  onChange={e => setForm(f => ({ ...f, programme: e.target.value }))}
                  required
                >
                  <option value="">Select Programme</option>
                  {availableProgrammes.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Academic Year *</label>
                <select
                  className="input-field"
                  value={form.academicYear}
                  onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))}
                  required
                >
                  <option value="">Select Year</option>
                  {availableAcademicYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <FormField label="Password *" type="password" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} required />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Adding…' : 'Add Student'}</button>
              <button type="button" onClick={() => setShowAddModal(false)} className="btn-outline flex-1">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {showEditModal && editStudent && (
        <Modal title={`Edit: ${editStudent.full_name}`} onClose={() => setShowEditModal(false)}>
          <form onSubmit={handleEdit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Full Name *" value={form.fullName} onChange={v => setForm(f => ({ ...f, fullName: v }))} required />
              <FormField label="Email" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
              <FormField label="Phone" value={form.phoneNumber} onChange={v => setForm(f => ({ ...f, phoneNumber: v }))} />
              <div>
                <label className="label">Level</label>
                <select className="input-field" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Programme</label>
                <select
                  className="input-field"
                  value={form.programme}
                  onChange={e => setForm(f => ({ ...f, programme: e.target.value }))}
                >
                  <option value="">Select Programme</option>
                  {availableProgrammes.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Academic Year</label>
                <select
                  className="input-field"
                  value={form.academicYear}
                  onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))}
                >
                  <option value="">Select Year</option>
                  {availableAcademicYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Saving…' : 'Save Changes'}</button>
              <button type="button" onClick={() => setShowEditModal(false)} className="btn-outline flex-1">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

/* ─── Helpers ─── */
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

function FormField({ label, value, onChange, type = 'text', placeholder = '', required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} className="input-field" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required} />
    </div>
  );
}
