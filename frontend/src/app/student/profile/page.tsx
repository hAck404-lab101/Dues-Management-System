'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function StudentProfilePage() {
    const router = useRouter();
    const { user, loading } = useAuth();

    const [profile, setProfile] = useState<any>(null);
    const [loadingData, setLoadingData] = useState(true);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ fullName: '', phoneNumber: '' });
    const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [submitting, setSubmitting] = useState(false);
    const [pwSubmitting, setPwSubmitting] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.push('/login');
        if (!loading && user && user.role !== 'student') router.push('/admin/dashboard');
    }, [user, loading, router]);

    useEffect(() => {
        if (user && user.role === 'student') {
            api.get('/students/me')
                .then(r => {
                    if (r.data.success) {
                        setProfile(r.data.data);
                        setForm({ fullName: r.data.data.full_name, phoneNumber: r.data.data.phone_number || '' });
                    }
                })
                .catch(() => toast.error('Failed to load profile'))
                .finally(() => setLoadingData(false));
        }
    }, [user]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;
        setSubmitting(true);
        try {
            await api.patch('/students/me', { fullName: form.fullName, phoneNumber: form.phoneNumber });
            toast.success('Profile updated successfully');
            setProfile((p: any) => ({ ...p, full_name: form.fullName, phone_number: form.phoneNumber }));
            setEditing(false);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setSubmitting(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pwForm.newPassword !== pwForm.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }
        if (pwForm.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        setPwSubmitting(true);
        try {
            await api.post('/auth/change-password', {
                currentPassword: pwForm.currentPassword,
                newPassword: pwForm.newPassword,
            });
            toast.success('Password changed successfully!');
            setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to change password');
        } finally {
            setPwSubmitting(false);
        }
    };

    if (loading || loadingData) {
        return (
            <Layout title="My Profile">
                <div className="max-w-2xl mx-auto space-y-4">
                    {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}
                </div>
            </Layout>
        );
    }

    if (!profile) {
        return (
            <Layout title="My Profile">
                <p className="text-center text-gray-500 py-12">Profile not found.</p>
            </Layout>
        );
    }

    return (
        <Layout title="My Profile">
            <div className="max-w-2xl mx-auto space-y-6">

                {/* Avatar Card */}
                <div className="card flex items-center gap-5">
                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold shrink-0">
                        {profile.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-primary">{profile.full_name}</h2>
                        <p className="text-gray-500 text-sm">{profile.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {profile.is_active ? 'Active Student' : 'Inactive'}
                        </span>
                    </div>
                </div>

                {/* Details Card */}
                <div className="card">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-primary">Student Details</h3>
                        {!editing && (
                            <button onClick={() => setEditing(true)} className="btn-outline px-4 py-1.5 text-sm">Edit Profile</button>
                        )}
                    </div>

                    {editing ? (
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="label">Full Name *</label>
                                <input type="text" className="input-field" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} required />
                            </div>
                            <div>
                                <label className="label">Phone Number</label>
                                <input type="tel" className="input-field" placeholder="e.g. 0244123456" value={form.phoneNumber} onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))} />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Saving…' : 'Save Changes'}</button>
                                <button type="button" onClick={() => setEditing(false)} className="btn-outline flex-1">Cancel</button>
                            </div>
                        </form>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <ProfileField label="Index Number" value={profile.student_id} />
                            <ProfileField label="Full Name" value={profile.full_name} />
                            <ProfileField label="Email" value={profile.email} />
                            <ProfileField label="Phone" value={profile.phone_number || '—'} />
                            <ProfileField label="Level" value={`Level ${profile.level}`} />
                            <ProfileField label="Programme" value={profile.programme} />
                            <ProfileField label="Academic Year" value={profile.academic_year} />
                            <ProfileField label="Joined" value={new Date(profile.created_at).toLocaleDateString('en-GH', { year: 'numeric', month: 'long', day: 'numeric' })} />
                        </div>
                    )}
                </div>

                {/* Change Password Card */}
                <div className="card">
                    <h3 className="text-lg font-bold text-primary mb-5">🔐 Change Password</h3>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label className="label">Current Password *</label>
                            <input type="password" required className="input-field" placeholder="Enter current password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} />
                        </div>
                        <div>
                            <label className="label">New Password *</label>
                            <input type="password" required className="input-field" placeholder="Min. 6 characters" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} />
                        </div>
                        <div>
                            <label className="label">Confirm New Password *</label>
                            <input type="password" required className="input-field" placeholder="Repeat new password" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} />
                        </div>
                        <button type="submit" disabled={pwSubmitting} className="btn-primary">
                            {pwSubmitting ? 'Changing...' : 'Change Password'}
                        </button>
                    </form>
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { href: '/student/dashboard', emoji: '🏠', label: 'Dashboard' },
                        { href: '/student/payments', emoji: '💳', label: 'My Payments' },
                        { href: '/student/receipts', emoji: '🧾', label: 'My Receipts' },
                    ].map(link => (
                        <a key={link.href} href={link.href} className="card text-center hover:border-primary hover:shadow-md transition-all cursor-pointer group border border-transparent">
                            <div className="text-3xl mb-2">{link.emoji}</div>
                            <p className="text-sm font-medium text-gray-700 group-hover:text-primary">{link.label}</p>
                        </a>
                    ))}
                </div>
            </div>
        </Layout>
    );
}

function ProfileField({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-sm font-semibold text-gray-800">{value}</p>
        </div>
    );
}
