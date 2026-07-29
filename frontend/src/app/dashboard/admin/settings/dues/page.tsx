'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { TableSkeleton } from '@/components/Skeletons';

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

interface PriceHistoryEntry {
  id: string;
  amount: number;
  effective_from: string;
  changed_by_email: string;
  reason: string | null;
}

const emptyForm = { name: '', amount: '', academicYear: '', deadline: '', lateFee: '0', description: '', priceChangeReason: '' };
const emptyBulk = { level: '', programme: '', academicYear: '', amount: '' };

export default function ManageDuesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [dues, setDues] = useState<Due[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showRepriceModal, setShowRepriceModal] = useState(false);

  // Active items
  const [activeDue, setActiveDue] = useState<Due | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // Price history and Repricing states
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [repriceConfirmText, setRepriceConfirmText] = useState('');

  // Form states
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
    if (!activeDue) return;

    const amountChanged = parseFloat(form.amount) !== activeDue.amount;
    if (amountChanged && !form.priceChangeReason.trim()) {
      toast.error('Please provide a reason for the price change');
      return;
    }

    setSubmitting(true);
    try {
      await api.patch(`/dues/${activeDue.id}`, {
        name: form.name,
        amount: parseFloat(form.amount),
        academic_year: form.academicYear,
        deadline: form.deadline || null,
        late_fee: parseFloat(form.lateFee) || 0,
        description: form.description || null,
        price_change_reason: amountChanged ? form.priceChangeReason : undefined
      });
      toast.success('Due updated successfully');
      setShowEditModal(false);
      fetchDues();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update due');
    } finally { setSubmitting(false); }
  };

  const fetchPriceHistory = async (dueId: string) => {
    setLoadingHistory(true);
    setPriceHistory([]);
    try {
      const res = await api.get(`/dues/${dueId}/price-history`);
      if (res.data.success) {
        setPriceHistory(res.data.data);
      }
    } catch {
      toast.error('Failed to fetch price history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleReprice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDue) return;

    if (repriceConfirmText !== activeDue.name) {
      toast.error(`Confirmation text must match the due name exactly: "${activeDue.name}"`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/dues/${activeDue.id}/reprice-unpaid`, {
        confirmation_text: repriceConfirmText
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Repriced unpaid assignments successfully');
        setShowRepriceModal(false);
        setRepriceConfirmText('');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reprice assignments');
    } finally {
      setSubmitting(false);
    }
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

  const handleDeleteDue = async (due: Due) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${due.name}"? This will fail if assignments are already paid.`);
    if (!confirmDelete) return;

    try {
      const res = await api.delete(`/dues/${due.id}`);
      if (res.data.success) {
        toast.success('Due deleted successfully');
        fetchDues();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete due');
    }
  };

  const handleBulkAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDue) return;
    if (!activeDue.is_active) return toast.error('Activate this due before assigning it.');
    setSubmitting(true);
    try {
      const payload: any = {};
      if (bulkForm.level) payload.level = bulkForm.level;
      if (bulkForm.programme) payload.programme = bulkForm.programme;
      if (bulkForm.academicYear) payload.academicYear = bulkForm.academicYear;
      if (bulkForm.amount) payload.amount = parseFloat(bulkForm.amount);
      const res = await api.post(`/dues/${activeDue.id}/assign`, payload);
      toast.success(res.data?.message || 'Bulk assigned successfully');
      setShowBulkModal(false);
      setBulkForm(emptyBulk);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Bulk assign failed');
    } finally { setSubmitting(false); }
  };

  const handleAssignToStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDue) return;
    if (!activeDue.is_active) return toast.error('Activate this due before assigning it.');
    if (!selectedStudent) return toast.error('Select a student first');
    setSubmitting(true);
    try {
      const payload: any = { studentId: selectedStudent.id };
      if (assignAmount) payload.amount = parseFloat(assignAmount);
      await api.post(`/dues/${activeDue.id}/assign`, payload);
      toast.success(`Due assigned to ${selectedStudent.full_name}`);
      setShowAssignModal(false);
      setSelectedStudent(null);
      setStudentSearch('');
      setAssignAmount('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Student assignment failed');
    } finally { setSubmitting(false); }
  };

  const openEdit = (d: Due) => {
    setActiveDue(d);
    setForm({
      name: d.name,
      amount: d.amount.toString(),
      academicYear: d.academic_year,
      deadline: d.deadline ? d.deadline.split('T')[0] : '',
      lateFee: d.late_fee?.toString() || '0',
      description: d.description || '',
      priceChangeReason: ''
    });
    setShowEditModal(true);
  };

  return (
    <AdminLayout title="Manage Department Dues">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Dues Roster & Pricing</h2>
          <p className="text-sm text-gray-500">Create, assign, edit, and track payment dues for all students.</p>
        </div>
        <button 
          onClick={() => { setForm(emptyForm); setShowCreateModal(true); }} 
          className="btn-primary"
        >
          + Create Due Item
        </button>
      </div>

      <div className="card overflow-x-auto">
        {loadingData ? (
          <TableSkeleton rows={6} columns={7} />
        ) : dues.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="font-semibold">No dues found</p>
            <p className="text-xs text-gray-400 mt-1">Create your first departmental due item to get started.</p>
          </div>
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
                        <div className="fixed inset-0 z-35" onClick={() => setActiveDropdownId(null)} />
                        <div className="absolute right-4 mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-40 py-1 text-left">
                          <button
                            onClick={() => {
                              setActiveDue(d);
                              setShowViewModal(true);
                              setActiveDropdownId(null);
                            }}
                            className="w-full px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-50"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => {
                              openEdit(d);
                              setActiveDropdownId(null);
                            }}
                            className="w-full px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            Edit Due
                          </button>
                          <button
                            onClick={() => {
                              setActiveDue(d);
                              setPriceHistory([]);
                              fetchPriceHistory(d.id);
                              setShowHistoryModal(true);
                              setActiveDropdownId(null);
                            }}
                            className="w-full px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            Price History
                          </button>
                          <button
                            onClick={() => {
                              setActiveDue(d);
                              setRepriceConfirmText('');
                              setShowRepriceModal(true);
                              setActiveDropdownId(null);
                            }}
                            className="w-full px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-50"
                          >
                            Re-price Unpaid
                          </button>
                          <button
                            onClick={() => {
                              setActiveDue(d);
                              setAssignAmount(d.amount.toString());
                              setStudentSearch('');
                              setStudentResults([]);
                              setSelectedStudent(null);
                              setShowAssignModal(true);
                              setActiveDropdownId(null);
                            }}
                            disabled={!d.is_active}
                            className="w-full px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Assign Student
                          </button>
                          <button
                            onClick={() => {
                              setActiveDue(d);
                              setBulkForm({ ...emptyBulk, amount: d.amount.toString() });
                              setShowBulkModal(true);
                              setActiveDropdownId(null);
                            }}
                            disabled={!d.is_active}
                            className="w-full px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-40"
                          >
                            Bulk Assign
                          </button>
                          <button
                            onClick={() => {
                              handleToggleActive(d);
                              setActiveDropdownId(null);
                            }}
                            className="w-full px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            {d.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => {
                              handleDeleteDue(d);
                              setActiveDropdownId(null);
                            }}
                            className="w-full px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            Delete Due
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

      {/* CREATE MODAL */}
      {showCreateModal && (
        <Modal title="Create New Due Item" onClose={() => setShowCreateModal(false)}>
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

      {/* EDIT MODAL */}
      {showEditModal && activeDue && (
        <Modal title={`Edit: ${activeDue.name}`} onClose={() => setShowEditModal(false)}>
          <DueForm 
            form={form} 
            setForm={setForm} 
            onSubmit={handleEdit} 
            submitting={submitting} 
            onCancel={() => setShowEditModal(false)} 
            submitLabel="Save Changes" 
            availablePrograms={availableProgrammes} 
            availableYears={availableAcademicYears}
            isEdit={true}
            originalAmount={activeDue.amount}
          />
        </Modal>
      )}

      {/* VIEW MODAL */}
      {showViewModal && activeDue && (
        <Modal title="Due Item Details" onClose={() => setShowViewModal(false)}>
          <div className="space-y-4 text-sm text-gray-800">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Due Name</p>
                <p className="font-bold text-gray-900 text-sm mt-0.5">{activeDue.name}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Current Amount</p>
                <p className="font-bold text-gray-900 text-sm mt-0.5">GHS {Number(activeDue.amount).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Academic Year</p>
                <p className="font-semibold text-gray-800 text-sm mt-0.5">{activeDue.academic_year}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Deadline</p>
                <p className="font-semibold text-gray-800 text-sm mt-0.5">{activeDue.deadline ? new Date(activeDue.deadline).toLocaleDateString() : '—'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Late Fee</p>
                <p className="font-bold text-rose-600 text-sm mt-0.5">GHS {Number(activeDue.late_fee).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Created By</p>
                <p className="font-semibold text-gray-800 text-sm mt-0.5">{activeDue.created_by_email}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-bold text-gray-400 uppercase">Description</p>
                <p className="font-medium text-gray-700 text-sm mt-0.5 leading-relaxed">{activeDue.description || '—'}</p>
              </div>
            </div>
            <div className="pt-4 border-t flex justify-end">
              <button onClick={() => setShowViewModal(false)} className="btn-secondary px-6">Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* PRICE HISTORY MODAL */}
      {showHistoryModal && activeDue && (
        <Modal title={`Price History: ${activeDue.name}`} onClose={() => setShowHistoryModal(false)}>
          {loadingHistory ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : priceHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-6 text-sm">No price modifications recorded.</p>
          ) : (
            <div className="relative border-l border-gray-200 ml-4 pl-6 space-y-6">
              {priceHistory.map((item, index) => (
                <div key={item.id} className="relative">
                  {/* Timeline dot */}
                  <span className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white bg-primary shadow-sm" />
                  
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-extrabold text-gray-900 text-sm">GHS {Number(item.amount).toFixed(2)}</span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">
                        {new Date(item.effective_from).toLocaleString('en-GH')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium">Changed by: {item.changed_by_email}</p>
                    {item.reason && (
                      <p className="text-xs text-gray-700 mt-2 bg-white rounded-lg p-2.5 border border-dashed border-gray-200 italic leading-relaxed">
                        &ldquo;{item.reason}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="pt-6 border-t flex justify-end mt-4">
            <button onClick={() => setShowHistoryModal(false)} className="btn-secondary px-6">Close</button>
          </div>
        </Modal>
      )}

      {/* RE-PRICE UNPAID MODAL */}
      {showRepriceModal && activeDue && (
        <Modal title={`Re-price Unpaid Assignments: ${activeDue.name}`} onClose={() => setShowRepriceModal(false)}>
          <form onSubmit={handleReprice} className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 text-xs leading-relaxed space-y-2">
              <p className="font-bold uppercase tracking-wide">⚠️ Safety Critical Warning</p>
              <p>This action will change the price locked in all **UNPAID** assignments for this due to the current price of **GHS {Number(activeDue.amount).toFixed(2)}**.</p>
              <p>It will **NOT** affect students who have already started paying (status is partial or paid). This operation is logged in the audit trail.</p>
            </div>

            <div>
              <label className="label">Confirm by typing the Due Item name exactly:</label>
              <p className="text-xs text-gray-500 font-semibold mb-2">Type: <span className="font-mono text-gray-800 font-bold">&ldquo;{activeDue.name}&rdquo;</span></p>
              <input 
                type="text" 
                className="input-field" 
                value={repriceConfirmText} 
                onChange={e => setRepriceConfirmText(e.target.value)} 
                required 
                placeholder="Enter due name to confirm"
              />
            </div>

            <div className="flex gap-3 pt-3">
              <button 
                type="submit" 
                disabled={submitting || repriceConfirmText !== activeDue.name} 
                className="bg-primary hover:bg-primary-dark text-white font-bold rounded-full flex-1 py-3 text-sm transition-all disabled:opacity-50"
              >
                {submitting ? 'Applying pricing...' : 'Apply Current Price to Unpaid'}
              </button>
              <button 
                type="button" 
                onClick={() => setShowRepriceModal(false)} 
                className="btn-outline flex-1 py-3"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ASSIGN SINGLE STUDENT MODAL */}
      {showAssignModal && activeDue && (
        <Modal title={`Assign to Student: ${activeDue.name}`} onClose={() => setShowAssignModal(false)}>
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

      {/* BULK ASSIGN MODAL */}
      {showBulkModal && activeDue && (
        <Modal title={`Bulk Assign: ${activeDue.name}`} onClose={() => setShowBulkModal(false)}>
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
    </AdminLayout>
  );
}

function DueForm({ form, setForm, onSubmit, submitting, onCancel, submitLabel, availablePrograms, availableYears, isEdit = false, originalAmount = 0 }: any) {
  const showReasonField = isEdit && parseFloat(form.amount) !== originalAmount;

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
          <select className="input-field" value={form.academicYear} onChange={e => setForm((f: any) => ({ ...f, academicYear: e.target.value }))} required>
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

        {showReasonField && (
          <div className="col-span-2 bg-blue-50/50 p-4 border border-blue-100 rounded-xl">
            <label className="label text-primary">Price Change Reason *</label>
            <p className="text-[10px] text-gray-500 mb-2 font-semibold">You changed the amount from GHS {originalAmount.toFixed(2)} to GHS {parseFloat(form.amount).toFixed(2)}. This requires a documented reason for audits.</p>
            <textarea 
              className="input-field" 
              rows={2} 
              value={form.priceChangeReason} 
              onChange={e => setForm((f: any) => ({ ...f, priceChangeReason: e.target.value }))} 
              required 
              placeholder="e.g. Approved price increase by department committee"
            />
          </div>
        )}

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
