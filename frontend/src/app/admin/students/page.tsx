'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
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
  const [showResetModal, setShowResetModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [resetStudent, setResetStudent] = useState<Student | null>(null);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [availableProgrammes, setAvailableProgrammes] = useState<string[]>([]);
  const [availableAcademicYears, setAvailableAcademicYears] = useState<string[]>([]);

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
        setSelectedIds([]);
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

  const handleResetCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetStudent) return;

    setSubmitting(true);
    try {
      const payload = resetPassword.trim() ? { password: resetPassword.trim() } : {};
      const res = await api.patch(`/students/${resetStudent.id}/reset-credentials`, payload);
      toast.success(res.data?.message || 'Student login reset and sent by SMS');
      setShowResetModal(false);
      setResetStudent(null);
      setResetPassword('');
      fetchStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reset login credentials');
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

  const openReset = (s: Student) => {
    setResetStudent(s);
    setResetPassword('');
    setShowResetModal(true);
  };

  return (
    <>
      <AdminLayout title="Manage Students">
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
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-4 w-10">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-[#0A2540] focus:ring-[#0A2540] h-4 w-4"
                      checked={students.length > 0 && selectedIds.length === students.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="py-4 px-4 font-semibold">Index No.</th>
                  <th className="py-4 px-4 font-semibold">Name</th>
                  <th className="py-4 px-4 font-semibold">Email</th>
                  <th className="py-4 px-4 font-semibold">Level</th>
                  <th className="py-4 px-4 font-semibold">Programme</th>
                  <th className="py-4 px-4 font-semibold">Status</th>
                  <th className="py-4 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/60">
                {students.map(s => (
                  <tr key={s.id} className={`hover:bg-gray-50/70 transition-colors ${selectedIds.includes(s.id) ? 'bg-primary/5' : ''}`}>
                    <td className="py-4 px-4">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-[#0A2540] focus:ring-[#0A2540] h-4 w-4"
                        checked={selectedIds.includes(s.id)}
                        onChange={() => toggleSelect(s.id)}
                      />
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-gray-600">{s.student_id}</td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-gray-900 text-sm">{s.full_name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{s.phone_number || 'No phone number'}</div>
                    </td>
                    <td className="py-4 px-4 text-gray-600 text-sm">{s.email}</td>
                    <td className="py-4 px-4 text-sm">Lvl {s.level}</td>
                    <td className="py-4 px-4 text-sm max-w-[160px] truncate text-gray-600">{s.programme}</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700">
                        <span className={`w-2 h-2 rounded-full ${s.is_active ? 'bg-blue-500 shadow-sm shadow-blue-500/50' : 'bg-rose-500 shadow-sm shadow-rose-500/50'}`} />
                        <span>{s.is_active ? 'Active' : 'Inactive'}</span>
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right relative">
                      <button
                        onClick={() => setActiveDropdownId(activeDropdownId === s.id ? null : s.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none inline-flex items-center justify-center"
                      >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                        </svg>
                      </button>
                      {activeDropdownId === s.id && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setActiveDropdownId(null)} />
                          <div className="absolute right-4 mt-1 w-44 bg-white border border-gray-100 rounded-xl shadow-xl z-40 py-1 text-left animate-in fade-in slide-in-from-top-2 duration-100">
                            <button
                              onClick={() => {
                                setViewStudent(s);
                                setShowViewModal(true);
                                setActiveDropdownId(null);
                              }}
                              className="w-full px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2 border-b border-gray-50"
                            >
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View Details
                            </button>
                            <button
                              onClick={() => {
                                openEdit(s);
                                setActiveDropdownId(null);
                              }}
                              className="w-full px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit Student
                            </button>
                            <button
                              onClick={() => {
                                openReset(s);
                                setActiveDropdownId(null);
                              }}
                              disabled={!s.phone_number}
                              title={s.phone_number ? 'Send new login details by SMS' : 'Add a phone number first'}
                              className="w-full px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2 disabled:opacity-40"
                            >
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                              </svg>
                              Reset Credentials
                            </button>
                            <button
                              onClick={() => {
                                handleToggleActive(s);
                                setActiveDropdownId(null);
                              }}
                              className="w-full px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {s.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => {
                                handleDelete(s.id, s.full_name);
                                setActiveDropdownId(null);
                              }}
                              className="w-full px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-gray-50"
                            >
                              <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4 pb-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-outline px-3 py-1 text-sm disabled:opacity-40">← Prev</button>
              <span className="text-sm text-gray-600 px-2 py-1">Page {page} of {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-outline px-3 py-1 text-sm disabled:opacity-40">Next →</button>
            </div>
          )}
        </div>
      </AdminLayout>

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

      {showResetModal && resetStudent && (
        <Modal title={`Reset Login: ${resetStudent.full_name}`} onClose={() => { setShowResetModal(false); setResetStudent(null); setResetPassword(''); }}>
          <form onSubmit={handleResetCredentials} className="space-y-4">
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-900">
              <p className="font-semibold mb-1">This will reset the student's portal login.</p>
              <p>Login ID: <span className="font-mono font-bold">{resetStudent.student_id}</span></p>
              <p>SMS will be sent to: <span className="font-semibold">{resetStudent.phone_number || 'No phone number'}</span></p>
            </div>

            <FormField
              label="Temporary Password (optional)"
              type="text"
              value={resetPassword}
              onChange={setResetPassword}
              placeholder="Leave empty to auto-generate"
            />

            <p className="text-xs text-gray-500">
              Leave the password field empty if you want the system to generate a secure temporary password automatically.
            </p>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={submitting || !resetStudent.phone_number} className="btn-primary flex-1">
                {submitting ? 'Sending SMS…' : 'Reset & Send SMS'}
              </button>
              <button type="button" onClick={() => { setShowResetModal(false); setResetStudent(null); setResetPassword(''); }} className="btn-outline flex-1">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showViewModal && viewStudent && (
        <Modal title="Student Details" onClose={() => { setShowViewModal(false); setViewStudent(null); }}>
          <div className="space-y-4 py-2 text-gray-800 text-sm">
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="font-bold text-gray-400">Full Name:</span>
              <span className="font-semibold text-gray-900">{viewStudent.full_name}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="font-bold text-gray-400">Index Number:</span>
              <span className="font-mono text-gray-900">{viewStudent.student_id}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="font-bold text-gray-400">Email Address:</span>
              <span className="text-gray-900 font-semibold">{viewStudent.email || '—'}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="font-bold text-gray-400">Phone Number:</span>
              <span className="text-gray-900 font-semibold">{viewStudent.phone_number || '—'}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="font-bold text-gray-400">Programme:</span>
              <span className="text-gray-900 font-semibold">{viewStudent.programme}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="font-bold text-gray-400">Level:</span>
              <span className="text-gray-900 font-semibold">Level {viewStudent.level}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="font-bold text-gray-400">Academic Year:</span>
              <span className="text-gray-900 font-semibold">{viewStudent.academic_year}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="font-bold text-gray-400">Status:</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900">
                <span className={`w-2 h-2 rounded-full ${viewStudent.is_active ? 'bg-blue-500 shadow-sm shadow-blue-500/50' : 'bg-rose-500 shadow-sm shadow-rose-500/50'}`} />
                <span>{viewStudent.is_active ? 'Active' : 'Inactive'}</span>
              </span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="font-bold text-gray-400">Date Added:</span>
              <span className="text-gray-900 font-semibold">{new Date(viewStudent.created_at).toLocaleString()}</span>
            </div>
            <div className="pt-2">
              <button type="button" onClick={() => { setShowViewModal(false); setViewStudent(null); }} className="btn-outline w-full py-2.5">Close Details</button>
            </div>
          </div>
        </Modal>
      )}
    </>
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

function FormField({ label, value, onChange, type = 'text', placeholder = '', required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} className="input-field" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required} />
    </div>
  );
}
