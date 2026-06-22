'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
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
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editDue, setEditDue] = useState<Due | null>(null);
  const [bulkDue, setBulkDue] = useState<Due | null>(null);
  const [assignDue, setAssignDue] = useState<Due | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewDue, setViewDue] = useState<Due | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [bulkForm, setBulkForm] = useState(emptyBulk);
  const [assignAmount, setAssignAmount] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [searchingStudents, setSearchingStudents] = useState(false);

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

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!showAssignModal || studentSearch.trim().length < 2) {
        setStudentResults([]);
        return;
      }
      setSearchingStudents(true);
      try {
        const res = await api.get('/students', { params: { search: studentSearch.trim(), limit: 8 } });
        if (res.data.success) setStudentResults(res.data.data || []);
      } catch {
        toast.error('Student search failed');
      } finally {
        setSearchingStudents(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [studentSearch, showAssignModal]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/dues', {
        name: form.name,
        amount: parseFloat(form.amount),
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
        name: form.name,
        amount: parseFloat(form.amount),
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
    if (!bulkDue.is_active) return toast.error('Activate this due before assigning it.');
    setSubmitting(true);
    try {
      const payload: any = {};
      if (bulkForm.level) payload.level = bulkForm.level;
      if (bulkForm.programme) payload.programme = bulkForm.programme;
      if (bulkForm.academicYear) payload.academicYear = bulkForm.academicYear;
      if (bulkForm.amount) payload.amount = parseFloat(bulkForm.amount);
      const res = await api.post(`/dues/${bulkDue.id}/assign-bulk`, payload);
      toast.success(res.data?.message || 'Bulk assigned successfully');
      setShowBulkModal(false);
      setBulkForm(emptyBulk);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Bulk assign failed');
    } finally { setSubmitting(false); }
  };

  const handleAssignToStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignDue) return;
    if (!assignDue.is_active) return toast.error('Activate this due before assigning it.');
    if (!selectedStudent) return toast.error('Select a student first');
    setSubmitting(true);
    try {
      const payload: any = { studentId: selectedStudent.id };
      if (assignAmount) payload.amount = parseFloat(assignAmount);
      await api.post(`/dues/${assignDue.id}/assign`, payload);
      toast.success(`Due assigned to ${selectedStudent.full_name}`);
      setShowAssignModal(false);
      setAssignDue(null);
      setSelectedStudent(null);
      setStudentSearch('');
      setAssignAmount('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Student assignment failed');
    } finally { setSubmitting(false); }
  };

  const openEdit = (d: Due) => {
    setEditDue(d);
    setForm({
      name: d.name,
      amount: d.amount.toString(),
      academicYear: d.academic_year,
      deadline: d.deadline ? d.deadline.split('T')[0] : '',
      lateFee: d.late_fee?.toString() || '0',
      description: d.description || '',
    });
    setShowEditModal(true);
  };

  const openSingleAssign = (d: Due) => {
    if (!d.is_active) return toast.error('Activate this due before assigning it.');
    setAssignDue(d);
    setAssignAmount(d.amount.toString());
    setStudentSearch('');
    setStudentResults([]);
    setSelectedStudent(null);
    setShowAssignModal(true);
  };

  const openBulkAssign = (d: Due) => {
    if (!d.is_active) return toast.error('Activate this due before assigning it.');
    setBulkDue(d);
    setBulkForm({ ...emptyBulk, amount: d.amount.toString() });
    setShowBulkModal(true);
  };

  return (
    <>
      <AdminLayout title="Manage Dues">
        <div className="flex justify-end mb-6">
          <button onClick={() => { setForm(emptyForm); setShowCreateModal(true); }} className="btn-primary">+ Create Due</button>
        </div>

        <div className="card overflow-x-auto">
          {loadingData ? (
            <div className="space-y-3 p-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : dues.length === 0 ? (
            <p className="text-gray-500 text-center py-10">No dues found. Create one to get started.</p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-4 font-semibold">Name</th>
                  <th className="py-4 px-4 font-semibold">Amount</th>
                  <th className="py-4 px-4 font-semibold">Academic Year</th>
                  <th className="py-4 px-4 font-semibold">Deadline</th>
                  <th className="py-4 px-4 font-semibold">Late Fee</th>
                  <th className="py-4 px-4 font-semibold">Status</th>
                  <th className="py-4 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/60">
                {dues.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-semibold text-gray-900 text-sm">{d.name}</div>
                      {d.description && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{d.description}</p>}
                    </td>
                    <td className="py-4 px-4 font-semibold text-gray-900 text-sm">GHS {Number(d.amount).toFixed(2)}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{d.academic_year}</td>
                    <td className="py-4 px-4 text-sm text-gray-500">{d.deadline ? new Date(d.deadline).toLocaleDateString() : '—'}</td>
                    <td className="py-4 px-4 text-sm text-rose-500 font-medium">GHS {Number(d.late_fee).toFixed(2)}</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700">
                        <span className={`w-2 h-2 rounded-full ${d.is_active ? 'bg-blue-500 shadow-sm shadow-blue-500/50' : 'bg-gray-300 shadow-sm'}`} />
                        <span>{d.is_active ? 'Active' : 'Inactive'}</span>
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right relative">
                      <button
                        onClick={() => setActiveDropdownId(activeDropdownId === d.id ? null : d.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none inline-flex items-center justify-center"
                      >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                        </svg>
                      </button>
                      {activeDropdownId === d.id && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setActiveDropdownId(null)} />
                          <div className="absolute right-4 mt-1 w-44 bg-white border border-gray-100 rounded-xl shadow-xl z-40 py-1 text-left animate-in fade-in slide-in-from-top-2 duration-100">
                            <button
                              onClick={() => {
                                setViewDue(d);
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
                                openEdit(d);
                                setActiveDropdownId(null);
                              }}
                              className="w-full px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit Due
                            </button>
                            <button
                              onClick={() => {
                                openSingleAssign(d);
                                setActiveDropdownId(null);
                              }}
                              disabled={!d.is_active}
                              className="w-full px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              Assign Student
                            </button>
                            <button
                              onClick={() => {
                                openBulkAssign(d);
                                setActiveDropdownId(null);
                              }}
                              disabled={!d.is_active}
                              className="w-full px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              Bulk Assign
                            </button>
                            <button
                              onClick={() => {
                                handleToggleActive(d);
                                setActiveDropdownId(null);
                              }}
                              className="w-full px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2 border-b border-gray-50"
                            >
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {d.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => {
                                router.push(`/admin/clearance?studentSearch=true`);
                                setActiveDropdownId(null);
                              }}
                              className="w-full px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                              </svg>
                              Check Clearance
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
        </div>
      </AdminLayout>

      {showCreateModal && (
        <Modal title="Create New Due" onClose={() => setShowCreateModal(false)}>
          <DueForm form={form} setForm={setForm} onSubmit={handleCreate} submitting={submitting} onCancel={() => setShowCreateModal(false)} submitLabel="Create Due" availablePrograms={availableProgrammes} availableYears={availableAcademicYears} />
        </Modal>
      )}

      {showEditModal && (
        <Modal title={`Edit: ${editDue?.name}`} onClose={() => setShowEditModal(false)}>
          <DueForm form={form} setForm={setForm} onSubmit={handleEdit} submitting={submitting} onCancel={() => setShowEditModal(false)} submitLabel="Save Changes" availablePrograms={availableProgrammes} availableYears={availableAcademicYears} />
        </Modal>
      )}

      {showAssignModal && assignDue && (
        <Modal title={`Assign to Student: ${assignDue.name}`} onClose={() => setShowAssignModal(false)}>
          <form onSubmit={handleAssignToStudent} className="space-y-4">
            <p className="text-sm text-gray-500">Search and select one student to assign this due.</p>
            <div className="relative">
              <label className="label">Search Student</label>
              <input className="input-field" value={studentSearch} onChange={e => { setStudentSearch(e.target.value); setSelectedStudent(null); }} placeholder="Search by name, index number, or email" />
              {searchingStudents && <p className="text-xs text-gray-400 mt-2">Searching...</p>}
              {studentResults.length > 0 && !selectedStudent && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-xl shadow-xl max-h-56 overflow-y-auto z-20">
                  {studentResults.map(s => (
                    <button key={s.id} type="button" onClick={() => { setSelectedStudent(s); setStudentSearch(`${s.full_name} (${s.student_id})`); setStudentResults([]); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0">
                      <p className="font-semibold text-sm text-primary">{s.full_name}</p>
                      <p className="text-xs text-gray-500">{s.student_id} · {s.programme} · Level {s.level}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedStudent && (
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                <p className="font-bold text-primary text-sm">{selectedStudent.full_name}</p>
                <p className="text-xs text-gray-500">{selectedStudent.student_id} · {selectedStudent.programme} · Level {selectedStudent.level}</p>
              </div>
            )}

            <div>
              <label className="label">Amount (GHS)</label>
              <input type="number" step="0.01" className="input-field" value={assignAmount} onChange={e => setAssignAmount(e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">Leave as the due amount unless this student needs a custom amount.</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={submitting || !selectedStudent} className="btn-primary flex-1 disabled:opacity-50">{submitting ? 'Assigning…' : 'Assign Student'}</button>
              <button type="button" onClick={() => setShowAssignModal(false)} className="btn-outline flex-1">Cancel</button>
            </div>
          </form>
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

      {showViewModal && viewDue && (
        <Modal title="Due Details" onClose={() => { setShowViewModal(false); setViewDue(null); }}>
          <div className="space-y-4 py-2 text-gray-800 text-sm">
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="font-bold text-gray-400">Due Name:</span>
              <span className="font-semibold text-gray-900">{viewDue.name}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="font-bold text-gray-400">Description:</span>
              <span className="text-gray-900 font-semibold">{viewDue.description || '—'}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="font-bold text-gray-400">Amount:</span>
              <span className="text-gray-900 font-bold">GHS {Number(viewDue.amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="font-bold text-gray-400">Academic Year:</span>
              <span className="text-gray-900 font-semibold">{viewDue.academic_year}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="font-bold text-gray-400">Deadline:</span>
              <span className="text-gray-900 font-semibold">{viewDue.deadline ? new Date(viewDue.deadline).toLocaleDateString() : '—'}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="font-bold text-gray-400">Late Fee:</span>
              <span className="text-red-500 font-bold">GHS {Number(viewDue.late_fee).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="font-bold text-gray-400">Status:</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900">
                <span className={`w-2 h-2 rounded-full ${viewDue.is_active ? 'bg-blue-500 shadow-sm shadow-blue-500/50' : 'bg-gray-300 shadow-sm'}`} />
                <span>{viewDue.is_active ? 'Active' : 'Inactive'}</span>
              </span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="font-bold text-gray-400">Created By:</span>
              <span className="text-gray-900 font-semibold">{viewDue.created_by_email}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="font-bold text-gray-400">Created At:</span>
              <span className="text-gray-900 font-semibold">{new Date(viewDue.created_at).toLocaleString()}</span>
            </div>
            <div className="pt-2">
              <button type="button" onClick={() => { setShowViewModal(false); setViewDue(null); }} className="btn-outline w-full py-2.5">Close Details</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function DueForm({ form, setForm, onSubmit, submitting, onCancel, submitLabel, availablePrograms, availableYears }: any) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><label className="label">Due Name *</label><input type="text" className="input-field" value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} required /></div>
        <div><label className="label">Amount (GHS) *</label><input type="number" step="0.01" className="input-field" value={form.amount} onChange={e => setForm((f: any) => ({ ...f, amount: e.target.value }))} required /></div>
        <div><label className="label">Academic Year *</label><select className="input-field" value={form.academicYear} onChange={e => setForm((f: any) => ({ ...f, academicYear: e.target.value }))} required><option value="">Select Year</option>{(availableYears || []).map((y: string) => <option key={y} value={y}>{y}</option>)}</select></div>
        <div><label className="label">Deadline</label><input type="date" className="input-field" value={form.deadline} onChange={e => setForm((f: any) => ({ ...f, deadline: e.target.value }))} /></div>
        <div><label className="label">Late Fee (GHS)</label><input type="number" step="0.01" className="input-field" value={form.lateFee} onChange={e => setForm((f: any) => ({ ...f, lateFee: e.target.value }))} /></div>
        <div className="col-span-2"><label className="label">Description</label><textarea className="input-field" rows={2} value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} /></div>
      </div>
      <div className="flex gap-3 pt-2"><button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Saving…' : submitLabel}</button><button type="button" onClick={onCancel} className="btn-outline flex-1">Cancel</button></div>
    </form>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <h3 className="text-xl font-extrabold text-primary">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
}
