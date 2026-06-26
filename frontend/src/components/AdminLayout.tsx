'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { logout } from '@/lib/auth';
import Loader from '@/components/Loader';
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

let hasHydrated = false;

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading, hasPermission } = useAuth();
  const { appName, appLogo } = useBranding();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  // Start as hydrated if we already have done so (subsequent navigations), to prevent skeleton flash
  const [isClient, setIsClient] = useState(hasHydrated);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.profile-dropdown-container')) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsClient(true);
    hasHydrated = true;
    if (!loading && (!user || user.role === 'student')) {
      router.push('/admin/login');
    }
  }, [user, loading, router]);

  // Close sidebar on mobile when navigating
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
      window.location.href = '/';
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-10 shadow-[0_8px_30px_rgba(0,0,0,0.015),0_30px_60px_rgba(0,0,0,0.015)] border border-gray-100 flex items-center justify-center">
          <Loader />
        </div>
      </div>
    );
  }

  if (!isClient) {
    return (
      <div className="admin-layout">
        <aside className="admin-sidebar collapsed">
          <div className="h-24 flex items-center px-8 shrink-0 branding-area">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0" />
          </div>
        </aside>
        <div className="admin-content">
          <header className="admin-header flex justify-between items-center px-8 h-20 bg-white border-b border-gray-100">
            <div className="h-6 w-32 bg-gray-100 animate-pulse rounded-lg" />
            <div className="h-9 w-24 bg-gray-100 animate-pulse rounded-full" />
          </header>
          <main className="admin-main p-8 bg-neutral/30 min-h-[calc(100vh-5rem)]">
            <div className="space-y-6 animate-pulse">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 bg-white rounded-3xl p-6 border border-gray-100/50" />
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }
  if (!user || user.role === 'student') return null;

  let dashboardHref = '/dashboard';
  if (user.role === 'admin') dashboardHref = '/dashboard/admin';
  else if (user.role === 'treasurer') dashboardHref = '/dashboard/treasurer';
  else if (user.role === 'financial_secretary') dashboardHref = '/dashboard/financial-secretary';
  else if (user.role === 'president') dashboardHref = '/dashboard/president';

  return (
    <div className="admin-layout">
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''} lg:hidden`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Left Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Branding Area */}
        <div className="h-24 flex items-center px-8 shrink-0 branding-area">
          <Link href={dashboardHref} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 overflow-hidden shadow-lg">
              {appLogo ? (
                <img src={appLogo.startsWith('http') ? appLogo : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${appLogo}`} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-white text-sm tracking-wider">DM</span>
              )}
            </div>
            <span className="font-bold text-white text-lg truncate logo-text">{appName}</span>
          </Link>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 py-4 flex flex-col overflow-y-auto space-y-1">
          <NavLink href={dashboardHref} icon={<ChartIcon />} label="Dashboard" active={pathname === dashboardHref} />
          
          {(hasPermission('students.view') || hasPermission('students.edit')) && (
            <>
              {hasPermission('students.view') && <NavLink href="/admin/students" icon={<UsersIcon />} label="Student List" active={pathname === '/admin/students'} />}
              {hasPermission('students.view') && <NavLink href="/admin/clearance" icon={<CertificateIcon />} label="Clearance" active={pathname === '/admin/clearance'} />}
            </>
          )}
          
          {(hasPermission('dues.view') || hasPermission('payments.view_all') || hasPermission('reports.export')) && (
            <>
              {hasPermission('dues.view') && <NavLink href="/dashboard/admin/settings/dues" icon={<LandmarkIcon />} label="Manage Dues" active={pathname === '/dashboard/admin/settings/dues'} />}
              {hasPermission('payments.view_all') && <NavLink href="/admin/payments" icon={<CardIcon />} label="Payments" active={pathname === '/admin/payments'} />}
              {hasPermission('reports.export') && <NavLink href="/admin/reports" icon={<FileChartIcon />} label="Reports" active={pathname === '/admin/reports'} />}
            </>
          )}
          
          {(hasPermission('reminders.send') || (hasPermission('users.edit') && user.role === 'admin')) && (
            <>
              {hasPermission('reminders.send') && <NavLink href="/admin/communications" icon={<SmsIcon />} label="Communications" active={pathname === '/admin/communications'} />}
              {hasPermission('users.edit') && user.role === 'admin' && <NavLink href="/admin/users" icon={<UsersIcon />} label="Users" active={pathname === '/admin/users'} />}
              {user.role === 'admin' && <NavLink href="/dashboard/admin/settings" icon={<SettingsIcon />} label="Settings" active={pathname === '/dashboard/admin/settings'} />}
            </>
          )}
        </div>

        {/* Collapse Button */}
        <div className="p-4 border-t border-white/5 shrink-0 hidden lg:block">
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
            className="sidebar-item w-full flex items-center gap-3 hover:bg-white/5 transition-colors duration-200 justify-start mx-0 my-0 py-2.5 px-4"
          >
            <span className="w-5 h-5 transition-transform duration-200 shrink-0" style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'none' }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </span>
            <span className="sidebar-label text-sm">Collapse Menu</span>
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
                {isClient ? new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}
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
            <div className="relative profile-dropdown-container">
              <div 
                className="flex items-center gap-3 bg-white rounded-full p-1.5 pr-4 shadow-sm border border-gray-50 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm overflow-hidden">
                  {isClient && user && user.email ? (
                    <img src={`https://ui-avatars.com/api/?name=${user.email.split('@')[0]}&background=0B3C5D&color=fff`} alt="Profile" />
                  ) : (
                    <div className="w-9 h-9 bg-gray-200 animate-pulse rounded-full" />
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-bold text-gray-900 leading-tight">
                    {isClient && user && user.email ? user.email.split('@')[0] : '...'}
                  </p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                    {isClient && user ? user.role.replace('_', ' ') : '...'}
                  </p>
                </div>
              </div>

              {/* Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <Link 
                    href="/dashboard/admin/settings" 
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    <span className="w-4 h-4"><SettingsIcon /></span>
                    Settings
                  </Link>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                  >
                    <span className="w-4 h-4"><LogoutIcon /></span>
                    Logout
                  </button>
                </div>
              )}
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
      <span className="w-5 h-5 shrink-0">{icon}</span>
      <span className="sidebar-label">{label}</span>
    </Link>
  );
}
