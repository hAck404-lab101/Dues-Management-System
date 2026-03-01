'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface ClearanceData {
    student: any;
    dues: any[];
    isFullyCleared: boolean;
    totalOwed: number;
    totalPaid: number;
    totalBalance: number;
}

export default function ClearancePage() {
    const router = useRouter();
    const { user, loading } = useAuth();

    const [students, setStudents] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [selected, setSelected] = useState<any>(null);
    const [clearance, setClearance] = useState<ClearanceData | null>(null);
    const [loadingClearance, setLoadingClearance] = useState(false);
    const [downloadingPDF, setDownloadingPDF] = useState(false);

    useEffect(() => {
        if (!loading && (!user || user.role === 'student')) router.push('/admin/login');
    }, [user, loading, router]);

    const searchStudents = useCallback(async () => {
        if (search.length < 2) return;
        setLoadingStudents(true);
        try {
            const res = await api.get('/students', { params: { search, limit: 10 } });
            if (res.data.success) setStudents(res.data.data);
        } catch {
            toast.error('Search failed');
        } finally {
            setLoadingStudents(false);
        }
    }, [search]);

    useEffect(() => {
        const t = setTimeout(() => { if (search.length >= 2) searchStudents(); else setStudents([]); }, 400);
        return () => clearTimeout(t);
    }, [search, searchStudents]);

    const selectStudent = async (s: any) => {
        setSelected(s);
        setStudents([]);
        setSearch(s.full_name);
        setLoadingClearance(true);
        setClearance(null);
        try {
            const res = await api.get(`/admin/students/${s.id}/clearance`);
            if (res.data.success) setClearance(res.data.data);
        } catch {
            toast.error('Failed to load clearance data');
        } finally {
            setLoadingClearance(false);
        }
    };

    const downloadPDF = async () => {
        if (!selected) return;
        setDownloadingPDF(true);
        try {
            const res = await api.get(`/admin/students/${selected.id}/clearance-pdf`, { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = `clearance-${selected.student_id}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('Failed to download PDF');
        } finally {
            setDownloadingPDF(false);
        }
    };

    return (
        <Layout title="Clearance Certificate">
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Search */}
                <div className="card p-6 space-y-4">
                    <h2 className="text-xl font-bold text-primary">🎓 Student Clearance Certificate</h2>
                    <p className="text-sm text-gray-500">Search for a student to view and download their clearance certificate.</p>
                    <div className="relative">
                        <input
                            type="text"
                            className="input-field pr-10"
                            placeholder="Search by name, index number, or email..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setSelected(null); setClearance(null); }}
                        />
                        {loadingStudents && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}
                        {students.length > 0 && (
                            <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-lg z-10 mt-1 max-h-56 overflow-y-auto">
                                {students.map(s => (
                                    <button key={s.id} onClick={() => selectStudent(s)} className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 transition-colors">
                                        <p className="font-medium text-sm">{s.full_name}</p>
                                        <p className="text-xs text-gray-500">{s.student_id} · {s.programme} · Level {s.level}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Loading */}
                {loadingClearance && (
                    <div className="card p-8 text-center">
                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-gray-500">Checking dues status...</p>
                    </div>
                )}

                {/* Clearance Result */}
                {clearance && !loadingClearance && (
                    <>
                        {/* Status Banner */}
                        <div className={`card p-6 text-center border-2 ${clearance.isFullyCleared ? 'border-green-500 bg-green-50' : 'border-red-400 bg-red-50'}`}>
                            <div className="text-5xl mb-3">{clearance.isFullyCleared ? '✅' : '❌'}</div>
                            <h3 className={`text-2xl font-extrabold ${clearance.isFullyCleared ? 'text-green-700' : 'text-red-700'}`}>
                                {clearance.isFullyCleared ? 'CLEARED' : 'NOT CLEARED'}
                            </h3>
                            <p className="text-sm mt-1 text-gray-600">
                                {clearance.isFullyCleared
                                    ? 'This student has settled all departmental dues.'
                                    : `Outstanding balance: GH₵${clearance.totalBalance.toFixed(2)}`}
                            </p>
                        </div>

                        {/* Student Info */}
                        <div className="card p-6">
                            <h3 className="font-bold text-primary mb-4">Student Details</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {[
                                    ['Index No', clearance.student.student_id],
                                    ['Full Name', clearance.student.full_name],
                                    ['Programme', clearance.student.programme],
                                    ['Level', `Level ${clearance.student.level}`],
                                    ['Academic Year', clearance.student.academic_year],
                                    ['Email', clearance.student.email],
                                ].map(([label, value]) => (
                                    <div key={label} className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-xs text-gray-400 uppercase font-medium mb-1">{label}</p>
                                        <p className="text-sm font-semibold text-gray-800">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Dues Summary */}
                        <div className="card overflow-hidden">
                            <div className="p-4 border-b flex justify-between items-center">
                                <h3 className="font-bold text-primary">Dues Breakdown</h3>
                                <div className="flex gap-3 text-sm">
                                    <span className="text-gray-500">Total Owed: <strong>GH₵{clearance.totalOwed.toFixed(2)}</strong></span>
                                    <span className="text-green-600">Paid: <strong>GH₵{clearance.totalPaid.toFixed(2)}</strong></span>
                                </div>
                            </div>
                            {clearance.dues.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">No dues assigned to this student.</p>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 text-left">
                                            <th className="py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Due</th>
                                            <th className="py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Amount</th>
                                            <th className="py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Paid</th>
                                            <th className="py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Balance</th>
                                            <th className="py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {clearance.dues.map((d: any, i: number) => (
                                            <tr key={i} className="border-t">
                                                <td className="py-3 px-4 font-medium">{d.due_name}</td>
                                                <td className="py-3 px-4">GH₵{d.assigned_amount.toFixed(2)}</td>
                                                <td className="py-3 px-4 text-green-600">GH₵{d.total_paid.toFixed(2)}</td>
                                                <td className="py-3 px-4 text-red-600">GH₵{d.balance.toFixed(2)}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.cleared ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                                                        {d.cleared ? '✓ Cleared' : '✗ Outstanding'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Download Button */}
                        <div className="flex gap-3">
                            <button onClick={downloadPDF} disabled={downloadingPDF} className="btn-primary flex-1">
                                {downloadingPDF ? 'Generating PDF...' : '⬇️ Download Clearance Certificate (PDF)'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
}
