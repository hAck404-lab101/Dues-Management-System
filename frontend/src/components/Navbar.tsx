'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { logout } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { useState, useEffect, type ReactNode } from 'react';
import {
  HomeIcon, WalletIcon, ReceiptIcon, ProfileIcon, ChartIcon, UsersIcon,
  LandmarkIcon, CardIcon, FileChartIcon, SettingsIcon, ImportIcon,
  CertificateIcon, SmsIcon, ShieldIcon, GroupIcon, LockClosedIcon
} from '@/components/Icons';
import {
  getRoleLabel,
  canViewStudents,
  canImportStudents,
  canViewClearance,
  canManageDues,
  canViewPayments,
  canViewReports,
  canUseBulkSms,
  canViewAuditLog,
  canUseBackup,
  canManageTeam,
  canManageSettings
} from '@/lib/roleAccess';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { appName, appLogo, appLogoSecondary } = useBranding();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => { setIsClient(true); }, []);
  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
      router.push('/');
      router.refresh();
    }
  };

  const isAuthPage = pathname === '/login' || pathname === '/admin/login';
  const isAdminRoute = pathname.startsWith('/admin');
  const authenticated = isClient && !!user;
  const role = user?.role;
  const roleLabel = getRoleLabel(role);

  if (isAuthPage || isAdminRoute) return null;

  const showStudentsGroup = canViewStudents(role) || canImportStudents(role) || canViewClearance(role);
  const showFinanceGroup = canManageDues(role) || canViewPayments(role) || canViewReports(role);
  const showSystemGroup = canUseBulkSms(role) || canViewAuditLog(role) || canManageSettings(role) || canUseBackup(role) || canManageTeam(role) || role !== 'student';

  return (
    <nav className="bg-primary text-white shadow-xl sticky top-0 z-[100]">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16 sm:h-20">
          <Link href={authenticated ? (role === 'student' ? '/student/dashboard' : '/admin/dashboard') : '/'} className="flex items-center gap-2 sm:gap-3 group min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-secondary rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform overflow-hidden">
                {appLogo ? (
                  <img src={appLogo.startsWith('http') ? appLogo : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${appLogo}`} alt="Primary Logo" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                )}
              </div>

              {appLogoSecondary && (
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform overflow-hidden">
                  <img src={appLogoSecondary.startsWith('http') ? appLogoSecondary : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${appLogoSecondary}`} alt="Secondary Logo" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <span className="text-base sm:text-xl font-extrabold tracking-tight hidden sm:block truncate max-w-[180px] lg:max-w-none">{appName}</span>
          </Link>

          <div className="hidden lg:flex items-center space-x-1">
            {showNavLinks && (
              <>
                {role === 'student' ? (
                  <>
                    <NavLink href="/student/dashboard" icon={<HomeIcon />} label="Dashboard" active={pathname === '/student/dashboard'} />
                    <NavLink href="/student/payments" icon={<WalletIcon />} label="Payments" active={pathname === '/student/payments'} />
                    <NavLink href="/student/receipts" icon={<ReceiptIcon />} label="Receipts" active={pathname === '/student/receipts'} />
                    <NavLink href="/student/profile" icon={<ProfileIcon />} label="Profile" active={pathname === '/student/profile'} />
                  </>
                ) : (
                  <>
                    <NavLink href="/admin/dashboard" icon={<ChartIcon />} label={`${roleLabel} Dashboard`} active={pathname === '/admin/dashboard'} />

                    {showStudentsGroup && (
                      <NavDropdown label="Records" icon={<UsersIcon />} active={pathname.includes('/admin/students') || pathname.includes('/admin/import') || pathname.includes('/admin/clearance')}>
                        {canViewStudents(role) && <DropdownItem href="/admin/students" icon={<UsersIcon />} label="Student Records" active={pathname === '/admin/students'} />}
                        {canImportStudents(role) && <DropdownItem href="/admin/import" icon={<ImportIcon />} label="Bulk Import" active={pathname === '/admin/import'} />}
                        {canViewClearance(role) && <DropdownItem href="/admin/clearance" icon={<CertificateIcon />} label="Clearance" active={pathname === '/admin/clearance'} />}
                      </NavDropdown>
                    )}

                    {showFinanceGroup && (
                      <NavDropdown label="Finance" icon={<LandmarkIcon />} active={pathname.includes('/admin/dues') || pathname.includes('/admin/payments') || pathname.includes('/admin/reports')}>
                        {canManageDues(role) && <DropdownItem href="/admin/dues" icon={<LandmarkIcon />} label="Manage Dues" active={pathname === '/admin/dues'} />}
                        {canViewPayments(role) && <DropdownItem href="/admin/payments" icon={<CardIcon />} label="Payments" active={pathname === '/admin/payments'} />}
                        {canViewReports(role) && <DropdownItem href="/admin/reports" icon={<FileChartIcon />} label="Reports" active={pathname === '/admin/reports'} />}
                      </NavDropdown>
                    )}

                    {showSystemGroup && (
                      <NavDropdown label="Workspace" icon={<SettingsIcon />} active={pathname.includes('/admin/bulk-sms') || pathname.includes('/admin/audit-log') || pathname.includes('/admin/team') || pathname.includes('/admin/settings') || pathname.includes('/admin/security') || pathname.includes('/admin/backup')}>
                        {canUseBulkSms(role) && <DropdownItem href="/admin/bulk-sms" icon={<SmsIcon />} label="Bulk SMS" active={pathname === '/admin/bulk-sms'} />}
                        {canViewAuditLog(role) && <DropdownItem href="/admin/audit-log" icon={<ShieldIcon />} label="Audit Log" active={pathname === '/admin/audit-log'} />}
                        <DropdownItem href="/admin/security" icon={<LockClosedIcon />} label="Account Security" active={pathname === '/admin/security'} />
                        {canUseBackup(role) && <DropdownItem href="/admin/backup" icon={<ShieldIcon />} label="Backup & Recovery" active={pathname === '/admin/backup'} />}
                        {canManageTeam(role) && <DropdownItem href="/admin/team" icon={<GroupIcon />} label="Team" active={pathname === '/admin/team'} />}
                        {canManageSettings(role) && <DropdownItem href="/admin/settings" icon={<SettingsIcon />} label="Settings" active={pathname === '/admin/settings'} />}
                      </NavDropdown>
                    )}
                  </>
                )}
              </>
            )}
            {!authenticated && (
              <div className="flex items-center gap-4 ml-4">
                <Link href="/login" className="btn-secondary px-6">Login</Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {authenticated && (
              <div className="flex items-center gap-2 sm:gap-3 sm:border-l border-white/10 sm:pl-4">
                <div className="hidden xl:block text-right">
                  <p className="text-xs text-white/60 font-medium uppercase tracking-wider">Signed in as {roleLabel}</p>
                  <p className="text-sm font-bold truncate max-w-[150px]">{user?.email}</p>
                </div>
                <button onClick={handleLogout} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all group" title="Logout">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
              </div>
            )}
            <button className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-all" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] lg:hidden animate-in fade-in duration-200" onClick={() => setMobileMenuOpen(false)} />}

      <div className={`lg:hidden transition-all duration-300 ease-in-out border-t border-white/5 shadow-2xl bg-primary/98 backdrop-blur-2xl fixed left-0 right-0 top-16 sm:top-20 z-[100] ${mobileMenuOpen ? 'max-h-[calc(100dvh-4rem)] sm:max-h-[calc(100dvh-5rem)] opacity-100 visible pointer-events-auto' : 'max-h-0 opacity-0 invisible pointer-events-none overflow-hidden'}`}>
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 overflow-y-auto overscroll-contain max-h-[calc(100dvh-4rem)] sm:max-h-[calc(100dvh-5rem)] space-y-1.5 pb-8">
          {showNavLinks ? (
            <>
              {role === 'student' ? (
                <>
                  <MobileNavItem href="/student/dashboard" label="Dashboard" icon={<HomeIcon />} />
                  <MobileNavItem href="/student/payments" label="Payments" icon={<WalletIcon />} />
                  <MobileNavItem href="/student/receipts" label="Receipts" icon={<ReceiptIcon />} />
                  <MobileNavItem href="/student/profile" label="Profile" icon={<ProfileIcon />} />
                </>
              ) : (
                <>
                  <MobileNavHeader label={roleLabel} />
                  <MobileNavItem href="/admin/dashboard" label="Dashboard" icon={<ChartIcon />} />
                  {showStudentsGroup && <MobileNavHeader label="Records" />}
                  {canViewStudents(role) && <MobileNavItem href="/admin/students" label="Student Records" icon={<UsersIcon />} />}
                  {canImportStudents(role) && <MobileNavItem href="/admin/import" label="Bulk Import" icon={<ImportIcon />} />}
                  {canViewClearance(role) && <MobileNavItem href="/admin/clearance" label="Clearance" icon={<CertificateIcon />} />}
                  {showFinanceGroup && <MobileNavHeader label="Finance" />}
                  {canManageDues(role) && <MobileNavItem href="/admin/dues" label="Dues" icon={<LandmarkIcon />} />}
                  {canViewPayments(role) && <MobileNavItem href="/admin/payments" label="Payments" icon={<CardIcon />} />}
                  {canViewReports(role) && <MobileNavItem href="/admin/reports" label="Reports" icon={<FileChartIcon />} />}
                  {showSystemGroup && <MobileNavHeader label="Workspace" />}
                  {canUseBulkSms(role) && <MobileNavItem href="/admin/bulk-sms" label="Bulk SMS" icon={<SmsIcon />} />}
                  {canViewAuditLog(role) && <MobileNavItem href="/admin/audit-log" label="Audit Log" icon={<ShieldIcon />} />}
                  <MobileNavItem href="/admin/security" label="Account Security" icon={<LockClosedIcon />} />
                  {canUseBackup(role) && <MobileNavItem href="/admin/backup" label="Backup & Recovery" icon={<ShieldIcon />} />}
                  {canManageTeam(role) && <MobileNavItem href="/admin/team" label="Team" icon={<GroupIcon />} />}
                  {canManageSettings(role) && <MobileNavItem href="/admin/settings" label="Settings" icon={<SettingsIcon />} />}
                </>
              )}
            </>
          ) : (
            <>
              <div className="pt-2"><Link href="/login" className="btn-secondary w-full justify-center">Login</Link></div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, icon, label, active }: { href: string; icon: ReactNode; label: string; active: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium ${active ? 'bg-[#DBEAFE] text-[#001150] shadow-lg scale-[1.02]' : 'hover:bg-white/10 text-white/80 hover:text-white'}`}>
      <span className="w-5 h-5">{icon}</span><span>{label}</span>{active && <span className="w-1.5 h-1.5 rounded-full bg-[#0020B2] ml-1" />}
    </Link>
  );
}

function NavDropdown({ label, icon, children, active }: { label: string; icon: ReactNode; children: ReactNode; active: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative group" onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
      <button type="button" className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium ${active ? 'bg-secondary/20 text-white shadow-inner border border-white/20' : 'hover:bg-white/10 text-white/80 hover:text-white'}`}>
        <span className="w-5 h-5">{icon}</span><span>{label}</span><svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {isOpen && <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl py-3 z-[110] border border-gray-100 animate-in fade-in zoom-in-95 duration-200 origin-top"><div className="absolute top-0 left-6 -mt-1.5 w-3 h-3 bg-white rotate-45 border-l border-t border-gray-100" />{children}</div>}
    </div>
  );
}

function DropdownItem({ href, label, icon, active }: { href: string; label: string; icon: ReactNode; active: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-4 py-3 text-sm transition-all ${active ? 'bg-primary/5 text-primary font-bold border-r-4 border-primary' : 'text-gray-600 hover:bg-gray-50 hover:text-primary'}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? 'bg-primary/10' : 'bg-gray-100'}`}><span className="w-4 h-4">{icon}</span></div><span>{label}</span>
    </Link>
  );
}

function MobileNavItem({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  return (
    <Link href={href} className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors min-h-[44px] ${active ? 'bg-[#DBEAFE] text-[#001150] font-bold shadow-md' : 'bg-white/5 text-white/80 hover:bg-white/10'}`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-[#0020B2]/10 text-[#0020B2]' : 'bg-secondary/10 text-white/70'}`}><span className="w-4 h-4">{icon}</span></div>
      <span className="text-sm leading-tight">{label}</span>
    </Link>
  );
}

function MobileNavHeader({ label }: { label: string }) {
  return <div className="text-white/40 text-[9px] font-bold uppercase tracking-widest px-3 pt-3 pb-0.5">{label}</div>;
}
