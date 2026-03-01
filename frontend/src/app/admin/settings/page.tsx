'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Setting {
    value: string;
    category: string;
    description: string;
    updated_at?: string;
}

interface SettingsMap {
    [key: string]: Setting;
}

const SETTING_GROUPS = [
    {
        id: 'system',
        name: 'System Settings',
        icon: '⚙️',
        subcategories: [
            { id: 'sys_general', name: 'General', icon: '🌍' },
            { id: 'sys_appearance', name: 'Appearance', icon: '🎨' },
            { id: 'sys_maintenance', name: 'Maintenance', icon: '🧨' }
        ]
    },
    {
        id: 'portal',
        name: 'Student Portal',
        icon: '🎓',
        subcategories: [
            { id: 'portal', name: 'Portal Management', icon: '📑' }
        ]
    },
    {
        id: 'payments',
        name: 'Payment Settings',
        icon: '💰',
        subcategories: [
            { id: 'pay_paystack', name: 'Paystack Gateway', icon: '💳' },
            { id: 'pay_manual', name: 'Manual Payments', icon: '🏦' },
            { id: 'pay_charges', name: 'Service Charges', icon: '📈' }
        ]
    },
    {
        id: 'communication',
        name: 'Communication',
        icon: '✉️',
        subcategories: [
            { id: 'comm_sms', name: 'Bulk SMS', icon: '📱' },
            { id: 'comm_email', name: 'Email Settings', icon: '📧' }
        ]
    },
    {
        id: 'security',
        name: 'Security & Access',
        icon: '🛡️',
        subcategories: [
            { id: 'security', name: 'Security Policy', icon: '🔐' }
        ]
    }
];

export default function AdminSettingsPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const { refreshBranding } = useBranding();

    const [settings, setSettings] = useState<SettingsMap>({});
    const [loadingData, setLoadingData] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('sys_general');

    const allowedRoles = ['admin', 'treasurer', 'financial_secretary', 'president'];

    // Fallback URL for brand assets
    const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003/api').replace('/api', '');

    useEffect(() => {
        if (!loading && (!user || !allowedRoles.includes(user.role))) {
            router.push('/admin/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user && allowedRoles.includes(user.role)) {
            fetchSettings();
        }
    }, [user]);

    const fetchSettings = async () => {
        setLoadingData(true);
        try {
            const res = await api.get('/settings');
            if (res.data.success) {
                setSettings(res.data.data);
            }
        } catch (error) {
            toast.error('Failed to load settings');
        } finally {
            setLoadingData(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const updateData: { [key: string]: string } = {};
        Object.keys(settings).forEach(key => {
            updateData[key] = settings[key].value;
        });

        try {
            const res = await api.patch('/settings', { settings: updateData });
            if (res.data.success) {
                toast.success('Settings updated successfully');
                await refreshBranding();
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update settings');
        } finally {
            setSubmitting(false);
        }
    };

    const handleChange = (key: string, value: string) => {
        setSettings(prev => ({
            ...prev,
            [key]: { ...prev[key], value }
        }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('logo', file);

        let type = 'primary';
        if (key === 'app_logo_secondary') type = 'secondary';
        if (key === 'app_favicon') type = 'favicon';
        formData.append('type', type);

        try {
            setSubmitting(true);
            const res = await api.post('/settings/upload-logo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.success) {
                handleChange(key, res.data.data.url);
                toast.success('Image uploaded successfully');
                await refreshBranding();
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Upload failed');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading || loadingData) {
        return (
            <Layout title="System Settings">
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </Layout>
        );
    }

    const renderSettingInput = (key: string) => {
        const val = settings[key].value;

        // Image Uploads
        if (key === 'app_logo' || key === 'app_logo_secondary' || key === 'app_favicon') {
            return (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-5 group">
                    <div className="w-12 h-12 bg-white border-2 border-dashed border-gray-200 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 group-hover:border-primary transition-colors">
                        {val ? (
                            <img src={val.startsWith('/') ? `${API_BASE}${val}` : val} className="w-full h-full object-contain p-1" alt="Preview" />
                        ) : (
                            <span className="text-xl opacity-20">🖼️</span>
                        )}
                    </div>
                    <div className="flex-1 space-y-2">
                        <input
                            type="text"
                            className="input-field py-1 text-xs"
                            value={val}
                            onChange={(e) => handleChange(key, e.target.value)}
                            placeholder="Image URL..."
                        />
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-bold text-secondary cursor-pointer hover:underline flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Upload New File
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, key)} />
                            </label>
                        </div>
                    </div>
                </div>
            );
        }

        // Toggles / Booleans
        if (key.endsWith('_enabled') || key.endsWith('_status') || key.endsWith('_required') || key === 'paystack_auto_verify') {
            const isToggle = key !== 'registration_status';
            const isOn = isToggle ? val === 'true' : val === 'open';

            return (
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => handleChange(key, isOn ? (isToggle ? 'false' : 'closed') : (isToggle ? 'true' : 'open'))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isOn ? 'bg-primary' : 'bg-gray-200'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isOn ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className={`text-xs font-bold ${isOn ? 'text-primary' : 'text-gray-400'}`}>
                        {isOn ? (isToggle ? 'ENABLED' : 'OPEN') : (isToggle ? 'DISABLED' : 'CLOSED')}
                    </span>
                </div>
            );
        }

        // Comma-separated lists (Acad years, Programmes, Courses, etc)
        if (key.includes('available_')) {
            return (
                <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 p-2 bg-white border rounded-lg min-h-[40px]">
                        {val.split(',').filter(Boolean).map((item: string, i: number) => (
                            <span key={i} className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 text-primary text-[10px] font-bold rounded-lg border">
                                {item.trim()}
                                <button type="button" onClick={() => {
                                    const items = val.split(',').filter(Boolean).map(x => x.trim()).filter((_, idx) => idx !== i);
                                    handleChange(key, items.join(','));
                                }} className="text-red-500 hover:text-red-700 font-black">&times;</button>
                            </span>
                        ))}
                    </div>
                    <input
                        type="text"
                        className="input-field py-1.5 text-xs"
                        placeholder="Type and press Enter to add..."
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                const value = e.currentTarget.value.trim();
                                if (value) {
                                    const current = val.split(',').filter(Boolean).map(x => x.trim());
                                    if (!current.includes(value)) {
                                        handleChange(key, [...current, value].join(','));
                                        e.currentTarget.value = '';
                                    }
                                }
                            }
                        }}
                    />
                </div>
            );
        }

        // Dropdowns
        if (key === 'app_theme' || key === 'service_charge_type' || key === 'service_charge_scope' || key === 'manual_payment_workflow') {
            const options = {
                app_theme: ['light', 'dark', 'system'],
                service_charge_type: ['fixed', 'percentage'],
                service_charge_scope: ['global', 'per_due'],
                manual_payment_workflow: ['standard', 'instant']
            }[key as keyof typeof options] || [];

            return (
                <select className="input-field py-2 text-xs font-bold" value={val} onChange={(e) => handleChange(key, e.target.value)}>
                    {options.map((opt: string) => (
                        <option key={opt} value={opt}>{opt.toUpperCase()}</option>
                    ))}
                </select>
            );
        }

        // Textareas
        if (key.includes('instructions') || key.includes('bank') || key.includes('template') || key === 'app_footer_text') {
            return (
                <textarea
                    className="input-field p-3 text-xs leading-relaxed"
                    rows={key.includes('template') ? 5 : 3}
                    value={val}
                    onChange={(e) => handleChange(key, e.target.value)}
                />
            );
        }

        // Default Input
        const isPassword = key.includes('pass') || key.includes('secret') || key.includes('api_key');
        return (
            <input
                type={isPassword ? 'password' : 'text'}
                className={`input-field px-4 py-2 text-sm ${isPassword ? 'font-mono' : ''}`}
                value={val}
                onChange={(e) => handleChange(key, e.target.value)}
            />
        );
    };

    const getGroupedContent = () => {
        if (activeTab === 'sys_maintenance') {
            return (
                <div className="space-y-6">
                    {/* Maintenance Toggles */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.keys(settings).filter(k => k === 'maintenance_mode').map(k => (
                            <div key={k} className="p-6 bg-gray-50 border rounded-lg">
                                <h4 className="font-bold text-primary text-sm mb-1 uppercase tracking-tight">Maintenance Mode</h4>
                                <p className="text-xs text-gray-500 mb-4">{settings[k].description}</p>
                                {renderSettingInput(k)}
                            </div>
                        ))}
                    </div>

                    {/* Reset Site Card */}
                    <div className="p-6 bg-red-50 border border-red-100 rounded-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                            <svg className="w-16 h-16 text-red-600" fill="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold text-red-900 mb-1">Danger Zone: Site Reset</h3>
                            <p className="text-xs text-red-700 leading-relaxed mb-6">
                                Wipe all transaction data, student profiles, and assignments.
                                <span className="font-bold underline block mt-1">THIS ACTION IS PERMANENT.</span>
                            </p>

                            <button
                                type="button"
                                onClick={async () => {
                                    const confirmReset = window.confirm("Are you sure you want to RESET THE ENTIRE SITE?");
                                    if (!confirmReset) return;
                                    const doubleConfirm = window.prompt("Type 'RESET EVERYTHING' to confirm:");
                                    if (doubleConfirm !== 'RESET EVERYTHING') return;

                                    try {
                                        setSubmitting(true);
                                        const res = await api.post('/settings/reset-site');
                                        if (res.data.success) {
                                            toast.success(res.data.message);
                                            setTimeout(() => window.location.reload(), 2000);
                                        }
                                    } catch (err: any) {
                                        toast.error(err.response?.data?.message || 'Reset failed');
                                    } finally {
                                        setSubmitting(false);
                                    }
                                }}
                                disabled={submitting}
                                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-sm transition-all"
                            >
                                Reset Entire Site Now
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        const filteredSettings = Object.keys(settings).filter(key => settings[key].category === activeTab);

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {filteredSettings.map(key => (
                        <div key={key} className={`flex flex-col ${(key.includes('instructions') || key.includes('bank') || key.includes('template')) ? 'md:col-span-2' : ''}`}>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-bold text-primary uppercase tracking-tight">
                                    {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                </label>
                                {key.includes('api_key') || key.includes('secret') || key.includes('_pass') ? (
                                    <span className="text-[10px] px-2 py-0.5 bg-yellow-100 text-yellow-700 font-bold rounded">SECURE</span>
                                ) : null}
                            </div>
                            <p className="text-xs text-gray-500 mb-3 leading-snug">{settings[key].description}</p>
                            {renderSettingInput(key)}
                        </div>
                    ))}
                </div>

                {filteredSettings.length > 0 && (
                    <div className="pt-6 border-t flex items-center justify-between mt-8">
                        <p className="text-xs text-gray-400 italic">Settings saved on this tab apply immediately.</p>
                        <button
                            onClick={handleUpdate}
                            disabled={submitting}
                            className="btn-primary"
                        >
                            {submitting ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <Layout title="System Administration">
            <div className="flex flex-col lg:flex-row gap-8">

                {/* Multi-Level Sidebar */}
                <div className="w-full lg:w-64 shrink-0 space-y-6">
                    {SETTING_GROUPS.map((group: any) => (
                        <div key={group.id} className="card p-4">
                            <h3 className="flex items-center gap-2 px-2 mb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                <span>{group.icon}</span> {group.name}
                            </h3>
                            <div className="space-y-1">
                                {group.subcategories.map((sub: any) => (
                                    <button
                                        key={sub.id}
                                        onClick={() => setActiveTab(sub.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === sub.id
                                                ? 'bg-primary text-white shadow-md'
                                                : 'text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        <span className="text-base">{sub.icon}</span>
                                        <span>{sub.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Dynamic Content Area */}
                <div className="flex-1">
                    <div className="card shadow-md">
                        <div className="mb-10 pb-6 border-b flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase mb-1">
                                    <span>ADMIN</span>
                                    <span>/</span>
                                    <span className="text-secondary">SETTINGS</span>
                                </div>
                                <h2 className="text-2xl font-extrabold text-primary uppercase">
                                    {activeTab.split('_').pop()?.replace('sys', 'system')} <span className="text-gray-300">Management</span>
                                </h2>
                            </div>
                            <div className="hidden sm:flex flex-col items-end">
                                <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary mb-1">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                </div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user?.role} Access</span>
                            </div>
                        </div>

                        <div className="min-h-[500px]">
                            {getGroupedContent()}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
