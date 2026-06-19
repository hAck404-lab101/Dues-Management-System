'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { logout } from '@/lib/auth';
import {
  ChartIcon, UsersIcon, ImportIcon, CertificateIcon, LandmarkIcon,
  CardIcon, FileChartIcon, SmsIcon, ShieldIcon, LockClosedIcon,
  GroupIcon, SettingsIcon, MenuCollapseIcon, SearchIcon, BellIcon,
  LogoutIcon, SparklesIcon
} from '@/components/Icons';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { appName, appLogo } = useBranding();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (!loading && (!user || user.role === 'student')) {
      router.push('/admin/login');
    }
  }, [user, loading, router]);

  // Close sidebar on mobile when navigating
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (loading || !isClient) return null;
  if (!user || user.role === 'student') return null;

  const canUseBackup = ['admin', 'treasurer', 'president'].includes(user.role);

  return (
    <div className="admin-layout">
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''} lg:hidden`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Left Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Branding Area */}
        <div className="h-24 flex items-center px-8 shrink-0">
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 overflow-hidden shadow-lg">
              {appLogo ? (
                <img src={appLogo.startsWith('http') ? appLogo : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${appLogo}`} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-white text-sm tracking-wider">DM</span>
              )}
            </div>
            <span className="font-bold text-white text-lg truncate">{appName}</span>
          </Link>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 py-4 flex flex-col overflow-y-auto">
          <div className="sidebar-section-label">Menu</div>
          <NavLink href="/admin/dashboard" icon={<ChartIcon />} label="Dashboard" active={pathname === '/admin/dashboard'} />
          
          <div className="sidebar-section-label mt-4">Students</div>
          <NavLink href="/admin/students" icon={<UsersIcon />} label="Student List" active={pathname === '/admin/students'} />
          <NavLink href="/admin/import" icon={<ImportIcon />} label="Bulk Import" active={pathname === '/admin/import'} />
          <NavLink href="/admin/clearance" icon={<CertificateIcon />} label="Clearance" active={pathname === '/admin/clearance'} />
          
          <div className="sidebar-section-label mt-4">Finance</div>
          <NavLink href="/admin/dues" icon={<LandmarkIcon />} label="Manage Dues" active={pathname === '/admin/dues'} />
          <NavLink href="/admin/payments" icon={<CardIcon />} label="Payments" active={pathname === '/admin/payments'} />
          <NavLink href="/admin/reports" icon={<FileChartIcon />} label="Reports" active={pathname === '/admin/reports'} />
          
          <div className="sidebar-section-label mt-4">System</div>
          <NavLink href="/admin/bulk-sms" icon={<SmsIcon />} label="Bulk SMS" active={pathname === '/admin/bulk-sms'} />
          <NavLink href="/admin/audit-log" icon={<ShieldIcon />} label="Audit Log" active={pathname === '/admin/audit-log'} />
          <NavLink href="/admin/security" icon={<LockClosedIcon />} label="Security" active={pathname === '/admin/security'} />
          {canUseBackup && <NavLink href="/admin/backup" icon={<ShieldIcon />} label="Backup & Recovery" active={pathname === '/admin/backup'} />}
          {user.role === 'admin' && <NavLink href="/admin/team" icon={<GroupIcon />} label="Team" active={pathname === '/admin/team'} />}
          <NavLink href="/admin/settings" icon={<SettingsIcon />} label="Settings" active={pathname === '/admin/settings'} />
          <button 
            onClick={handleLogout} 
            className="sidebar-item mt-auto mb-4 text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors"
          >
            <span className="w-5 h-5"><LogoutIcon /></span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-content">
        {/* Top Header */}
        <header className="admin-header">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleSidebar}
              className="lg:hidden w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-500 hover:text-primary transition-colors"
            >
              <span className="w-6 h-6"><MenuCollapseIcon /></span>
            </button>
            
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 hidden sm:block">{title || 'Admin Dashboard'}</h1>
              <p className="text-sm font-medium text-gray-500 hidden sm:block">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Action Buttons as White Circles */}
            <button className="hidden md:flex w-12 h-12 rounded-full bg-white shadow-sm items-center justify-center text-gray-600 hover:text-primary transition-colors hover:shadow-md">
              <span className="w-5 h-5"><SearchIcon /></span>
            </button>

            <button className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-600 hover:text-primary transition-colors hover:shadow-md relative">
              <span className="w-5 h-5"><BellIcon /></span>
              <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
            </button>

            {/* Profile */}
            <div className="flex items-center gap-3 bg-white rounded-full p-1.5 pr-4 shadow-sm border border-gray-50 cursor-pointer hover:shadow-md transition-shadow">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm overflow-hidden">
                <img src={`https://ui-avatars.com/api/?name=${user.email?.split('@')[0]}&background=0B3C5D&color=fff`} alt="Profile" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-bold text-gray-900 leading-tight">{user.email?.split('@')[0]}</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{user.role.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="admin-main">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavLink({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link href={href} className={`sidebar-item ${active ? 'active' : ''}`}>
      <span className="w-5 h-5">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
