'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { GroupIcon, ShieldIcon } from '@/components/Icons';

interface StaffUser {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const ROLES = [
  { value: 'treasurer', label: 'Treasurer' },
  { value: 'financial_secretary', label: 'Financial Secretary' },
  { value: 'president', label: 'President' },
  { value: 'admin', label: 'System Admin' },
];

export default function AdminTeamPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState<StaffUser | null>(null);

  const [form, setForm] = useState({ email: '', password: '', role: 'treasurer' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/admin/login');
  }, [user, loading, router]);

  const fetchUsers = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await api.get('/admin/users');
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch {
      toast.error('Failed to load team members');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.role === 'admin') fetchUsers();
  }, [user, fetchUsers]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/admin/users', form);
      toast.success('Staff user added successfully');
      setShowAddModal(false);
      setForm({ email: '', password: '', role: 'treasurer' });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add staff member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setSubmitting(true);
    try {
      const payload: any = { role: form.role };
      if (form.password) payload.password = form.password;
      await api.patch(`/admin/users/${editUser.id}`, payload);
      toast.success('Staff user updated successfully');
      setShowEditModal(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update staff member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (!window.confirm(`Are you sure you want to remove ${email} from the admin team?`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('Staff member removed');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove staff member');
    }
  };

  const openEdit = (u: StaffUser) => {
    setEditUser(u);
    setForm({ email: u.email, password: '', role: u.role });
    setShowEditModal(true);
  };

  return (
    <>
      <Layout title="Team Management">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-primary flex items-center gap-2">
              <span className="w-5 h-5"><GroupIcon /></span>
              <span>Admin Team & Executive Roles</span>
            </h2>
            <p className="text-sm text-gray-500">Manage portal access for executives, treasurers, and admins</p>
          </div>
          <button onClick={() => { setForm({ email: '', password: '', role: 'treasurer' }); setShowAddModal(true); }} className="btn-primary">
            + Add Staff Member
          </button>
        </div>

        <div className="card overflow-x-auto">
          {loadingData ? (
            <div className="space-y-3 p-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : users.length === 0 ? (
            <p className="text-gray-500 text-center py-10">No staff members found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="py-3 px-4 font-semibold text-gray-600">Email Address</th>
                  <th className="py-3 px-4 font-semibold text-gray-600">Role</th>
                  <th className="py-3 px-4 font-semibold text-gray-600">Status</th>
                  <th className="py-3 px-4 font-semibold text-gray-600">Created</th>
                  <th className="py-3 px-4 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-900">{u.email}</td>
                    <td className="py-3 px-4 capitalize">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                        {u.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(u)} className="btn-outline text-xs px-2.5 py-1">Edit</button>
                        {u.email !== user?.email && (
                          <button onClick={() => handleDelete(u.id, u.email)} className="text-xs px-2.5 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50 font-medium">Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Layout>

      {showAddModal && (
        <Modal title="Add Staff Member" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="label">Email Address *</label>
              <input type="email" className="input-field" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Password *</label>
              <input type="password" className="input-field" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Role *</label>
              <select className="input-field" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Adding...' : 'Add Member'}</button>
              <button type="button" onClick={() => setShowAddModal(false)} className="btn-outline flex-1">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {showEditModal && editUser && (
        <Modal title={`Edit: ${editUser.email}`} onClose={() => setShowEditModal(false)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="label">Role *</label>
              <select className="input-field" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">New Password (optional)</label>
              <input type="password" className="input-field" placeholder="Leave blank to keep unchanged" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Saving...' : 'Save Changes'}</button>
              <button type="button" onClick={() => setShowEditModal(false)} className="btn-outline flex-1">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-extrabold text-primary">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
