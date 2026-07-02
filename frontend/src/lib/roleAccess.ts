export type AppRole = 'student' | 'admin' | 'president' | 'treasurer' | 'financial_secretary' | string;

export const ROLE_LABELS: Record<string, string> = {
  admin: 'System Admin',
  president: 'President',
  treasurer: 'Treasurer',
  financial_secretary: 'Financial Secretary',
  student: 'Student'
};

export const getRoleLabel = (role?: AppRole | null) => {
  if (!role) return 'User';
  return ROLE_LABELS[role] || role.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};

export const isAdminRole = (role?: AppRole | null) => ['admin', 'president', 'treasurer', 'financial_secretary'].includes(role || '');
export const isSystemAdmin = (role?: AppRole | null) => role === 'admin';
export const isPresident = (role?: AppRole | null) => role === 'president';
export const isTreasurer = (role?: AppRole | null) => role === 'treasurer';
export const isFinancialSecretary = (role?: AppRole | null) => role === 'financial_secretary';

export const canViewStudents = (role?: AppRole | null) => ['admin', 'president', 'financial_secretary'].includes(role || '');
export const canImportStudents = (role?: AppRole | null) => ['admin', 'president'].includes(role || '');
export const canViewClearance = (role?: AppRole | null) => ['admin', 'president', 'financial_secretary', 'treasurer'].includes(role || '');

export const canManageDues = (role?: AppRole | null) => ['admin', 'president', 'treasurer'].includes(role || '');
export const canViewPayments = (role?: AppRole | null) => ['admin', 'president', 'treasurer', 'financial_secretary'].includes(role || '');
export const canViewReports = (role?: AppRole | null) => ['admin', 'president', 'treasurer'].includes(role || '');

export const canUseBulkSms = (role?: AppRole | null) => ['admin', 'president', 'financial_secretary'].includes(role || '');
export const canViewAuditLog = (role?: AppRole | null) => ['admin', 'president'].includes(role || '');
export const canUseBackup = (role?: AppRole | null) => ['admin', 'president'].includes(role || '');
export const canManageTeam = (role?: AppRole | null) => role === 'admin';
export const canManageSettings = (role?: AppRole | null) => ['admin', 'president'].includes(role || '');

export const getRoleDashboardDescription = (role?: AppRole | null) => {
  switch (role) {
    case 'treasurer':
      return 'Finance workspace for dues, collections, pending payments, and reports.';
    case 'financial_secretary':
      return 'Records workspace for students, payments, receipts, and clearance tracking.';
    case 'president':
      return 'Leadership overview for students, finance, communication, and system settings.';
    case 'admin':
      return 'Full system administration workspace with all management tools.';
    default:
      return 'Dashboard overview for your permitted system tools.';
  }
};
