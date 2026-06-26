'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { 
    ChartIcon, EnvelopeIcon, SendIcon, ExclamationIcon, CheckCircleIcon, 
    UsersIcon, PlusIcon, TrashIcon, BellIcon, SmsIcon
} from '@/components/Icons';

interface Announcement {
    id: string;
    title: string;
    body: string;
    audience: string;
    is_published: boolean;
    published_at: string | null;
    created_at: string;
    creator_email: string;
}

export default function CommunicationsPage() {
    const router = useRouter();
    const { user, loading } = useAuth();

    const [activeTab, setActiveTab] = useState<'sms' | 'announcements'>('sms');

    // SMS States
    const [availableYears, setAvailableYears] = useState<string[]>([]);
    const [availableProgs, setAvailableProgs] = useState<string[]>([]);
    const [smsForm, setSmsForm] = useState({
        message: '',
        level: '',
        programme: '',
        academicYear: '',
    });
    const [recipientCount, setRecipientCount] = useState<number | null>(null);
    const [previewing, setPreviewing] = useState(false);
    const [sending, setSending] = useState(false);
    const [smsResult, setSmsResult] = useState<any>(null);

    // Announcement States
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [annForm, setAnnForm] = useState({ title: '', body: '', audience: 'all_staff', is_published: false });
    const [showAnnModal, setShowAnnModal] = useState(false);
    const [submittingAnn, setSubmittingAnn] = useState(false);

    useEffect(() => {
        if (!loading && (!user || user.role === 'student')) router.push('/admin/login');
    }, [user, loading, router]);

    // Fetch public settings for dropdowns
    useEffect(() => {
        api.get('/settings/public').then(res => {
            if (res.data.success) {
                const s = res.data.data;
                if (s.available_academic_years) setAvailableYears(s.available_academic_years.split(',').map((y: string) => y.trim()).filter(Boolean));
                if (s.available_programmes) setAvailableProgs(s.available_programmes.split(',').map((p: string) => p.trim()).filter(Boolean));
            }
        });
    }, []);

    // Fetch announcements when announcements tab is opened
    const fetchAnnouncements = useCallback(async () => {
        try {
            const res = await api.get('/admin/announcements');
            if (res.data.success) setAnnouncements(res.data.data);
        } catch {
            toast.error('Failed to load announcements');
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'announcements' && user && user.role !== 'student') {
            fetchAnnouncements();
        }
    }, [activeTab, user, fetchAnnouncements]);

    // SMS Handlers
    const previewRecipients = async () => {
        setPreviewing(true);
        try {
            const params: any = {};
            if (smsForm.level) params.level = smsForm.level;
            if (smsForm.programme) params.programme = smsForm.programme;
            if (smsForm.academicYear) params.academicYear = smsForm.academicYear;
            const res = await api.get('/admin/bulk-sms/preview', { params });
            setRecipientCount(res.data.data.count);
        } catch {
            toast.error('Failed to preview recipients');
        } finally {
            setPreviewing(false);
        }
    };

    const handleSendSMS = async () => {
        if (!smsForm.message.trim()) { toast.error('Message is required'); return; }
        if (recipientCount === null) { toast.error('Preview recipients first'); return; }
        if (recipientCount === 0) { toast.error('No recipients match the filter'); return; }
        if (!confirm(`Send SMS to ${recipientCount} students?`)) return;

        setSending(true);
        setSmsResult(null);
        try {
            const res = await api.post('/admin/bulk-sms', {
                message: smsForm.message,
                level: smsForm.level || undefined,
                programme: smsForm.programme || undefined,
                academicYear: smsForm.academicYear || undefined,
            });
            setSmsResult(res.data.data);
            toast.success(res.data.message);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to send bulk SMS');
        } finally {
            setSending(false);
        }
    };

    // Announcement Handlers
    const handleCreateAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingAnn(true);
        try {
            const res = await api.post('/admin/announcements', annForm);
            if (res.data.success) {
                toast.success('Announcement broadcast created');
                setShowAnnModal(false);
                setAnnForm({ title: '', body: '', audience: 'all_staff', is_published: false });
                fetchAnnouncements();
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to create announcement');
        } finally {
            setSubmittingAnn(false);
        }
    };

    const handleToggleAnnouncementPublish = async (ann: Announcement) => {
        try {
            const res = await api.patch(`/admin/announcements/${ann.id}`, {
                is_published: !ann.is_published
            });
            if (res.data.success) {
                toast.success(ann.is_published ? 'Announcement un-published' : 'Announcement published');
                fetchAnnouncements();
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update publication status');
        }
    };

    const handleDeleteAnnouncement = async (id: string) => {
        if (!window.confirm('Delete this announcement permanently?')) return;
        try {
            const res = await api.delete(`/admin/announcements/${id}`);
            if (res.data.success) {
                toast.success('Announcement deleted');
                fetchAnnouncements();
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete announcement');
        }
    };

    const charCount = smsForm.message.length;
    const smsPages = Math.ceil(charCount / 160) || 1;

    return (
        <AdminLayout title="Communications">
            <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Tab Navigation */}
                <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl w-fit">
                    <button 
                        onClick={() => setActiveTab('sms')} 
                        className={`px-6 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'sms' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <span className="w-4 h-4"><SmsIcon /></span>
                        <span>Bulk SMS</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('announcements')} 
                        className={`px-6 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'announcements' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <span className="w-4 h-4"><BellIcon /></span>
                        <span>Announcements</span>
                    </button>
                </div>

                {activeTab === 'sms' ? (
                    <div className="space-y-6">
                        <div className="card p-6">
                            <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                                </svg>
                                Send Bulk SMS
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">Send an announcement or reminder to a group of students. Use <code className="bg-gray-100 px-1 rounded">{'{name}'}</code> and <code className="bg-gray-100 px-1 rounded">{'{id_no}'}</code> for personalization.</p>
                        </div>

                        <div className="card p-6 space-y-4">
                            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                                <span className="w-5 h-5 text-primary"><UsersIcon /></span>
                                <span>Target Recipients</span>
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="label">Level (optional)</label>
                                    <select className="input-field" value={smsForm.level} onChange={e => { setSmsForm(f => ({ ...f, level: e.target.value })); setRecipientCount(null); }}>
                                        <option value="">All Levels</option>
                                        {['100', '200', '300', '400'].map(l => <option key={l} value={l}>Level {l}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Programme (optional)</label>
                                    <select className="input-field" value={smsForm.programme} onChange={e => { setSmsForm(f => ({ ...f, programme: e.target.value })); setRecipientCount(null); }}>
                                        <option value="">All Programmes</option>
                                        {availableProgs.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Academic Year (optional)</label>
                                    <select className="input-field" value={smsForm.academicYear} onChange={e => { setSmsForm(f => ({ ...f, academicYear: e.target.value })); setRecipientCount(null); }}>
                                        <option value="">All Years</option>
                                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                            </div>
                            <button onClick={previewRecipients} disabled={previewing} className="btn-outline text-sm flex items-center gap-2">
                                {previewing ? 'Checking...' : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        Preview Recipients
                                    </>
                                )}
                            </button>
                            {recipientCount !== null && (
                                <div className={`p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${recipientCount > 0 ? 'bg-blue-50 text-blue-800' : 'bg-yellow-50 text-yellow-800'}`}>
                                    {recipientCount > 0 ? (
                                        <>
                                            <span className="w-4 h-4"><CheckCircleIcon /></span>
                                            <span>{recipientCount} students with phone numbers will receive this SMS</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="w-4 h-4 text-yellow-600"><ExclamationIcon /></span>
                                            <span>No students with phone numbers match this filter</span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="card p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                                    <span className="w-5 h-5"><EnvelopeIcon /></span>
                                    <span>Message</span>
                                </h3>
                                <span className="text-xs text-gray-400">{charCount} chars · {smsPages} SMS page{smsPages > 1 ? 's' : ''}</span>
                            </div>
                            <textarea
                                className="input-field h-32 resize-none font-sans"
                                placeholder="Dear {name}, your dues payment is due. Please pay your balance before the deadline."
                                value={smsForm.message}
                                onChange={e => setSmsForm(f => ({ ...f, message: e.target.value }))}
                            />
                            <div className="flex gap-2 flex-wrap text-xs">
                                {['{name}', '{id_no}'].map(tag => (
                                    <button key={tag} onClick={() => setSmsForm(f => ({ ...f, message: f.message + tag }))} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded font-mono transition-colors">
                                        + {tag}
                                    </button>
                                ))}
                            </div>
                            <button onClick={handleSendSMS} disabled={sending || !smsForm.message.trim()} className="btn-primary w-full flex items-center justify-center gap-2">
                                <span className="w-5 h-5"><SendIcon /></span>
                                <span>{sending ? 'Sending...' : `Send to ${recipientCount ?? '?'} Students`}</span>
                            </button>
                        </div>

                        {smsResult && (
                            <div className="card p-6 border-l-4 border-blue-500 bg-blue-50">
                                <h3 className="font-bold mb-3 flex items-center gap-2">
                                    <span className="w-5 h-5"><ChartIcon /></span>
                                    <span>Send Results</span>
                                </h3>
                                <div className="flex gap-8">
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-blue-600">{smsResult.sent}</p>
                                        <p className="text-sm text-gray-600">Delivered</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-red-500">{smsResult.failed}</p>
                                        <p className="text-sm text-gray-600">Failed</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-gray-700">{smsResult.total}</p>
                                        <p className="text-sm text-gray-600">Total</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="card p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50">
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm">System Announcements Broadcaster</h3>
                                <p className="text-xs text-gray-500 mt-1">Compose broadcast announcements and target specific user levels.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setAnnForm({ title: '', body: '', audience: 'all_staff', is_published: false });
                                    setShowAnnModal(true);
                                }}
                                className="btn-primary text-xs py-2.5 px-4 font-bold flex items-center gap-1.5"
                            >
                                <PlusIcon className="w-4 h-4" /> Compose Broadcast
                            </button>
                        </div>

                        <div className="space-y-4">
                            {announcements.map(ann => (
                                <div key={ann.id} className="border border-gray-100 hover:border-primary/20 transition-colors p-5 rounded-2xl bg-white shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                        <div className="flex flex-wrap gap-2 items-center">
                                            <h4 className="font-black text-gray-900 text-sm leading-tight">{ann.title}</h4>
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[9px] font-bold uppercase tracking-wide">
                                                Audience: {ann.audience.replace('_', ' ')}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${ann.is_published ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                                                {ann.is_published ? 'Published' : 'Draft'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-600 mt-2 max-w-xl leading-relaxed">{ann.body}</p>
                                        <div className="text-[10px] text-gray-400 font-semibold mt-3 flex items-center gap-3">
                                            <span>By: {ann.creator_email}</span>
                                            <span>&bull;</span>
                                            <span>Created: {new Date(ann.created_at).toLocaleString('en-GH')}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleToggleAnnouncementPublish(ann)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${ann.is_published ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'} transition-colors`}
                                        >
                                            {ann.is_published ? 'Un-publish' : 'Publish'}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteAnnouncement(ann.id)}
                                            className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {announcements.length === 0 && (
                                <p className="text-center py-12 text-gray-400 font-bold text-xs italic">No announcements broadcasted yet.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal for Announcement Broadcaster */}
            {showAnnModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-sm font-black text-primary uppercase">Compose Announcement Broadcast</h3>
                            <button onClick={() => setShowAnnModal(false)} className="text-gray-400 hover:text-gray-600 font-black text-xl">&times;</button>
                        </div>
                        <form onSubmit={handleCreateAnnouncement} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Announcement Title</label>
                                <input
                                    type="text"
                                    required
                                    className="input-field"
                                    value={annForm.title}
                                    onChange={e => setAnnForm(prev => ({ ...prev, title: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Message Body</label>
                                <textarea
                                    required
                                    rows={4}
                                    className="input-field p-3 text-xs leading-relaxed"
                                    value={annForm.body}
                                    onChange={e => setAnnForm(prev => ({ ...prev, body: e.target.value }))}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Target Audience</label>
                                    <select
                                        className="input-field text-xs py-2 font-bold"
                                        value={annForm.audience}
                                        onChange={e => setAnnForm(prev => ({ ...prev, audience: e.target.value }))}
                                    >
                                        <option value="all_staff">All Staff Members</option>
                                        <option value="level_100">Level 100 Roster Only</option>
                                        <option value="level_200">Level 200 Roster Only</option>
                                        <option value="level_300">Level 300 Roster Only</option>
                                        <option value="level_400">Level 400 Roster Only</option>
                                    </select>
                                </div>
                                <div className="flex flex-col justify-end pb-1.5">
                                    <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={annForm.is_published}
                                            onChange={e => setAnnForm(prev => ({ ...prev, is_published: e.target.checked }))}
                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                        <span>Publish Immediately</span>
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowAnnModal(false)} className="btn-secondary text-xs px-5 py-2">Cancel</button>
                                <button type="submit" disabled={submittingAnn} className="btn-primary text-xs px-5 py-2">
                                    {submittingAnn ? 'Sending...' : 'Broadcast'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
