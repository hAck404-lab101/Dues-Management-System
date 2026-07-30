'use client';

import { useEffect, useMemo, useState, useRef, type ChangeEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
    SettingsIcon, GlobeIcon, PaletteIcon, WrenchIcon, AcademicCapIcon,
    DocumentTextIcon, CashIcon, CardIcon, LandmarkIcon, TrendingUpIcon,
    EnvelopeIcon, SmsIcon, ShieldIcon, LockClosedIcon, ImageIcon,
    UsersIcon, ImportIcon, DownloadIcon, FolderIcon, PencilIcon,
    ExclamationIcon, CheckCircleIcon, SendIcon, SparklesIcon,
    PlusIcon, TrashIcon, KeyIcon, BellIcon, EyeIcon, EyeSlashIcon
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

interface StaffUser {
    id: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string;
}

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

interface SystemLog {
    id: string;
    category: string;
    level: string;
    event: string;
    message: string;
    context: any;
    ip: string | null;
    created_at: string;
}

interface AuditLog {
    id: string;
    user_email: string;
    action: string;
    resource_type: string;
    resource_id: string | null;
    message: string;
    ip_address: string | null;
    created_at: string;
}

interface SmsLog {
    id: string;
    recipient_phone: string;
    message: string;
    message_type: string;
    status: string;
    created_at: string;
}

const SETTING_TABS = [
    { id: 'general', name: 'General', icon: GlobeIcon },
    { id: 'academic', name: 'Academic', icon: AcademicCapIcon },
    { id: 'payments', name: 'Payments', icon: CashIcon },
    { id: 'integrations', name: 'Integrations', icon: SparklesIcon },
    { id: 'notifications', name: 'Notifications', icon: EnvelopeIcon },
    { id: 'audit_trail', name: 'Audit Trail', icon: ShieldIcon },
    { id: 'security', name: 'Security', icon: LockClosedIcon },
    { id: 'backup', name: 'Backup & Recovery', icon: ShieldIcon },
    { id: 'danger', name: 'Danger Zone', icon: LockClosedIcon }
];

function SettingsWorkspaceContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading, hasPermission } = useAuth();
    const { refreshBranding } = useBranding();

    // Sync tab with search parameter "?tab=..."
    const [activeTab, setActiveTab] = useState('general');
    
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && SETTING_TABS.some(t => t.id === tab)) {
            setActiveTab(tab);
        } else {
            setActiveTab('general');
        }
    }, [searchParams]);

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        router.push(`/dashboard/admin/settings?tab=${tabId}`);
    };

    const [settings, setSettings] = useState<SettingsMap>({});
    const [loadingData, setLoadingData] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Users tab states
    const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
    const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
    const [userForm, setUserForm] = useState({ email: '', password: '', role: 'treasurer' });
    const [showUserModal, setShowUserModal] = useState(false);

    // Security tab change password state
    const [securityForm, setSecurityForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [securitySubmitting, setSecuritySubmitting] = useState(false);

    // Backup tab state
    const backupFileRef = useRef<HTMLInputElement | null>(null);
    const [backupFile, setBackupFile] = useState<File | null>(null);
    const [backupBusy, setBackupBusy] = useState(false);

    // Announcements tab states
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [annForm, setAnnForm] = useState({ title: '', body: '', audience: 'all_staff', is_published: false });
    const [showAnnModal, setShowAnnModal] = useState(false);

    // CSV Import tab states
    const importFileRef = useRef<HTMLInputElement>(null);
    const [parsedStudents, setParsedStudents] = useState<any[]>([]);
    const [importingStudents, setImportingStudents] = useState(false);
    const [importResult, setImportResult] = useState<any>(null);

    // Reset Site modal states
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetPassword, setResetPassword] = useState('');
    const [resetConfirmText, setResetConfirmText] = useState('');

    const [availableProgrammes, setAvailableProgrammes] = useState<string[]>([]);
    const [availableAcademicYears, setAvailableAcademicYears] = useState<string[]>([]);

    // Logs inline rendering states
    const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);
    const [logsSearch, setLogsSearch] = useState('');
    const [logType, setLogType] = useState<'system' | 'audit'>('system');
    const [logsLevelFilter, setLogsLevelFilter] = useState('');
    const [logsCategoryFilter, setLogsCategoryFilter] = useState('');
    const [logsPage, setLogsPage] = useState(1);
    const [logsTotalPages, setLogsTotalPages] = useState(1);
    const [logsLoading, setLogsLoading] = useState(false);
    const [selectedLogContext, setSelectedLogContext] = useState<any>(null);
    const [tailEnabled, setTailEnabled] = useState(false);
    const tailPollTimerRef = useRef<NodeJS.Timeout | null>(null);

    const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '');

    const fetchAllData = async () => {
        setLoadingData(true);
        try {
            // Load settings
            const settingsRes = await api.get('/settings');
            if (settingsRes.data.success) {
                setSettings(settingsRes.data.data);
                setAvailableProgrammes(settingsRes.data.data.available_programmes?.value?.split(',').map((p: string) => p.trim()).filter(Boolean) || []);
                setAvailableAcademicYears(settingsRes.data.data.available_academic_years?.value?.split(',').map((y: string) => y.trim()).filter(Boolean) || []);
            }

            // Load staff
            if (hasPermission('users.edit')) {
                const usersRes = await api.get('/admin/users');
                if (usersRes.data.success) setStaffUsers(usersRes.data.data);
            }

            // Load announcements
            const annRes = await api.get('/admin/announcements');
            if (annRes.data.success) setAnnouncements(annRes.data.data);

        } catch (error) {
            console.error('Failed to load settings workspace data:', error);
            toast.error('Failed to load settings data');
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        if (user && user.role === 'admin') {
            fetchAllData();
        }
    }, [user]);

    // Fetch Logs based on tab and parameters
    const fetchLogsData = async (quiet = false) => {
        if (user?.role !== 'admin') return;
        if (!quiet) setLogsLoading(true);
        try {
            if (activeTab === 'audit_trail' && logType === 'system') {
                const res = await api.get('/admin/system-logs', {
                    params: {
                        page: logsPage,
                        limit: 30,
                        search: logsSearch.trim() || undefined,
                        level: logsLevelFilter || undefined,
                        category: logsCategoryFilter || undefined
                    }
                });
                if (res.data?.success) {
                    setSystemLogs(res.data.data);
                    setLogsTotalPages(res.data.pagination.pages || 1);
                }
            } else if (activeTab === 'audit_trail' && logType === 'audit') {
                const res = await api.get('/admin/audit-logs', {
                    params: {
                        page: logsPage,
                        limit: 30,
                        action: logsSearch.trim() || undefined
                    }
                });
                if (res.data?.success) {
                    setAuditLogs(res.data.data);
                    setLogsTotalPages(res.data.pagination.pages || 1);
                }
            }
        } catch (err) {
            console.error('Logs fetch failed:', err);
        } finally {
            if (!quiet) setLogsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'audit_trail') {
            setLogsPage(1);
            fetchLogsData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, logType, logsLevelFilter, logsCategoryFilter]);

    useEffect(() => {
        if (activeTab === 'audit_trail') {
            fetchLogsData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [logsPage]);

    // Logs search debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (activeTab === 'audit_trail') {
                setLogsPage(1);
                fetchLogsData();
            }
        }, 400);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [logsSearch]);

    // System logs tailing poll
    useEffect(() => {
        if (tailEnabled && activeTab === 'audit_trail' && logType === 'system') {
            tailPollTimerRef.current = setInterval(() => {
                fetchLogsData(true);
            }, 5000);
        } else {
            if (tailPollTimerRef.current) {
                clearInterval(tailPollTimerRef.current);
                tailPollTimerRef.current = null;
            }
        }
        return () => {
            if (tailPollTimerRef.current) clearInterval(tailPollTimerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tailEnabled, activeTab, logType, logsSearch, logsLevelFilter, logsCategoryFilter, logsPage]);

    const handleSettingChange = (key: string, value: string) => {
        setSettings(prev => ({
            ...prev,
            [key]: { ...prev[key], value }
        }));
    };

    const handleSaveSettings = async () => {
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
                setAvailableProgrammes(settings.available_programmes?.value?.split(',').map((p: string) => p.trim()).filter(Boolean) || []);
                setAvailableAcademicYears(settings.available_academic_years?.value?.split(',').map((y: string) => y.trim()).filter(Boolean) || []);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update settings');
        } finally {
            setSubmitting(false);
        }
    };

    const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>, key: string) => {
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
                handleSettingChange(key, res.data.data.url);
                toast.success('Branding asset uploaded successfully');
                await refreshBranding();
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Asset upload failed');
        } finally {
            setSubmitting(false);
        }
    };

    // Password Update Functions
    const handleSecurityUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (securityForm.newPassword !== securityForm.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }
        if (securityForm.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setSecuritySubmitting(true);
        try {
            await api.post('/auth/change-password', {
                currentPassword: securityForm.currentPassword,
                newPassword: securityForm.newPassword
            });
            toast.success('Your administrator password changed successfully');
            setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Password update failed');
        } finally {
            setSecuritySubmitting(false);
        }
    };

    // Backup & Recovery Functions
    const handleDownloadBackup = async () => {
        setBackupBusy(true);
        try {
            const res = await api.get('/settings/backup/download', { responseType: 'blob' });
            const blob = new Blob([res.data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `dues-management-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            toast.success('System database backup downloaded');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Download failed');
        } finally {
            setBackupBusy(false);
        }
    };

    const handleRestoreBackup = async () => {
        if (!backupFile) {
            toast.error('Select a backup JSON file first');
            return;
        }
        const firstConfirm = window.confirm('This will wipe and replace current database records with backup data. Continue?');
        if (!firstConfirm) return;

        const typed = window.prompt("Type 'RESTORE BACKUP' to confirm:");
        if (typed !== 'RESTORE BACKUP') {
            toast.error('Restore cancelled');
            return;
        }

        const formData = new FormData();
        formData.append('backup', backupFile);
        formData.append('confirmation', 'RESTORE BACKUP');

        setBackupBusy(true);
        try {
            const res = await api.post('/settings/backup/restore', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success(res.data?.message || 'Database restored successfully');
            setBackupFile(null);
            if (backupFileRef.current) backupFileRef.current.value = '';
            fetchAllData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to restore database');
        } finally {
            setBackupBusy(false);
        }
    };

    // Users CRUD
    const handleCreateOrUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingUser) {
                const res = await api.patch(`/admin/users/${editingUser.id}`, {
                    role: userForm.role,
                    password: userForm.password || undefined
                });
                if (res.data.success) {
                    toast.success('Staff user updated successfully');
                    setShowUserModal(false);
                    const usersRes = await api.get('/admin/users');
                    if (usersRes.data.success) setStaffUsers(usersRes.data.data);
                }
            } else {
                const res = await api.post('/admin/users', userForm);
                if (res.data.success) {
                    toast.success('Staff user created successfully');
                    setShowUserModal(false);
                    const usersRes = await api.get('/admin/users');
                    if (usersRes.data.success) setStaffUsers(usersRes.data.data);
                }
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleUserStatus = async (userObj: StaffUser) => {
        try {
            const res = await api.patch(`/admin/users/${userObj.id}`, {
                is_active: !userObj.is_active
            });
            if (res.data.success) {
                toast.success(`Staff user ${userObj.is_active ? 'deactivated' : 'activated'} successfully`);
                const usersRes = await api.get('/admin/users');
                if (usersRes.data.success) setStaffUsers(usersRes.data.data);
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update status');
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!window.confirm('Delete this staff user account?')) return;
        try {
            const res = await api.delete(`/admin/users/${id}`);
            if (res.data.success) {
                toast.success('Staff user deleted');
                const usersRes = await api.get('/admin/users');
                if (usersRes.data.success) setStaffUsers(usersRes.data.data);
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete user');
        }
    };

    // Announcements
    const handleCreateAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await api.post('/admin/announcements', annForm);
            if (res.data.success) {
                toast.success('Announcement broadcast created');
                setShowAnnModal(false);
                setAnnForm({ title: '', body: '', audience: 'all_staff', is_published: false });
                const annRes = await api.get('/admin/announcements');
                if (annRes.data.success) setAnnouncements(annRes.data.data);
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to create announcement');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleAnnouncementPublish = async (ann: Announcement) => {
        try {
            const res = await api.patch(`/admin/announcements/${ann.id}`, {
                is_published: !ann.is_published
            });
            if (res.data.success) {
                toast.success(ann.is_published ? 'Announcement un-published' : 'Announcement published');
                const annRes = await api.get('/admin/announcements');
                if (annRes.data.success) setAnnouncements(annRes.data.data);
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
                const annRes = await api.get('/admin/announcements');
                if (annRes.data.success) setAnnouncements(annRes.data.data);
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete announcement');
        }
    };

    // CSV Roster Import Functions
    const parseCSV = (text: string) => {
        const lines = text.trim().split('\n').filter(l => l.trim());
        if (lines.length < 2) return [];
        const headers = lines[0].split(',').map(h => h.trim());
        return lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            const obj: any = {};
            headers.forEach((h, i) => {
                obj[h] = values[i] || '';
            });
            return obj;
        }).filter(s => s.indexNumber && s.fullName && s.email);
    };

    const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            const students = parseCSV(text);
            setParsedStudents(students);
            setImportResult(null);
            if (students.length === 0) toast.error('No valid rows found in CSV roster');
            else toast.success(`${students.length} students parsed from file`);
        };
        reader.readAsText(file);
    };

    const handleImportParsed = async () => {
        if (parsedStudents.length === 0) return;
        setImportingStudents(true);
        setImportResult(null);
        try {
            const res = await api.post('/admin/bulk-import-students', { students: parsedStudents });
            setImportResult(res.data.data);
            toast.success(res.data.message);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Roster import failed');
        } finally {
            setImportingStudents(false);
        }
    };

    const downloadCSVTemplate = () => {
        const template = `indexNumber,fullName,email,level,programme,academicYear,phoneNumber\nSTD/ICT/26/001,John Doe,john.doe@example.com,100,Information Technology,2025/2026,0244123456\nSTD/CS/26/002,Jane Smith,jane.smith@example.com,200,Computer Science,2024/2025,0551234567`;
        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'student-roster-template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleLogsExportCSV = () => {
        let headers: string[] = [];
        let rows: any[] = [];
        let filename = '';

        if (activeTab === 'audit_trail' && logType === 'system') {
            headers = ['Timestamp', 'Level', 'Category', 'Event', 'Message', 'IP Address'];
            rows = systemLogs.map(l => [
                new Date(l.created_at).toISOString(),
                l.level,
                l.category,
                l.event,
                l.message?.replace(/"/g, '""') || '',
                l.ip || ''
            ]);
            filename = `system_logs_${Date.now()}.csv`;
        } else if (activeTab === 'audit_trail' && logType === 'audit') {
            headers = ['Timestamp', 'Admin Email', 'Action', 'Resource', 'Message', 'IP Address'];
            rows = auditLogs.map(l => [
                new Date(l.created_at).toISOString(),
                l.user_email,
                l.action,
                l.resource_type,
                l.message?.replace(/"/g, '""') || '',
                l.ip_address || ''
            ]);
            filename = `audit_logs_${Date.now()}.csv`;
        }

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map((val: string) => `"${val}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Logs CSV exported successfully');
    };

    const triggerResetSite = () => {
        setResetPassword('');
        setResetConfirmText('');
        setShowResetModal(true);
    };

    const handleResetSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (resetConfirmText !== 'RESET EVERYTHING') {
            toast.error("You must type 'RESET EVERYTHING' to confirm.");
            return;
        }
        if (!resetPassword) {
            toast.error("Password is required.");
            return;
        }

        try {
            setSubmitting(true);
            const res = await api.post('/settings/reset-site', { password: resetPassword });
            if (res.data.success) {
                setShowResetModal(false);
                toast.success('Site successfully wiped. Logging out...');
                setTimeout(() => {
                    localStorage.clear();
                    window.location.href = '/';
                }, 2000);
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Reset failed');
        } finally {
            setSubmitting(false);
        }
    };


    if (loading || loadingData) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row gap-8">
            {/* Left tab rail */}
            <div className="w-full lg:w-64 shrink-0 space-y-6">
                <div className="card p-4">
                    <h3 className="flex items-center gap-2 px-2 mb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <SettingsIcon /> Workspace Tabs
                    </h3>
                    <div className="space-y-1">
                        {SETTING_TABS.map(tab => {
                            const TabIcon = tab.icon;
                            return (
                                <button
                                    type="button"
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                        activeTab === tab.id
                                            ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                                >
                                    <span className="w-5 h-5"><TabIcon /></span>
                                    <span>{tab.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Tab Panel */}
            <div className="flex-1 min-w-0">
                <div className="card shadow-xl border-none p-6 sm:p-8">
                    <div className="mb-8 pb-6 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-extrabold text-primary/60 uppercase tracking-widest block mb-1">
                                Settings Workspace
                            </span>
                            <h2 className="text-xl sm:text-2xl font-black text-gray-900 uppercase">
                                {SETTING_TABS.find(t => t.id === activeTab)?.name} Settings
                            </h2>
                        </div>
                    </div>

                    {/* General Tab */}
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col">
                                    <label className="text-xs font-bold text-primary uppercase mb-2">Application Name</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={settings.app_name?.value || ''}
                                        onChange={e => handleSettingChange('app_name', e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-xs font-bold text-primary uppercase mb-2">Homepage Style</label>
                                    <select
                                        className="input-field py-2 text-sm font-bold"
                                        value={settings.homepage_variant?.value || 'portal'}
                                        onChange={e => handleSettingChange('homepage_variant', e.target.value)}
                                    >
                                        <option value="portal">Current Portal Homepage</option>
                                        <option value="classic">Classic Homepage</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2 flex flex-col">
                                    <label className="text-xs font-bold text-primary uppercase mb-2">Portal Description</label>
                                    <textarea
                                        rows={3}
                                        className="input-field p-3 text-xs leading-relaxed"
                                        value={settings.app_description?.value || ''}
                                        onChange={e => handleSettingChange('app_description', e.target.value)}
                                    />
                                </div>

                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col gap-3">
                                        <span className="text-xs font-bold text-gray-700">Primary Brand Logo</span>
                                        <div className="h-16 flex items-center justify-center bg-white border rounded-xl overflow-hidden p-2">
                                            {settings.app_logo?.value ? (
                                                <img src={settings.app_logo.value.startsWith('/') ? `${API_BASE}${settings.app_logo.value}` : settings.app_logo.value} className="max-h-full object-contain" alt="Logo" />
                                            ) : (
                                                <span className="text-xs font-semibold text-gray-400">No logo set</span>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                className="input-field py-1.5 px-3 text-xs"
                                                placeholder="Logo URL (https://...)"
                                                value={settings.app_logo?.value || ''}
                                                onChange={e => handleSettingChange('app_logo', e.target.value)}
                                            />
                                            <label className="btn-outline py-2 text-xs font-bold cursor-pointer text-center block w-full">
                                                Upload File
                                                <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'app_logo')} />
                                            </label>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col gap-3">
                                        <span className="text-xs font-bold text-gray-700">Secondary Brand Logo</span>
                                        <div className="h-16 flex items-center justify-center bg-white border rounded-xl overflow-hidden p-2">
                                            {settings.app_logo_secondary?.value ? (
                                                <img src={settings.app_logo_secondary.value.startsWith('/') ? `${API_BASE}${settings.app_logo_secondary.value}` : settings.app_logo_secondary.value} className="max-h-full object-contain" alt="Secondary Logo" />
                                            ) : (
                                                <span className="text-xs font-semibold text-gray-400">No secondary logo set</span>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                className="input-field py-1.5 px-3 text-xs"
                                                placeholder="Secondary Logo URL (https://...)"
                                                value={settings.app_logo_secondary?.value || ''}
                                                onChange={e => handleSettingChange('app_logo_secondary', e.target.value)}
                                            />
                                            <label className="btn-outline py-2 text-xs font-bold cursor-pointer text-center block w-full">
                                                Upload File
                                                <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'app_logo_secondary')} />
                                            </label>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col gap-3">
                                        <span className="text-xs font-bold text-gray-700">Favicon Asset</span>
                                        <div className="h-16 flex items-center justify-center bg-white border rounded-xl overflow-hidden p-2">
                                            {settings.app_favicon?.value ? (
                                                <img src={settings.app_favicon.value.startsWith('/') ? `${API_BASE}${settings.app_favicon.value}` : settings.app_favicon.value} className="max-h-full w-8 h-8 object-contain" alt="Favicon" />
                                            ) : (
                                                <span className="text-xs font-semibold text-gray-400">No favicon set</span>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                className="input-field py-1.5 px-3 text-xs"
                                                placeholder="Favicon URL (https://...)"
                                                value={settings.app_favicon?.value || ''}
                                                onChange={e => handleSettingChange('app_favicon', e.target.value)}
                                            />
                                            <label className="btn-outline py-2 text-xs font-bold cursor-pointer text-center block w-full">
                                                Upload File
                                                <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'app_favicon')} />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-gray-100">
                                <button onClick={handleSaveSettings} disabled={submitting} className="btn-primary px-8">
                                    {submitting ? 'Saving...' : 'Save General Changes'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Academic Tab */}
                    {activeTab === 'academic' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-6">
                                <div className="flex flex-col">
                                    <label className="text-xs font-bold text-primary uppercase mb-2">Active Academic Year</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={settings.active_academic_year?.value || ''}
                                        onChange={e => handleSettingChange('active_academic_year', e.target.value)}
                                        placeholder="Example: 2025/2026"
                                    />
                                </div>

                                <div className="flex flex-col">
                                    <label className="text-xs font-bold text-primary uppercase mb-2">Available Academic Years List (Comma Separated)</label>
                                    <textarea
                                        rows={2}
                                        className="input-field p-3 text-xs leading-relaxed"
                                        value={settings.available_academic_years?.value || ''}
                                        onChange={e => handleSettingChange('available_academic_years', e.target.value)}
                                        placeholder="2023/2024, 2024/2025, 2025/2026"
                                    />
                                </div>

                                <div className="flex flex-col">
                                    <label className="text-xs font-bold text-primary uppercase mb-2">Available Roster Programmes (Comma Separated)</label>
                                    <textarea
                                        rows={3}
                                        className="input-field p-3 text-xs leading-relaxed"
                                        value={settings.available_programmes?.value || ''}
                                        onChange={e => handleSettingChange('available_programmes', e.target.value)}
                                        placeholder="Computer Science, Information Technology, Software Engineering"
                                    />
                                </div>

                                <div className="flex flex-col">
                                    <label className="text-xs font-bold text-primary uppercase mb-2">Valid Level Stages List (Comma Separated)</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={settings.available_levels?.value || '100,200,300,400'}
                                        onChange={e => handleSettingChange('available_levels', e.target.value)}
                                        placeholder="100, 200, 300, 400"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-gray-100">
                                <button onClick={handleSaveSettings} disabled={submitting} className="btn-primary px-8">
                                    {submitting ? 'Saving...' : 'Save Academic Changes'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Dues Tab Summary */}
                    {activeTab === 'dues' && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl">
                                <h3 className="font-extrabold text-blue-950 uppercase text-sm mb-2">Departmental Dues pricing & pricing history</h3>
                                <p className="text-xs text-blue-800 leading-relaxed">
                                    To maintain total safety and auditing consistency, DuesPay v2 locks due pricing models immediately upon student assignment. Modifying active dues pricing prompts for justifications and updates pricing records.
                                </p>
                            </div>

                            <div className="border border-gray-100 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50">
                                <div>
                                    <h4 className="font-bold text-gray-900 text-sm">Dues CRUD & Pricing History Portal</h4>
                                    <p className="text-xs text-gray-500 mt-1">Manage active departmental dues, create due pricing lists, view historic changes, and execute safe bulk pricing runs.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => router.push('/dashboard/admin/settings/dues')}
                                    className="btn-primary shrink-0 flex items-center gap-2"
                                >
                                    <LandmarkIcon />
                                    <span>Open Dues Manager</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Students CSV Import Tab */}
                    {activeTab === 'import' && (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-gray-50 p-5 rounded-2xl">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-sm">Roster Import Portal</h3>
                                    <p className="text-xs text-gray-500 mt-1">Upload a student registry list in CSV format to populate the roster before running bill runs.</p>
                                </div>
                                <button onClick={downloadCSVTemplate} className="btn-outline text-xs shrink-0 flex items-center gap-2 bg-white">
                                    <span className="w-4 h-4"><DownloadIcon /></span>
                                    <span>Download CSV Template</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                                    <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">Active Programmes Checked</h3>
                                    <div className="flex flex-wrap gap-1">
                                        {availableProgrammes.map(p => (
                                            <span key={p} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">{p}</span>
                                        ))}
                                        {availableProgrammes.length === 0 && <span className="text-blue-400 text-[10px] italic">None defined</span>}
                                    </div>
                                </div>
                                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                                    <h3 className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-2">Active Academic Years Checked</h3>
                                    <div className="flex flex-wrap gap-1">
                                        {availableAcademicYears.map(y => (
                                            <span key={y} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded">{y}</span>
                                        ))}
                                        {availableAcademicYears.length === 0 && <span className="text-indigo-400 text-[10px] italic">None defined</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="border-2 border-dashed border-gray-200 hover:border-primary rounded-2xl p-10 text-center cursor-pointer transition-colors flex flex-col items-center justify-center bg-gray-50/20" onClick={() => importFileRef.current?.click()}>
                                <FolderIcon className="w-10 h-10 text-gray-400 mb-3" />
                                <p className="text-gray-700 text-xs font-bold">Click to select and preview student registry CSV file</p>
                                <input ref={importFileRef} type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
                            </div>

                            {parsedStudents.length > 0 && (
                                <div className="border rounded-2xl overflow-hidden bg-white shadow-sm">
                                    <div className="flex items-center justify-between p-4 border-b bg-gray-50/50">
                                        <h4 className="font-bold text-xs text-primary uppercase">Dry-run Preview: {parsedStudents.length} Students parsed</h4>
                                        <button onClick={handleImportParsed} disabled={importingStudents} className="btn-primary text-xs py-2 px-5 font-bold">
                                            {importingStudents ? 'Executing Import...' : `Import ${parsedStudents.length} Students`}
                                        </button>
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="bg-gray-100/50 font-bold text-gray-500 border-b">
                                                    <th className="p-3">Index No</th>
                                                    <th className="p-3">Name</th>
                                                    <th className="p-3">Email</th>
                                                    <th className="p-3">Level</th>
                                                    <th className="p-3">Programme</th>
                                                    <th className="p-3">Academic Year</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 font-medium">
                                                {parsedStudents.slice(0, 10).map((s, idx) => {
                                                    const isInvalidProg = availableProgrammes.length > 0 && !availableProgrammes.map(p => p.toLowerCase()).includes((s.programme || '').trim().toLowerCase());
                                                    const isInvalidYear = availableAcademicYears.length > 0 && !availableAcademicYears.map(y => y.toLowerCase()).includes((s.academicYear || '').trim().toLowerCase());
                                                    return (
                                                        <tr key={idx} className={isInvalidProg || isInvalidYear ? 'bg-red-50/50' : ''}>
                                                            <td className="p-3 font-mono text-[10px]">{s.indexNumber}</td>
                                                            <td className="p-3">{s.fullName}</td>
                                                            <td className="p-3 text-gray-500">{s.email}</td>
                                                            <td className="p-3">{s.level}</td>
                                                            <td className="p-3">
                                                                <span className={isInvalidProg ? 'text-rose-600 font-bold underline decoration-dotted' : ''}>
                                                                    {s.programme}
                                                                </span>
                                                            </td>
                                                            <td className="p-3">
                                                                <span className={isInvalidYear ? 'text-rose-600 font-bold underline decoration-dotted' : ''}>
                                                                    {s.academicYear}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {importResult && (
                                <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl">
                                    <h4 className="font-extrabold text-blue-950 uppercase text-xs mb-3">Roster Import Status</h4>
                                    <div className="flex gap-6 mb-4">
                                        <div>
                                            <p className="text-2xl font-black text-blue-700">{importResult.created}</p>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase">Created</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-black text-amber-700">{importResult.skipped}</p>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase">Skipped</p>
                                        </div>
                                    </div>
                                    {importResult.errors?.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            <p className="text-[11px] font-bold text-gray-700">Skipped/Conflict Logs:</p>
                                            {importResult.errors.slice(0, 10).map((err: string, i: number) => (
                                                <p key={i} className="text-[10px] text-yellow-800 bg-yellow-100 px-2 py-0.5 rounded font-mono">{err}</p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Users Tab */}
                    {activeTab === 'users' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-gray-50 p-5 rounded-2xl">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-sm">Staff Account Controls</h3>
                                    <p className="text-xs text-gray-500 mt-1">Add, update, or deactivate administration accounts with staff-level RBAC.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingUser(null);
                                        setUserForm({ email: '', password: '', role: 'treasurer' });
                                        setShowUserModal(true);
                                    }}
                                    className="btn-primary text-xs py-2.5 px-4 font-bold flex items-center gap-1.5"
                                >
                                    <PlusIcon /> Add Staff User
                                </button>
                            </div>

                            <div className="border border-gray-100 rounded-2xl overflow-hidden">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 font-bold text-gray-500 border-b">
                                            <th className="p-4">Email</th>
                                            <th className="p-4">Role Permission Group</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 font-medium">
                                        {staffUsers.map(staff => (
                                            <tr key={staff.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="p-4 font-bold text-gray-950">{staff.email}</td>
                                                <td className="p-4">
                                                    <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-extrabold uppercase border border-blue-100">
                                                        {staff.role.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`status-badge ${staff.is_active ? 'approved' : 'unpaid'}`}>
                                                        <span className="dot" />
                                                        <span className="uppercase text-[9px]">{staff.is_active ? 'Active' : 'Suspended'}</span>
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right flex justify-end gap-3">
                                                    <button
                                                        onClick={() => {
                                                            setEditingUser(staff);
                                                            setUserForm({ email: staff.email, password: '', role: staff.role });
                                                            setShowUserModal(true);
                                                        }}
                                                        className="text-primary hover:underline font-bold"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleUserStatus(staff)}
                                                        className={`${staff.is_active ? 'text-amber-600' : 'text-green-600'} hover:underline font-bold`}
                                                    >
                                                        {staff.is_active ? 'Suspend' : 'Activate'}
                                                    </button>
                                                    {staff.email !== user?.email && (
                                                        <button
                                                            onClick={() => handleDeleteUser(staff.id)}
                                                            className="text-rose-600 hover:underline font-bold"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Payments Tab */}
                    {activeTab === 'payments' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col md:col-span-2">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Paystack API Secrets</h3>
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-primary uppercase">Paystack Public Key</label>
                                    </div>
                                    <input
                                        type="text"
                                        className="input-field font-mono text-sm"
                                        value={settings.paystack_public_key?.value || ''}
                                        onChange={e => handleSettingChange('paystack_public_key', e.target.value)}
                                        placeholder="pk_live_..."
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-primary uppercase">Paystack Secret Key</label>
                                        <span className="text-[9px] px-1.5 py-0.5 bg-yellow-100 text-yellow-700 font-bold rounded">SECURE</span>
                                    </div>
                                    <input
                                        type="password"
                                        className="input-field font-mono text-sm"
                                        value={settings.paystack_secret_key?.value || ''}
                                        onChange={e => handleSettingChange('paystack_secret_key', e.target.value)}
                                        placeholder="sk_live_..."
                                    />
                                </div>
                                <div className="flex flex-col md:col-span-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-primary uppercase">Paystack Webhook Secret</label>
                                        <span className="text-[9px] px-1.5 py-0.5 bg-yellow-100 text-yellow-700 font-bold rounded">SECURE</span>
                                    </div>
                                    <input
                                        type="password"
                                        className="input-field font-mono text-sm"
                                        value={settings.paystack_webhook_secret?.value || ''}
                                        onChange={e => handleSettingChange('paystack_webhook_secret', e.target.value)}
                                    />
                                </div>

                                <div className="flex flex-col md:col-span-2 mt-4 pt-4 border-t">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">MoMo & Bank Payment Accounts</h3>
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-xs font-bold text-primary uppercase mb-2">Account Name</label>
                                    <input
                                        type="text"
                                        className="input-field text-sm"
                                        value={settings.manual_payment_account_name?.value || ''}
                                        onChange={e => handleSettingChange('manual_payment_account_name', e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-xs font-bold text-primary uppercase mb-2">Bank / MoMo Provider Name</label>
                                    <input
                                        type="text"
                                        className="input-field text-sm"
                                        value={settings.manual_payment_bank_name?.value || ''}
                                        onChange={e => handleSettingChange('manual_payment_bank_name', e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-col md:col-span-2">
                                    <label className="text-xs font-bold text-primary uppercase mb-2">Account or MoMo Mobile Number</label>
                                    <input
                                        type="text"
                                        className="input-field text-sm font-mono"
                                        value={settings.manual_payment_account_number?.value || ''}
                                        onChange={e => handleSettingChange('manual_payment_account_number', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-gray-100">
                                <button onClick={handleSaveSettings} disabled={submitting} className="btn-primary px-8">
                                    {submitting ? 'Saving...' : 'Save Payment Configuration'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Integrations Tab */}
                    {activeTab === 'integrations' && (
                        <div className="space-y-6">
                            <div className="p-5 bg-gray-50 border rounded-2xl flex items-center justify-between">
                                <div>
                                    <h4 className="font-extrabold text-gray-900 text-sm">Cloudflare Turnstile CAPTCHA Protection</h4>
                                    <p className="text-xs text-gray-500 mt-1">Protects the checkout and receipt lookup screens from automated scraping and spam bots.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleSettingChange('turnstile_enabled', settings.turnstile_enabled?.value === 'true' ? 'false' : 'true')}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                                            settings.turnstile_enabled?.value === 'true' ? 'bg-primary' : 'bg-gray-200'
                                        }`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            settings.turnstile_enabled?.value === 'true' ? 'translate-x-6' : 'translate-x-1'
                                        }`} />
                                    </button>
                                    <span className="text-[10px] font-extrabold text-gray-400 uppercase">
                                        {settings.turnstile_enabled?.value === 'true' ? 'ON' : 'OFF'}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col">
                                    <label className="text-xs font-bold text-primary uppercase mb-2">Turnstile Site Key</label>
                                    <input
                                        type="text"
                                        className="input-field font-mono text-xs"
                                        value={settings.turnstile_site_key?.value || ''}
                                        onChange={e => handleSettingChange('turnstile_site_key', e.target.value)}
                                        placeholder="1x00000000000000000000AA"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-primary uppercase">Turnstile Secret Key</label>
                                        <span className="text-[9px] px-1.5 py-0.5 bg-yellow-100 text-yellow-700 font-bold rounded">SECURE</span>
                                    </div>
                                    <input
                                        type="password"
                                        className="input-field font-mono text-xs"
                                        value={settings.turnstile_secret_key?.value || ''}
                                        onChange={e => handleSettingChange('turnstile_secret_key', e.target.value)}
                                        placeholder="1x0000000000000000000000000000000AA"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-gray-100">
                                <button onClick={handleSaveSettings} disabled={submitting} className="btn-primary px-8">
                                    {submitting ? 'Saving...' : 'Save Integrations'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Notifications Tab */}
                    {activeTab === 'notifications' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-6">
                                <div className="flex flex-col">
                                    <label className="text-xs font-bold text-primary uppercase mb-2">SMS Gateway Sender ID</label>
                                    <input
                                        type="text"
                                        className="input-field max-w-xs font-bold"
                                        maxLength={11}
                                        value={settings.sms_sender_id?.value || ''}
                                        onChange={e => handleSettingChange('sms_sender_id', e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-xs font-bold text-primary uppercase mb-2">SMS Payment Confirmation Template</label>
                                    <textarea
                                        rows={3}
                                        className="input-field p-3 text-xs leading-relaxed"
                                        value={settings.sms_payment_template?.value || ''}
                                        onChange={e => handleSettingChange('sms_payment_template', e.target.value)}
                                    />
                                    <span className="text-[10px] text-gray-400 font-semibold mt-1">Available wildcards: {'{name}, {amount}, {due_name}, {receipt_no}, {url}'}</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                                    <div className="flex flex-col">
                                        <label className="text-xs font-bold text-primary uppercase mb-2">SMTP Mail Server Host</label>
                                        <input
                                            type="text"
                                            className="input-field text-sm"
                                            value={settings.email_host?.value || ''}
                                            onChange={e => handleSettingChange('email_host', e.target.value)}
                                            placeholder="smtp.mailgun.org"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-xs font-bold text-primary uppercase mb-2">SMTP Port</label>
                                        <input
                                            type="number"
                                            className="input-field text-sm"
                                            value={settings.email_port?.value || '587'}
                                            onChange={e => handleSettingChange('email_port', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-xs font-bold text-primary uppercase mb-2">SMTP Username</label>
                                        <input
                                            type="text"
                                            className="input-field text-sm"
                                            value={settings.email_user?.value || ''}
                                            onChange={e => handleSettingChange('email_user', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs font-bold text-primary uppercase">SMTP Password</label>
                                            <span className="text-[9px] px-1.5 py-0.5 bg-yellow-100 text-yellow-700 font-bold rounded">SECURE</span>
                                        </div>
                                        <input
                                            type="password"
                                            className="input-field text-sm"
                                            value={settings.email_pass?.value || ''}
                                            onChange={e => handleSettingChange('email_pass', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-xs font-bold text-primary uppercase mb-2">Mail Sender From Address</label>
                                        <input
                                            type="email"
                                            className="input-field text-sm"
                                            value={settings.email_from?.value || ''}
                                            onChange={e => handleSettingChange('email_from', e.target.value)}
                                            placeholder="noreply@duespay.com"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-xs font-bold text-primary uppercase mb-2">Mail Sender Display Name</label>
                                        <input
                                            type="text"
                                            className="input-field text-sm"
                                            value={settings.email_from_name?.value || ''}
                                            onChange={e => handleSettingChange('email_from_name', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-gray-100">
                                <button onClick={handleSaveSettings} disabled={submitting} className="btn-primary px-8">
                                    {submitting ? 'Saving...' : 'Save Notification Options'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Announcements Tab */}
                    {activeTab === 'announcements' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-gray-50 p-5 rounded-2xl">
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
                                    <PlusIcon /> Compose Broadcast
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

                    {/* Audit Trail Tab */}
                    {activeTab === 'audit_trail' && (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-sm">System & Administrative Audit Trail</h3>
                                    <p className="text-xs text-gray-500 mt-1">Logs of all user actions, database operations, and system debug events.</p>
                                </div>
                                <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end">
                                    {logType === 'system' && (
                                        <label className="flex items-center gap-2 text-xs font-bold text-gray-500 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={tailEnabled}
                                                onChange={e => setTailEnabled(e.target.checked)}
                                                className="rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                            <span>Tail Log (5s)</span>
                                        </label>
                                    )}
                                    <button onClick={handleLogsExportCSV} className="btn-secondary py-2 px-5 text-xs font-bold">
                                        Export CSV
                                    </button>
                                </div>
                            </div>

                            {/* Sub-tab selection */}
                            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                                <button 
                                    onClick={() => { setLogType('system'); setLogsSearch(''); setLogsPage(1); }} 
                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${logType === 'system' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    System Audit
                                </button>
                                <button 
                                    onClick={() => { setLogType('audit'); setLogsSearch(''); setLogsPage(1); }} 
                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${logType === 'audit' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    User Audit Trail
                                </button>
                            </div>

                            {logType === 'system' ? (
                                <div className="space-y-6">
                                    {/* Filters */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-2xl">
                                        <div>
                                            <label className="label">Search Message</label>
                                            <input
                                                className="input-field py-1.5 text-xs"
                                                placeholder="Search by event or message..."
                                                value={logsSearch}
                                                onChange={e => setLogsSearch(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Level</label>
                                            <select
                                                className="input-field py-1.5 text-xs font-bold"
                                                value={logsLevelFilter}
                                                onChange={e => setLogsLevelFilter(e.target.value)}
                                            >
                                                <option value="">All Levels</option>
                                                <option value="debug">Debug</option>
                                                <option value="info">Info</option>
                                                <option value="warn">Warn</option>
                                                <option value="error">Error</option>
                                                <option value="critical">Critical</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label">Category</label>
                                            <select
                                                className="input-field py-1.5 text-xs font-bold"
                                                value={logsCategoryFilter}
                                                onChange={e => setLogsCategoryFilter(e.target.value)}
                                            >
                                                <option value="">All Categories</option>
                                                <option value="payment">Payment</option>
                                                <option value="webhook">Webhook</option>
                                                <option value="email">Email</option>
                                                <option value="sms">SMS</option>
                                                <option value="auth">Auth</option>
                                                <option value="public_access">Public Access</option>
                                                <option value="job">Job</option>
                                                <option value="integration">Integration</option>
                                                <option value="error">Error</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="border border-gray-100 rounded-2xl overflow-x-auto bg-white">
                                        {logsLoading ? (
                                            <div className="space-y-3 p-6">
                                                {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-gray-50 rounded animate-pulse" />)}
                                            </div>
                                        ) : (
                                            <table className="w-full text-left border-collapse text-xs">
                                                <thead>
                                                    <tr className="bg-gray-50 text-gray-500 font-bold border-b">
                                                        <th className="p-3.5 pl-4">Timestamp</th>
                                                        <th className="p-3.5">Level</th>
                                                        <th className="p-3.5">Category</th>
                                                        <th className="p-3.5">Event</th>
                                                        <th className="p-3.5">Message</th>
                                                        <th className="p-3.5 pr-4 text-right">Context</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 font-medium">
                                                    {systemLogs.map(log => (
                                                        <tr key={log.id} className="hover:bg-gray-50/40 transition-colors">
                                                            <td className="p-3.5 pl-4 font-mono text-gray-500 whitespace-nowrap">
                                                                {new Date(log.created_at).toLocaleString('en-GH')}
                                                            </td>
                                                            <td className="p-3.5 uppercase font-bold">
                                                                <span className={`px-2 py-0.5 rounded ${
                                                                    log.level === 'critical' || log.level === 'error'
                                                                        ? 'bg-rose-50 text-rose-600'
                                                                        : log.level === 'warn'
                                                                        ? 'bg-amber-50 text-amber-600'
                                                                        : 'bg-blue-50 text-blue-600'
                                                                }`}>
                                                                    {log.level}
                                                                </span>
                                                            </td>
                                                            <td className="p-3.5 font-bold text-gray-600">{log.category}</td>
                                                            <td className="p-3.5 font-bold text-primary">{log.event}</td>
                                                            <td className="p-3.5 max-w-xs truncate leading-relaxed">{log.message}</td>
                                                            <td className="p-3.5 pr-4 text-right">
                                                                <button
                                                                    onClick={() => setSelectedLogContext(log.context)}
                                                                    disabled={!log.context}
                                                                    className="text-primary hover:underline font-bold disabled:opacity-30 disabled:no-underline"
                                                                >
                                                                    JSON
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {systemLogs.length === 0 && (
                                                        <tr><td colSpan={6} className="text-center py-10 text-gray-500 font-bold italic">No system debug logs found</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-gray-50 p-4 rounded-2xl flex items-center gap-4 max-w-md">
                                        <label className="text-xs font-bold text-gray-700 whitespace-nowrap">Filter Action</label>
                                        <input
                                            className="input-field py-1.5 text-xs bg-white"
                                            placeholder="Search by action name (e.g. UPDATE)..."
                                            value={logsSearch}
                                            onChange={e => setLogsSearch(e.target.value)}
                                        />
                                    </div>

                                    <div className="border border-gray-100 rounded-2xl overflow-x-auto bg-white">
                                        {logsLoading ? (
                                            <div className="space-y-3 p-6">
                                                {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-gray-50 rounded animate-pulse" />)}
                                            </div>
                                        ) : (
                                            <table className="w-full text-left border-collapse text-xs">
                                                <thead>
                                                    <tr className="bg-gray-50 text-gray-500 font-bold border-b">
                                                        <th className="p-3.5 pl-4">Timestamp</th>
                                                        <th className="p-3.5">Admin Email</th>
                                                        <th className="p-3.5">Action</th>
                                                        <th className="p-3.5">Resource</th>
                                                        <th className="p-3.5 pr-4">Message</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 font-medium">
                                                    {auditLogs.map(log => (
                                                        <tr key={log.id} className="hover:bg-gray-50/40 transition-colors">
                                                            <td className="p-3.5 pl-4 font-mono text-gray-500 whitespace-nowrap">
                                                                {new Date(log.created_at).toLocaleString('en-GH')}
                                                            </td>
                                                            <td className="p-3.5 font-bold text-gray-900">{log.user_email}</td>
                                                            <td className="p-3.5 font-bold text-primary">{log.action}</td>
                                                            <td className="p-3.5">
                                                                <span className="px-2 py-0.5 bg-gray-100 border rounded text-[9px] font-bold uppercase text-gray-500">
                                                                    {log.resource_type}
                                                                </span>
                                                            </td>
                                                            <td className="p-3.5 pr-4 leading-relaxed text-gray-600">{log.message}</td>
                                                        </tr>
                                                    ))}
                                                    {auditLogs.length === 0 && (
                                                        <tr><td colSpan={5} className="text-center py-10 text-gray-500 font-bold italic">No audit trail records found</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Pagination */}
                            {!logsLoading && logsTotalPages > 1 && (
                                <div className="flex justify-between items-center pt-2">
                                    <p className="text-[11px] font-bold text-gray-400">Page {logsPage} of {logsTotalPages}</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => setLogsPage(p => Math.max(p - 1, 1))} disabled={logsPage === 1} className="btn-outline px-4 py-1 text-xs font-bold disabled:opacity-40 bg-white">Previous</button>
                                        <button onClick={() => setLogsPage(p => Math.min(p + 1, logsTotalPages))} disabled={logsPage === logsTotalPages} className="btn-outline px-4 py-1 text-xs font-bold disabled:opacity-40 bg-white">Next</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl">
                                <h4 className="font-extrabold text-blue-950 uppercase text-xs mb-1">Administrator Account Security</h4>
                                <p className="text-xs text-blue-800 leading-relaxed">
                                    Manage your account password access controls here. Ensure you use a strong password that is not reused elsewhere.
                                </p>
                            </div>

                            <form onSubmit={handleSecurityUpdate} className="border border-gray-150 bg-white p-6 rounded-2xl space-y-4 max-w-2xl">
                                <h3 className="font-extrabold text-sm text-primary uppercase border-b pb-2">Change Account Password</h3>
                                <div>
                                    <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Current Password *</label>
                                    <input
                                        type="password"
                                        required
                                        className="input-field max-w-md"
                                        value={securityForm.currentPassword}
                                        onChange={e => setSecurityForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-600 uppercase block mb-1">New Password *</label>
                                    <input
                                        type="password"
                                        required
                                        className="input-field max-w-md"
                                        value={securityForm.newPassword}
                                        onChange={e => setSecurityForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Confirm New Password *</label>
                                    <input
                                        type="password"
                                        required
                                        className="input-field max-w-md"
                                        value={securityForm.confirmPassword}
                                        onChange={e => setSecurityForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                    />
                                </div>

                                <div className="pt-4 border-t flex items-center justify-between">
                                    <p className="text-[10px] text-gray-400 italic">This change takes effect immediately on your next session login.</p>
                                    <button type="submit" disabled={securitySubmitting} className="btn-primary text-xs px-6 py-2">
                                        {securitySubmitting ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Backup & Recovery Tab */}
                    {activeTab === 'backup' && (
                        <div className="space-y-6">
                            <div className="bg-gray-50 border border-gray-150 p-5 rounded-2xl">
                                <h4 className="font-extrabold text-gray-900 text-sm">Database Backup & Recovery Services</h4>
                                <p className="text-xs text-gray-500 mt-1">Download complete JSON records of student rosters, settings, payments, and dues, or restore from a previous JSON file.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="card border p-6 space-y-4 bg-white">
                                    <DownloadIcon className="w-8 h-8 text-primary" />
                                    <div>
                                        <h4 className="font-black text-gray-900 text-sm">Download Full Backup</h4>
                                        <p className="text-xs text-gray-500 mt-1">Exports all MySQL tables as a single JSON file that can be downloaded locally.</p>
                                    </div>
                                    <button onClick={handleDownloadBackup} disabled={backupBusy} className="btn-primary w-full text-xs py-3">
                                        {backupBusy ? 'Generating JSON...' : 'Download Database JSON Backup'}
                                    </button>
                                </div>

                                <div className="card border p-6 space-y-4 bg-red-50/10 border-red-100">
                                    <WrenchIcon className="w-8 h-8 text-rose-600" />
                                    <div>
                                        <h4 className="font-black text-red-950 text-sm">Restore Database Backup</h4>
                                        <p className="text-xs text-red-700 mt-1">Replaces current live data records. Always download a fresh backup first before restoring.</p>
                                    </div>
                                    <input
                                        ref={backupFileRef}
                                        type="file"
                                        accept=".json,application/json"
                                        onChange={e => setBackupFile(e.target.files?.[0] || null)}
                                        className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-rose-50 file:text-rose-700 file:font-bold cursor-pointer"
                                    />
                                    {backupFile && <p className="text-[10px] font-mono text-gray-500">Selected: {backupFile.name}</p>}
                                    <button onClick={handleRestoreBackup} disabled={backupBusy || !backupFile} className="bg-rose-600 hover:bg-rose-700 text-white w-full text-xs py-3 font-bold rounded-xl shadow-lg shadow-rose-600/10 transition-colors uppercase disabled:opacity-40">
                                        {backupBusy ? 'Restoring records...' : 'Restore Selected JSON Backup'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Danger Zone Tab */}
                    {activeTab === 'danger' && (
                        <div className="space-y-6">
                            <div className="p-6 bg-red-50 border border-red-100 rounded-3xl">
                                <h3 className="text-lg font-black text-red-950 uppercase mb-2">Danger Zone: Site Reset</h3>
                                <p className="text-xs text-red-800 leading-relaxed mb-6">
                                    Wiping the portal resets all settings configurations to default values, drops and recreates student roster databases, deletes all digital receipts, and wipes logs.
                                    <span className="font-extrabold underline block mt-2">THIS ACTION IS ABSOLUTELY IRREVERSIBLE AND PERMANENT.</span>
                                </p>
                                <button
                                    type="button"
                                    onClick={triggerResetSite}
                                    disabled={submitting}
                                    className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs px-6 py-3 rounded-xl shadow-lg shadow-red-600/10 transition-colors uppercase"
                                >
                                    Reset UCC DuesPay Portal
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Modal for adding/editing Staff Users */}
            {showUserModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-sm font-black text-primary uppercase">
                                {editingUser ? 'Edit Staff Credentials' : 'Add New Staff User'}
                            </h3>
                            <button onClick={() => setShowUserModal(false)} className="text-gray-400 hover:text-gray-600 font-black text-xl">&times;</button>
                        </div>
                        <form onSubmit={handleCreateOrUpdateUser} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    disabled={!!editingUser}
                                    className="input-field"
                                    value={userForm.email}
                                    onChange={e => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                                    {editingUser ? 'New Password (leave empty to keep current)' : 'Account Password'}
                                </label>
                                <input
                                    type="password"
                                    required={!editingUser}
                                    className="input-field"
                                    value={userForm.password}
                                    onChange={e => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Role / Permission Group</label>
                                <select
                                    className="input-field text-sm py-2 font-bold"
                                    value={userForm.role}
                                    onChange={e => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                                >
                                    <option value="treasurer">Treasurer</option>
                                    <option value="financial_secretary">Financial Secretary</option>
                                    <option value="president">President</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowUserModal(false)} className="btn-secondary text-xs px-5 py-2">Cancel</button>
                                <button type="submit" disabled={submitting} className="btn-primary text-xs px-5 py-2">
                                    {submitting ? 'Saving...' : 'Save User Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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
                                <button type="submit" disabled={submitting} className="btn-primary text-xs px-5 py-2">
                                    {submitting ? 'Sending...' : 'Broadcast'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Expandable context modal for Raw JSON logs */}
            {selectedLogContext && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
                    onClick={() => setSelectedLogContext(null)}
                >
                    <div 
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
                            <h3 className="text-xs font-extrabold text-primary uppercase">Log Raw Context</h3>
                            <button onClick={() => setSelectedLogContext(null)} className="text-gray-400 hover:text-gray-600 font-black text-xl">&times;</button>
                        </div>
                        <div className="p-6">
                            <pre className="bg-gray-950 text-green-400 p-5 rounded-2xl text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                                {JSON.stringify(selectedLogContext, null, 2)}
                            </pre>
                        </div>
                        <div className="p-6 border-t bg-gray-50 flex justify-end">
                            <button onClick={() => setSelectedLogContext(null)} className="btn-secondary text-xs px-6 py-2">Close Viewer</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal for Danger Zone System Reset */}
            {showResetModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-red-100 animate-in zoom-in-95 duration-200">
                        {/* Red warning header bar */}
                        <div className="bg-gradient-to-r from-red-50 to-rose-50 p-6 border-b border-red-100 flex items-start gap-4">
                            <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
                                <ExclamationIcon className="w-8 h-8" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-base font-black text-red-950 uppercase tracking-wide">
                                    Critical System Reset
                                </h3>
                                <p className="text-[11px] font-bold text-red-600 uppercase tracking-widest mt-0.5">
                                    Irreversible Operation
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowResetModal(false)} 
                                className="text-red-400 hover:text-red-700 transition-colors font-black text-xl leading-none"
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleResetSubmit} className="p-6 space-y-6">
                            {/* Danger warnings box */}
                            <div className="p-4 bg-red-50/50 rounded-2xl border border-red-100 space-y-2">
                                <p className="text-xs text-red-900 leading-relaxed font-bold">
                                    You are about to initiate a complete system wipe. This operation will:
                                </p>
                                <ul className="list-disc list-inside text-[11px] text-red-800 space-y-1 pl-1">
                                    <li>Restore all configurations and settings to default values.</li>
                                    <li>Drop and recreate the student roster database (deleting all students).</li>
                                    <li>Erase all payment history, receipt logs, and financial records.</li>
                                    <li>Clear all audit logs, system events, and SMS delivery reports.</li>
                                </ul>
                                <p className="text-[11px] font-extrabold text-red-700 pt-1">
                                    Warning: There is no undo. Please ensure you have downloaded a database backup first.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1">
                                        Administrator Password
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        className="input-field"
                                        placeholder="Enter your password to authorize"
                                        value={resetPassword}
                                        onChange={e => setResetPassword(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1">
                                        Double Confirmation
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        className="input-field"
                                        placeholder="Type 'RESET EVERYTHING' to confirm"
                                        value={resetConfirmText}
                                        onChange={e => setResetConfirmText(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Actions footer */}
                            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setShowResetModal(false)} 
                                    className="btn-secondary text-xs px-6 py-3 font-bold rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={submitting} 
                                    className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-extrabold text-xs px-6 py-3 rounded-xl shadow-lg shadow-red-600/20 transition-all uppercase tracking-wider disabled:opacity-50"
                                >
                                    {submitting ? 'Resetting Portal...' : 'Wipe and Reset Portal'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function SettingsWorkspacePage() {
    return (
        <AdminLayout title="System Administration">
            <Suspense fallback={
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                </div>
            }>
                <SettingsWorkspaceContent />
            </Suspense>
        </AdminLayout>
    );
}
