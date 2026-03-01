'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const LEVELS = ['100', '200', '300', '400'];
const CSV_TEMPLATE = `indexNumber,fullName,email,level,programme,academicYear,phoneNumber
UCC/CS/21/001,John Doe,john.doe@ucc.edu.gh,100,Computer Science,2024/2025,0244123456
UCC/CS/21/002,Jane Smith,jane.smith@ucc.edu.gh,200,Information Technology,2024/2025,0551234567`;

interface ParsedStudent {
    indexNumber: string;
    fullName: string;
    email: string;
    level: string;
    programme: string;
    academicYear: string;
    phoneNumber: string;
}

export default function BulkImportPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const fileRef = useRef<HTMLInputElement>(null);

    const [parsed, setParsed] = useState<ParsedStudent[]>([]);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [tab, setTab] = useState<'csv' | 'manual'>('csv');
    const [manualInput, setManualInput] = useState('');
    const [availableProgrammes, setAvailableProgrammes] = useState<string[]>([]);
    const [availableAcademicYears, setAvailableAcademicYears] = useState<string[]>([]);

    useEffect(() => {
        if (!loading && (!user || user.role === 'student')) router.push('/admin/login');
        if (user && user.role !== 'student') fetchSettings();
    }, [user, loading, router]);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/settings/public');
            if (res.data.success) {
                setAvailableProgrammes(res.data.data.available_programmes?.split(',').map((p: string) => p.trim()).filter(Boolean) || []);
                setAvailableAcademicYears(res.data.data.available_academic_years?.split(',').map((y: string) => y.trim()).filter(Boolean) || []);
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    };

    const parseCSV = (text: string): ParsedStudent[] => {
        const lines = text.trim().split('\n').filter(l => l.trim());
        if (lines.length < 2) return [];
        const headers = lines[0].split(',').map(h => h.trim());
        return lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            const obj: any = {};
            headers.forEach((h, i) => { obj[h] = values[i] || ''; });
            return obj as ParsedStudent;
        }).filter(s => s.indexNumber && s.fullName && s.email);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            const students = parseCSV(text);
            setParsed(students);
            setResult(null);
            if (students.length === 0) toast.error('No valid rows found in CSV');
            else toast.success(`${students.length} students parsed from CSV`);
        };
        reader.readAsText(file);
    };

    const handleManualParse = () => {
        const students = parseCSV(manualInput);
        setParsed(students);
        setResult(null);
        if (students.length === 0) toast.error('No valid rows found');
        else toast.success(`${students.length} students ready to import`);
    };

    const handleImport = async () => {
        if (parsed.length === 0) return;
        setImporting(true);
        setResult(null);
        try {
            const res = await api.post('/admin/bulk-import-students', { students: parsed });
            setResult(res.data.data);
            toast.success(res.data.message);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Import failed');
        } finally {
            setImporting(false);
        }
    };

    const downloadTemplate = () => {
        const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'student-import-template.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Layout title="Bulk Import Students">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header */}
                <div className="card p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-primary">📥 Bulk Student Import</h2>
                        <p className="text-gray-500 text-sm mt-1">Import multiple students at once using a CSV file. Default password will be the student's index number.</p>
                    </div>
                    <button onClick={downloadTemplate} className="btn-outline text-sm shrink-0">
                        ⬇️ Download Template
                    </button>
                </div>

                {/* Valid Options Help */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                        <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">Valid Programmes</h3>
                        <div className="flex flex-wrap gap-1">
                            {availableProgrammes.map(p => (
                                <span key={p} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-md">{p}</span>
                            ))}
                            {availableProgrammes.length === 0 && <span className="text-blue-400 text-[10px] italic">None defined in settings</span>}
                        </div>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                        <h3 className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-2">Valid Academic Years</h3>
                        <div className="flex flex-wrap gap-1">
                            {availableAcademicYears.map(y => (
                                <span key={y} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-md">{y}</span>
                            ))}
                            {availableAcademicYears.length === 0 && <span className="text-indigo-400 text-[10px] italic">None defined in settings</span>}
                        </div>
                    </div>
                </div>

                {/* Tab Selector */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                    {(['csv', 'manual'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)} className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            {t === 'csv' ? '📁 Upload CSV' : '✏️ Paste Data'}
                        </button>
                    ))}
                </div>

                {tab === 'csv' ? (
                    <div className="card p-6">
                        <label className="block border-2 border-dashed border-gray-200 hover:border-primary rounded-xl p-10 text-center cursor-pointer transition-colors" onClick={() => fileRef.current?.click()}>
                            <div className="text-5xl mb-3">📂</div>
                            <p className="text-gray-600 font-medium">Click to select a CSV file</p>
                            <p className="text-gray-400 text-sm mt-1">or drag and drop here</p>
                            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                        </label>
                    </div>
                ) : (
                    <div className="card p-6 space-y-3">
                        <p className="text-sm text-gray-500">Paste CSV data below (include the header row)</p>
                        <textarea
                            className="input-field font-mono text-xs h-40 resize-none"
                            placeholder={CSV_TEMPLATE}
                            value={manualInput}
                            onChange={e => setManualInput(e.target.value)}
                        />
                        <button onClick={handleManualParse} className="btn-outline">Parse Data</button>
                    </div>
                )}

                {/* Preview Table */}
                {parsed.length > 0 && (
                    <div className="card overflow-x-auto">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="font-semibold text-primary">Preview — {parsed.length} students ready</h3>
                            <button onClick={handleImport} disabled={importing} className="btn-primary">
                                {importing ? 'Importing...' : `Import ${parsed.length} Students`}
                            </button>
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 text-left">
                                    {['Index No', 'Name', 'Email', 'Level', 'Programme', 'Year', 'Phone'].map(h => (
                                        <th key={h} className="py-2 px-3 font-semibold text-gray-600 text-xs uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {parsed.slice(0, 50).map((s, i) => {
                                    const isInvalidProg = availableProgrammes.length > 0 && !availableProgrammes.map(p => p.toLowerCase()).includes((s.programme || '').trim().toLowerCase());
                                    const isInvalidYear = availableAcademicYears.length > 0 && !availableAcademicYears.map(y => y.toLowerCase()).includes((s.academicYear || '').trim().toLowerCase());

                                    return (
                                        <tr key={i} className={`border-t hover:bg-gray-50 ${(isInvalidProg || isInvalidYear) ? 'bg-red-50/50' : ''}`}>
                                            <td className="py-2 px-3 font-mono text-xs">{s.indexNumber}</td>
                                            <td className="py-2 px-3">{s.fullName}</td>
                                            <td className="py-2 px-3 text-gray-500 text-xs">{s.email}</td>
                                            <td className="py-2 px-3">{s.level}</td>
                                            <td className="py-2 px-3 max-w-[130px] truncate relative group">
                                                <span className={isInvalidProg ? 'text-red-600 font-bold underline decoration-dotted' : ''}>
                                                    {s.programme}
                                                </span>
                                                {isInvalidProg && (
                                                    <span className="hidden group-hover:block absolute z-20 left-0 -top-8 bg-red-600 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                                        Not in system settings!
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2 px-3 text-xs">
                                                <span className={isInvalidYear ? 'text-red-600 font-bold underline decoration-dotted' : ''}>
                                                    {s.academicYear}
                                                </span>
                                            </td>
                                            <td className="py-2 px-3 text-xs">{s.phoneNumber || '—'}</td>
                                        </tr>
                                    );
                                })}
                                {parsed.length > 50 && (
                                    <tr><td colSpan={7} className="py-2 px-3 text-gray-400 text-xs text-center">...and {parsed.length - 50} more</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Result */}
                {result && (
                    <div className={`card p-6 border-l-4 ${result.errors?.length > 0 ? 'border-yellow-400 bg-yellow-50' : 'border-green-500 bg-green-50'}`}>
                        <h3 className="font-bold mb-3">Import Results</h3>
                        <div className="flex gap-6 mb-4">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-green-600">{result.created}</p>
                                <p className="text-sm text-gray-600">Created</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-yellow-600">{result.skipped}</p>
                                <p className="text-sm text-gray-600">Skipped</p>
                            </div>
                        </div>
                        {result.errors?.length > 0 && (
                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">Skipped reasons:</p>
                                <ul className="space-y-1">
                                    {result.errors.map((e: string, i: number) => (
                                        <li key={i} className="text-xs text-yellow-800 bg-yellow-100 px-3 py-1 rounded">⚠️ {e}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
}
