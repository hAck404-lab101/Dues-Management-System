'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
    SettingsIcon, GlobeIcon, PaletteIcon, WrenchIcon, AcademicCapIcon,
    DocumentTextIcon, CashIcon, CardIcon, LandmarkIcon, TrendingUpIcon,
    EnvelopeIcon, SmsIcon, ShieldIcon, LockClosedIcon, ImageIcon
} from '@/components/Icons';

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
        id: 'system', name: 'System Settings', icon: SettingsIcon,
        subcategories: [
            { id: 'sys_general', name: 'General', icon: GlobeIcon },
            { id: 'sys_appearance', name: 'Appearance', icon: PaletteIcon },
            { id: 'sys_maintenance', name: 'Maintenance', icon: WrenchIcon }
        ]
    },
    {
        id: 'portal', name: 'Student Portal', icon: AcademicCapIcon,
        subcategories: [{ id: 'portal', name: 'Portal Management', icon: DocumentTextIcon }]
    },
    {
        id: 'payments', name: 'Payment Settings', icon: CashIcon,
        subcategories: [
            { id: 'pay_paystack', name: 'Paystack Gateway', icon: CardIcon },
            { id: 'pay_manual', name: 'Manual Payments', icon: LandmarkIcon },
            { id: 'pay_charges', name: 'Service Charges', icon: TrendingUpIcon }
        ]
    },
    {
        id: 'communication', name: 'Communication', icon: EnvelopeIcon,
        subcategories: [
            { id: 'comm_sms', name: 'Bulk SMS', icon: SmsIcon },
            { id: 'comm_email', name: 'Email Settings', icon: EnvelopeIcon }
        ]
    },
    {
        id: 'security', name: 'Security & Access', icon: ShieldIcon,
        subcategories: [{ id: 'security', name: 'Security Policy', icon: LockClosedIcon }]
    }
];

const ALL_TABS = SETTING_GROUPS.flatMap((group: any) =>
    group.subcategories.map((sub: any) => ({ ...sub, groupName: group.name }))
);

const formatSettingLabel = (key: string) => {
    if (key === 'payment_service_fee') return 'Service Fee / Rate';
    if (key === 'service_charge_type') return 'Charge Type';
    if (key === 'service_charge_enabled') return 'Enable Service Charge';
    if (key === 'homepage_variant') return 'Homepage Style';
    if (key === 'maintenance_mode') return 'Maintenance Mode';
    if (key === 'admin_approval_required') return 'ADMIN APPROVAL REQUIRED';
    if (key === 'available_courses') return 'AVAILABLE COURSES';
    if (key === 'available_programmes') return 'AVAILABLE PROGRAMMES';
    if (key === 'student_registration_open') return 'SELF REGISTRATION ENABLED';
    if (key === 'available_academic_years') return 'AVAILABLE ACADEMIC YEARS';
    if (key === 'available_levels') return 'AVAILABLE LEVELS';
    if (key === 'registration_status') return 'REGISTRATION STATUS';
    return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const getDefaultValue = (key: string) => {
    switch (key) {
        case 'admin_approval_required': return 'false';
        case 'available_courses': return '';
        case 'available_programmes': return 'Dip. Graphic Design, Bsc. Graphic Design, Dip. Advertisement, Bsc. Advertisement, Dip. Multimedia, Bsc. Multimedia, Dip. Animation, Bsc. Animation';
        case 'student_registration_open': return 'true';
        case 'available_academic_years': return '2023/2024, 2024/2025, 2025/2026';
        case 'available_levels': return '100, 200, 300, 400';
        case 'registration_status': return 'open';
        default: return '';
    }
};

const getDefaultDesc = (key: string) => {
    switch (key) {
        case 'admin_approval_required': return 'Require admin approval for new students';
        case 'available_courses': return 'Comma-separated list of courses';
        case 'available_programmes': return 'Comma-separated list of available programmes';
        case 'student_registration_open': return 'Allow students to register themselves';
        case 'available_academic_years': return 'Comma-separated list of available academic years';
        case 'available_levels': return 'Comma-separated list of levels';
        case 'registration_status': return 'Registration status (open/closed)';
        default: return '';
    }
};

export default function AdminSettingsPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const { refreshBranding } = useBranding();

    const [settings, setSettings] = useState<SettingsMap>({});
    const [loadingData, setLoadingData] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('sys_general');

    const allowedRoles = ['admin', 'treasurer', 'financial_secretary', 'president'];
    const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003/api').replace('/api', '');

    useEffect(() => {
        if (!loading && (!user || !allowedRoles.includes(user.role))) {
            router.push('/admin/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user && allowedRoles.includes(user.role)) fetchSettings();
    }, [user]);

    const activeTabMeta = useMemo(() => ALL_TABS.find((tab: any) => tab.id === activeTab), [activeTab]);

    const fetchSettings = async () => {
        setLoadingData(true);
        try {
            const res = await api.get('/settings');
            if (res.data.success) setSettings(res.data.data);
        } catch {
            toast.error('Failed to load settings');
        } finally {
            setLoadingData(false);
        }
    };

    const handleUpdate = async () => {
        setSubmitting(true);
        const updateData: { [key: string]: string } = {};
        Object.keys(settings).forEach(key => { updateData[key] = settings[key].value; });

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
        setSettings(prev => ({ ...prev, [key]: { ...prev[key], value } }));
    };

    const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>, key: string) => {
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
            const res = await api.post('/settings/upload-logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
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

    const getKeysForActiveTab = () => {
        let keys = Object.keys(settings).filter(key => settings[key].category === activeTab);

        if (activeTab === 'pay_charges' && settings.payment_service_fee && !keys.includes('payment_service_fee')) {
            keys = ['payment_service_fee', ...keys];
        }

        if (activeTab === 'sys_general') {
            keys = keys.filter(key => key !== 'payment_service_fee');
        }

        return keys;
    };

    const renderSettingInput = (key: string) => {
        const val = (settings[key]?.value !== undefined && settings[key]?.value !== null)
            ? settings[key].value
            : getDefaultValue(key);

        if (key === 'service_charge_type') {
            const options = [
                { value: 'fixed', label: 'Fixed' },
                { value: 'percentage', label: 'Percentage' }
            ];
            return (
                <div className="grid grid-cols-2 gap-2">
                    {options.map(option => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => handleChange(key, option.value)}
                            className={`py-2.5 rounded-lg text-xs font-extrabold transition-colors ${val === option.value ? 'bg-primary text-white' : 'bg-white text-primary border border-gray-200 hover:bg-gray-50'}`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            );
        }

        if (key === 'homepage_variant') {
            return (
                <select className="input-field py-2 text-sm font-bold" value={val || 'portal'} onChange={(e) => handleChange(key, e.target.value)}>
                    <option value="portal">CURRENT PORTAL HOMEPAGE</option>
                    <option value="classic">CLASSIC HOMEPAGE</option>
                </select>
            );
        }

        if (key === 'payment_service_fee') {
            const isPercentage = settings.service_charge_type?.value === 'percentage';
            return (
                <div className="space-y-2">
                    <div className="relative">
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="input-field pr-14"
                            value={val}
                            onChange={(e) => handleChange(key, e.target.value)}
                            placeholder={isPercentage ? 'Example: 2.5' : 'Example: 1.50'}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                            {isPercentage ? '%' : 'GHS'}
                        </span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                        {isPercentage ? 'Percentage is calculated from the student payment amount.' : 'Fixed amount is added to each online payment.'}
                    </p>
                </div>
            );
        }

        if (key === 'app_logo' || key === 'app_logo_secondary' || key === 'app_favicon') {
            return (
                <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-3 sm:gap-5 group">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 bg-white border-2 border-dashed border-gray-200 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 group-hover:border-primary transition-colors">
                        {val ? <img src={val.startsWith('/') ? `${API_BASE}${val}` : val} className="w-full h-full object-contain p-1" alt="Preview" /> : <span className="w-6 h-6 text-gray-400 opacity-50"><ImageIcon /></span>}
                    </div>
                    <div className="flex-1 space-y-2 min-w-0">
                        <input type="text" className="input-field py-1 text-xs" value={val} onChange={(e) => handleChange(key, e.target.value)} placeholder="Image URL..." />
                        <label className="text-[10px] font-bold text-secondary cursor-pointer hover:underline flex items-center gap-1">
                            Upload New File
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, key)} />
                        </label>
                    </div>
                </div>
            );
        }

        if (key.endsWith('_enabled') || key.endsWith('_status') || key.endsWith('_required') || key === 'paystack_auto_verify' || key === 'student_registration_open') {
            const isToggle = key !== 'registration_status';
            const isOn = isToggle ? (val === 'true' || val === '1') : val === 'open';
            return (
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => handleChange(key, isOn ? (isToggle ? 'false' : 'closed') : (isToggle ? 'true' : 'open'))}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${isOn ? 'bg-primary' : 'bg-gray-200'}`}
                    >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${isOn ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className={`text-xs font-black tracking-wider ${isOn ? 'text-primary' : 'text-gray-400'}`}>
                        {isOn ? (isToggle ? 'ENABLED' : 'OPEN') : (isToggle ? 'DISABLED' : 'CLOSED')}
                    </span>
                </div>
            );
        }

        if (key.includes('available_')) {
            const itemsList = val ? val.split(',').map(x => x.trim()).filter(Boolean) : [];
            return (
                <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 p-2 bg-white border border-gray-200 rounded-lg min-h-[44px] items-center">
                        {itemsList.map((item: string, i: number) => (
                            <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-800 text-xs font-bold rounded-lg border border-slate-200">
                                {item}
                                <button type="button" onClick={() => {
                                    const updated = itemsList.filter((_, idx) => idx !== i);
                                    handleChange(key, updated.join(', '));
                                }} className="text-red-500 hover:text-red-700 font-extrabold text-xs ml-1">&times;</button>
                            </span>
                        ))}
                    </div>
                    <input
                        type="text"
                        className="input-field py-2 text-xs"
                        placeholder="Type and press Enter to add..."
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                const value = e.currentTarget.value.trim();
                                if (value) {
                                    if (!itemsList.includes(value)) {
                                        handleChange(key, [...itemsList, value].join(', '));
                                        e.currentTarget.value = '';
                                    }
                                }
                            }
                        }}
                    />
                </div>
            );
        }

        if (key === 'app_theme' || key === 'service_charge_scope' || key === 'manual_payment_workflow') {
            const dropdownOptions: any = {
                app_theme: ['light', 'dark', 'system'],
                service_charge_scope: ['global', 'per_due'],
                manual_payment_workflow: ['standard', 'instant']
            };
            const options = dropdownOptions[key] || [];
            return (
                <select className="input-field py-2 text-xs font-bold" value={val} onChange={(e) => handleChange(key, e.target.value)}>
                    {options.map((opt: string) => <option key={opt} value={opt}>{opt.toUpperCase()}</option>)}
                </select>
            );
        }

        if (key.includes('instructions') || key.includes('bank') || key.includes('template') || key === 'app_footer_text') {
            return <textarea className="input-field p-3 text-xs leading-relaxed" rows={key.includes('template') ? 5 : 3} value={val} onChange={(e) => handleChange(key, e.target.value)} />;
        }

        const isPassword = key.includes('pass') || key.includes('secret') || key.includes('api_key');
        return <input type={isPassword ? 'password' : 'text'} className={`input-field px-4 py-2 text-sm ${isPassword ? 'font-mono' : ''}`} value={val} onChange={(e) => handleChange(key, e.target.value)} />;
    };

    const getGroupedContent = () => {
        if (activeTab === 'portal') {
            const col1 = [
                'admin_approval_required',
                'available_courses',
                'available_programmes',
                'student_registration_open'
            ];
            const col2 = [
                'available_academic_years',
                'available_levels',
                'registration_status'
            ];

            const renderPortalItem = (key: string) => {
                const item = settings[key] || {
                    value: getDefaultValue(key),
                    category: 'portal',
                    description: getDefaultDesc(key)
                };
                return (
                    <div key={key} className="flex flex-col mb-6">
                        <label className="text-xs font-extrabold text-primary uppercase tracking-wider mb-1">
                            {formatSettingLabel(key)}
                        </label>
                        <p className="text-xs text-gray-400 mb-3 leading-snug">{item.description || getDefaultDesc(key)}</p>
                        {renderSettingInput(key)}
                    </div>
                );
            };

            return (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-2">
                        <div>{col1.map(renderPortalItem)}</div>
                        <div>{col2.map(renderPortalItem)}</div>
                    </div>
                    <SaveRow submitting={submitting} onSave={handleUpdate} text="Portal settings saved on this tab apply immediately." label="Save Settings" />
                </div>
            );
        }

        if (activeTab === 'sys_maintenance') {
            const maintenanceKeys = ['homepage_variant', 'maintenance_mode'].filter(k => settings[k]);
            return (
                <div className="space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        {maintenanceKeys.map(k => (
                            <SettingBlock key={k} title={formatSettingLabel(k)} description={settings[k].description}>
                                {renderSettingInput(k)}
                            </SettingBlock>
                        ))}
                    </div>
                    <SaveRow submitting={submitting} onSave={handleUpdate} text="Maintenance changes apply after saving." label="Save Maintenance Settings" />
                    <DangerZone submitting={submitting} setSubmitting={setSubmitting} />
                </div>
            );
        }

        const keys = getKeysForActiveTab();
        return (
            <div className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 sm:gap-y-6">
                    {keys.map(key => (
                        <div key={key} className={`flex flex-col ${(key.includes('instructions') || key.includes('bank') || key.includes('template')) ? 'md:col-span-2' : ''}`}>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-bold text-primary uppercase tracking-tight">{formatSettingLabel(key)}</label>
                                {key.includes('api_key') || key.includes('secret') || key.includes('_pass') ? <span className="text-[10px] px-2 py-0.5 bg-yellow-100 text-yellow-700 font-bold rounded">SECURE</span> : null}
                            </div>
                            <p className="text-xs text-gray-500 mb-3 leading-snug">{settings[key].description}</p>
                            {renderSettingInput(key)}
                        </div>
                    ))}
                </div>
                {keys.length > 0 && <SaveRow submitting={submitting} onSave={handleUpdate} text="Settings saved on this tab apply immediately." label="Save Settings" />}
            </div>
        );
    };

    if (loading || loadingData) {
        return <Layout title="System Settings"><div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div></Layout>;
    }

    return (
        <Layout title="System Administration">
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
                <div className="lg:hidden card p-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Settings Section</label>
                    <select className="input-field text-sm font-bold" value={activeTab} onChange={(e) => setActiveTab(e.target.value)}>
                        {ALL_TABS.map((tab: any) => <option key={tab.id} value={tab.id}>{tab.groupName} / {tab.name}</option>)}
                    </select>
                </div>

                <div className="hidden lg:block w-full lg:w-64 shrink-0 space-y-6">
                    {SETTING_GROUPS.map((group: any) => {
                        const GroupIcon = group.icon;
                        return (
                            <div key={group.id} className="card p-4">
                                <h3 className="flex items-center gap-2 px-2 mb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    <span className="w-4 h-4"><GroupIcon /></span> {group.name}
                                </h3>
                                <div className="space-y-1">
                                    {group.subcategories.map((sub: any) => {
                                        const SubIcon = sub.icon;
                                        return (
                                            <button
                                                type="button"
                                                key={sub.id}
                                                onClick={() => setActiveTab(sub.id)}
                                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === sub.id ? 'bg-primary text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
                                            >
                                                <span className="w-5 h-5"><SubIcon /></span><span>{sub.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="card shadow-md p-4 sm:p-6">
                        <div className="mb-5 sm:mb-10 pb-4 sm:pb-6 border-b flex items-center justify-between">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase mb-1"><span>ADMIN</span><span>/</span><span className="text-secondary">SETTINGS</span></div>
                                <h2 className="text-xl sm:text-2xl font-extrabold text-primary uppercase leading-tight">
                                    {activeTabMeta?.name || 'Settings'} <span className="text-gray-300">Management</span>
                                </h2>
                            </div>
                            <div className="hidden sm:flex flex-col items-end"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user?.role} Access</span></div>
                        </div>
                        <div className="min-h-[260px] sm:min-h-[500px]">{getGroupedContent()}</div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

function SettingBlock({ title, description, children }: { title: string; description: string; children: ReactNode }) {
    return <div className="p-4 sm:p-6 bg-gray-50 border rounded-lg"><h4 className="font-bold text-primary text-sm mb-1 uppercase tracking-tight">{title}</h4><p className="text-xs text-gray-500 mb-4">{description}</p>{children}</div>;
}

function SaveRow({ submitting, onSave, text, label }: { submitting: boolean; onSave: () => void; text: string; label: string }) {
    return <div className="pt-4 sm:pt-6 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-5 sm:mt-8"><p className="text-xs text-gray-400 italic">{text}</p><button type="button" onClick={onSave} disabled={submitting} className="btn-primary w-full sm:w-auto">{submitting ? 'Saving...' : label}</button></div>;
}

function DangerZone({ submitting, setSubmitting }: { submitting: boolean; setSubmitting: (value: boolean) => void }) {
    const resetSite = async () => {
        const confirmReset = window.confirm('Are you sure you want to RESET THE ENTIRE SITE?');
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
    };

    return <div className="p-4 sm:p-6 bg-red-50 border border-red-100 rounded-lg"><h3 className="text-lg font-bold text-red-900 mb-1">Danger Zone: Site Reset</h3><p className="text-xs text-red-700 leading-relaxed mb-6">Wipe all transaction data, student profiles, and assignments.<span className="font-bold underline block mt-1">THIS ACTION IS PERMANENT.</span></p><button type="button" onClick={resetSite} disabled={submitting} className="bg-red-600 hover:bg-red-700 text-white px-5 sm:px-6 py-2 rounded-lg font-bold text-sm shadow-sm transition-all">Reset Entire Site Now</button></div>;
}
