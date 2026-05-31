'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ChartIcon, EnvelopeIcon, SendIcon, ExclamationIcon, CheckCircleIcon, UsersIcon } from '@/components/Icons';

export default function BulkSMSPage() {
    const router = useRouter();
    const { user, loading } = useAuth();

    const [availableYears, setAvailableYears] = useState<string[]>([]);
    const [availableProgs, setAvailableProgs] = useState<string[]>([]);
    const [form, setForm] = useState({
        message: '',
        level: '',
        programme: '',
        academicYear: '',
    });
    const [recipientCount, setRecipientCount] = useState<number | null>(null);
    const [previewing, setPreviewing] = useState(false);
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<any>(null);

    useEffect(() => {
        if (!loading && (!user || user.role === 'student')) router.push('/admin/login');
    }, [user, loading, router]);

    useEffect(() => {
        api.get('/settings/public').then(res => {
            if (res.data.success) {
                const s = res.data.data;
                if (s.available_academic_years) setAvailableYears(s.available_academic_years.split(',').map((y: string) => y.trim()).filter(Boolean));
                if (s.available_programmes) setAvailableProgs(s.available_programmes.split(',').map((p: string) => p.trim()).filter(Boolean));
            }
        });
    }, []);

    const previewRecipients = async () => {
        setPreviewing(true);
        try {
            const params: any = {};
            if (form.level) params.level = form.level;
            if (form.programme) params.programme = form.programme;
            if (form.academicYear) params.academicYear = form.academicYear;
            const res = await api.get('/admin/bulk-sms/preview', { params });
            setRecipientCount(res.data.data.count);
        } catch {
            toast.error('Failed to preview recipients');
        } finally {
            setPreviewing(false);
        }
    };

    const handleSend = async () => {
        if (!form.message.trim()) { toast.error('Message is required'); return; }
        if (recipientCount === null) { toast.error('Preview recipients first'); return; }
        if (recipientCount === 0) { toast.error('No recipients match the filter'); return; }
        if (!confirm(`Send SMS to ${recipientCount} students?`)) return;

        setSending(true);
        setResult(null);
        try {
            const res = await api.post('/admin/bulk-sms', {
                message: form.message,
                level: form.level || undefined,
                programme: form.programme || undefined,
                academicYear: form.academicYear || undefined,
            });
            setResult(res.data.data);
            toast.success(res.data.message);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to send bulk SMS');
        } finally {
            setSending(false);
        }
    };

    const charCount = form.message.length;
    const smsPages = Math.ceil(charCount / 160) || 1;

    return (
        <Layout title="Bulk SMS">
            <div className="max-w-3xl mx-auto space-y-6">
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
                            <select className="input-field" value={form.level} onChange={e => { setForm(f => ({ ...f, level: e.target.value })); setRecipientCount(null); }}>
                                <option value="">All Levels</option>
                                {['100', '200', '300', '400'].map(l => <option key={l} value={l}>Level {l}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Programme (optional)</label>
                            <select className="input-field" value={form.programme} onChange={e => { setForm(f => ({ ...f, programme: e.target.value })); setRecipientCount(null); }}>
                                <option value="">All Programmes</option>
                                {availableProgs.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Academic Year (optional)</label>
                            <select className="input-field" value={form.academicYear} onChange={e => { setForm(f => ({ ...f, academicYear: e.target.value })); setRecipientCount(null); }}>
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
                        value={form.message}
                        onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    />
                    <div className="flex gap-2 flex-wrap text-xs">
                        {['{name}', '{id_no}'].map(tag => (
                            <button key={tag} onClick={() => setForm(f => ({ ...f, message: f.message + tag }))} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded font-mono transition-colors">
                                + {tag}
                            </button>
                        ))}
                    </div>
                    <button onClick={handleSend} disabled={sending || !form.message.trim()} className="btn-primary w-full flex items-center justify-center gap-2">
                        <span className="w-5 h-5"><SendIcon /></span>
                        <span>{sending ? 'Sending...' : `Send to ${recipientCount ?? '?'} Students`}</span>
                    </button>
                </div>

                {result && (
                    <div className="card p-6 border-l-4 border-green-500 bg-green-50">
                        <h3 className="font-bold mb-3 flex items-center gap-2">
                            <span className="w-5 h-5"><ChartIcon /></span>
                            <span>Send Results</span>
                        </h3>
                        <div className="flex gap-8">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-green-600">{result.sent}</p>
                                <p className="text-sm text-gray-600">Delivered</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-red-500">{result.failed}</p>
                                <p className="text-sm text-gray-600">Failed</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-gray-700">{result.total}</p>
                                <p className="text-sm text-gray-600">Total</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
