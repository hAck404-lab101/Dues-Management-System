'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const ROLES = ['admin', 'treasurer', 'financial_secretary', 'president', 'staff'];

export default function TeamManagementPage() {
    const router = useRouter();
    const { user, loading } = useAuth();

    const [staff, setStaff] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editUser, setEditUser] = useState<any>(null);
    const [form, setForm] = useState({ email: '', password: '', role: 'staff' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!loading && (!user || user.role !== 'admin')) router.push('/admin/login');
    }, [user, loading, router]);

    const fetchStaff = useCallback(async () => {
        setLoadingData(true);
        try {
            const res = await api.get('/admin/users');
            if (res.data.success) setStaff(res.data.data);
        } catch {
            toast.error('Failed to load team members');
        } finally {
            setLoadingData(false);
        }
    }, []);

    useEffect(() => { if (user && user.role === 'admin') fetchStaff(); }, [user, fetchStaff]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editUser) {
                await api.patch(`/admin/users/${editUser.id}`, { role: form.role, password: form.password || undefined });
                toast.success('User updated');
            } else {
                await api.post('/admin/users', form);
                toast.success('Staff user created');
            }
            setShowModal(false);
            fetchStaff();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Action failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleStatus = async (userRecord: any) => {
        try {
            await api.patch(`/admin/users/${userRecord.id}`, { is_active: !userRecord.is_active });
            toast.success(`User ${userRecord.is_active ? 'deactivated' : 'activated'}`);
            fetchStaff();
        } catch {
            toast.error('Status update failed');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to remove this staff member?')) return;
        try {
            await api.delete(`/admin/users/${id}`);
            toast.success('User removed');
            fetchStaff();
        } catch {
            toast.error('Delete failed');
        }
    };

    const openEdit = (u: any) => {
        setEditUser(u);
        setForm({ email: u.email, password: '', role: u.role });
        setShowModal(true);
    };

    const openCreate = () => {
        setEditUser(null);
        setForm({ email: '', password: '', role: 'staff' });
        setShowModal(true);
    };

    return (
        <Layout title="Team Management">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-primary">👥 Executive Team</h2>
                        <p className="text-sm text-gray-500">Manage admin and staff access roles.</p>
                    </div>
                    <button onClick={openCreate} className="btn-primary">+ Add Member</button>
                </div>

                <div className="card overflow-x-auto">
                    {loadingData ? (
                        <div className="p-8 text-center animate-pulse text-gray-400">Loading team members...</div>
                    ) : staff.length === 0 ? (
                        <p className="text-center py-12 text-gray-500">No staff users found.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 text-left border-b">
                                    <th className="py-3 px-4 font-semibold text-gray-600 uppercase text-xs">Email</th>
                                    <th className="py-3 px-4 font-semibold text-gray-600 uppercase text-xs">Role</th>
                                    <th className="py-3 px-4 font-semibold text-gray-600 uppercase text-xs">Status</th>
                                    <th className="py-3 px-4 font-semibold text-gray-600 uppercase text-xs">Joined</th>
                                    <th className="py-3 px-4 font-semibold text-gray-600 uppercase text-xs text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {staff.map(s => (
                                    <tr key={s.id} className="border-b hover:bg-gray-50 transition-colors">
                                        <td className="py-4 px-4 font-medium">{s.email} {s.id === user?.id && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded ml-1 font-bold">YOU</span>}</td>
                                        <td className="py-4 px-4">
                                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100 capitalize">
                                                {s.role.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${s.is_active ? 'text-green-600' : 'text-red-500'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${s.is_active ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                                {s.is_active ? 'Active' : 'Deactivated'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-gray-400 text-xs">{new Date(s.created_at).toLocaleDateString()}</td>
                                        <td className="py-4 px-4 text-right space-x-2">
                                            <button onClick={() => openEdit(s)} className="text-secondary hover:underline font-semibold">Edit</button>
                                            {s.id !== user?.id && (
                                                <>
                                                    <button onClick={() => handleToggleStatus(s)} className="text-gray-600 hover:text-gray-900">{s.is_active ? 'Disable' : 'Enable'}</button>
                                                    <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-600">Remove</button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={() => setShowModal(false)}>
                    <form className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
                        <h3 className="text-xl font-extrabold text-primary mb-6">{editUser ? 'Edit Team Member' : 'Add Team Member'}</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="label">Email Address</label>
                                <input type="email" className="input-field" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} disabled={!!editUser} required />
                            </div>
                            <div>
                                <label className="label">{editUser ? 'New Password (leave blank to keep)' : 'Password'}</label>
                                <input type="password" className="input-field" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required={!editUser} minLength={6} />
                            </div>
                            <div>
                                <label className="label">Access Role</label>
                                <select className="input-field capitalize" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                                    {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Saving...' : 'Save Member'}</button>
                            <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">Cancel</button>
                        </div>
                    </form>
                </div>
            )}
        </Layout>
    );
}
