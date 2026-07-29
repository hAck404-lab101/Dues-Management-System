require('dotenv').config();
const { pool } = require('./database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const createTemporaryPassword = () => crypto.randomBytes(12).toString('base64url');

const STAFF_ACCOUNTS = [
  {
    label: 'System Admin',
    role: 'admin',
    email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com',
    password: process.env.DEFAULT_ADMIN_PASSWORD || process.env.DEFAULT_STAFF_PASSWORD
  },
  {
    label: 'President',
    role: 'president',
    email: process.env.DEFAULT_PRESIDENT_EMAIL || 'president@example.com',
    password: process.env.DEFAULT_PRESIDENT_PASSWORD || process.env.DEFAULT_STAFF_PASSWORD
  },
  {
    label: 'Treasurer',
    role: 'treasurer',
    email: process.env.DEFAULT_TREASURER_EMAIL || 'treasurer@example.com',
    password: process.env.DEFAULT_TREASURER_PASSWORD || process.env.DEFAULT_STAFF_PASSWORD
  },
  {
    label: 'Financial Secretary',
    role: 'financial_secretary',
    email: process.env.DEFAULT_FINANCIAL_SECRETARY_EMAIL || 'fsecretary@example.com',
    password: process.env.DEFAULT_FINANCIAL_SECRETARY_PASSWORD || process.env.DEFAULT_STAFF_PASSWORD
  }
];

async function upsertStaffAccount(connection, account) {
  const password = account.password || createTemporaryPassword();
  const hashedPassword = await bcrypt.hash(password, 10);

  await connection.query(
    `INSERT INTO users (id, email, password_hash, role, is_active)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       password_hash = VALUES(password_hash),
       role = VALUES(role),
       is_active = VALUES(is_active)`,
    [uuidv4(), account.email, hashedPassword, account.role, true]
  );

  return password;
}

const permissionsList = [
  { key: 'payments.approve', desc: 'Approve manual payments' },
  { key: 'payments.reject', desc: 'Reject manual payments' },
  { key: 'payments.record_manual', desc: 'Record a manual payment entry' },
  { key: 'payments.view_all', desc: 'View all payment transactions' },
  { key: 'payments.resend_receipt', desc: 'Resend payment receipt' },
  { key: 'payments.reconcile', desc: 'Perform payment reconciliation' },
  { key: 'refunds.initiate', desc: 'Request/initiate transaction refund' },
  { key: 'refunds.approve', desc: 'Co-sign and approve refund requests' },
  { key: 'reminders.send', desc: 'Send dues outstanding reminders' },
  { key: 'reports.export', desc: 'Export system revenue and defaulters reports' },
  { key: 'dashboard.executive', desc: 'Access executive analytics overview' },
  { key: 'announcements.create', desc: 'Compose announcement draft' },
  { key: 'announcements.publish', desc: 'Publish announcements to users' },
  { key: 'audit_logs.view_all', desc: 'Access all administrative logs' },
  { key: 'audit_logs.view_own', desc: 'Access own audit trail log history' },
  { key: 'students.import', desc: 'Bulk import student roster rosters' },
  { key: 'students.edit', desc: 'Edit individual student records' },
  { key: 'students.view', desc: 'View student profile rosters' },
  { key: 'dues.create', desc: 'Create new dues categories' },
  { key: 'dues.edit', desc: 'Modify existing dues prices and schedules' },
  { key: 'dues.assign', desc: 'Allocate dues to students' },
  { key: 'dues.view', desc: 'View dues lists' },
  { key: 'users.create', desc: 'Create new staff members' },
  { key: 'users.edit', desc: 'Modify existing staff accounts' },
  { key: 'users.deactivate', desc: 'Soft-deactivate staff credentials' },
  { key: 'users.reset_password', desc: 'Trigger manual password reset for staff' },
  { key: 'settings.read', desc: 'Read settings profiles' },
  { key: 'settings.write', desc: 'Change general portal configuration settings' },
  { key: 'settings.write_financial', desc: 'Manage payment gateway configuration details' },
  { key: 'settings.write_integrations', desc: 'Manage Brevo/SMS/Turnstile keys' },
  { key: 'settings.write_branding', desc: 'Manage appearance and logo configurations' },
  { key: 'system_logs.view', desc: 'View raw system application debug logs' }
];

const rolePermissionsMatrix = {
  admin: [
    'payments.approve', 'payments.reject', 'payments.record_manual', 'payments.view_all',
    'payments.resend_receipt', 'payments.reconcile', 'refunds.initiate', 'refunds.approve',
    'reminders.send', 'reports.export', 'dashboard.executive', 'announcements.create',
    'announcements.publish', 'audit_logs.view_all', 'audit_logs.view_own', 'students.import',
    'students.edit', 'students.view', 'dues.create', 'dues.edit', 'dues.assign', 'dues.view',
    'users.create', 'users.edit', 'users.deactivate', 'users.reset_password', 'settings.read',
    'settings.write', 'settings.write_financial', 'settings.write_integrations', 'settings.write_branding',
    'system_logs.view'
  ],
  treasurer: [
    'payments.approve', 'payments.reject', 'payments.view_all', 'payments.resend_receipt',
    'reminders.send', 'reports.export', 'audit_logs.view_own', 'students.view', 'dues.view',
    'settings.read'
  ],
  financial_secretary: [
    'payments.record_manual', 'payments.view_all', 'payments.resend_receipt', 'payments.reconcile',
    'refunds.initiate', 'reminders.send', 'reports.export', 'audit_logs.view_own', 'students.view',
    'dues.view', 'settings.read', 'settings.write_financial'
  ],
  president: [
    'payments.view_all', 'refunds.approve', 'reports.export', 'dashboard.executive',
    'announcements.create', 'announcements.publish', 'audit_logs.view_all', 'audit_logs.view_own',
    'students.view', 'dues.view', 'settings.read'
  ]
};

async function seed() {
  let connection;
  try {
    connection = await pool.getConnection();

    console.log('Repairing staff accounts...');
    for (const account of STAFF_ACCOUNTS) {
      const password = await upsertStaffAccount(connection, account);
      console.log(`${account.label} (${account.role})`);
      console.log(`Email: ${account.email}`);
      console.log(`Password: ${password}`);
    }
    
    // 2. Seed Role Permissions
    console.log('Seeding role-permission matrix...');
    for (const [role, perms] of Object.entries(rolePermissionsMatrix)) {
      for (const permKey of perms) {
        await connection.query(
          'INSERT INTO role_permissions (role, permission_key) VALUES (?, ?)',
          [role, permKey]
        );
      }
    }
    
    // 3. Seed Staff Users
    console.log('Seeding staff user accounts...');
    const staffAccounts = [
      { email: 'admin@example.com', role: 'admin' },
      { email: 'treasurer@example.com', role: 'treasurer' },
      { email: 'fsecretary@example.com', role: 'financial_secretary' },
      { email: 'president@example.com', role: 'president' }
    ];
    
    let adminUserId = null;
    for (const staff of staffAccounts) {
      const staffId = uuidv4();
      if (staff.role === 'admin') adminUserId = staffId;
      await connection.query(
        'INSERT INTO users (id, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)',
        [staffId, staff.email, staffPassword, staff.role, true]
      );
    }
    
    // 4. Seed Academic Years & Programmes
    const academicYears = ['2023/2024', '2024/2025', '2025/2026'];
    for (const year of academicYears) {
      await connection.query(
        'INSERT IGNORE INTO academic_years (id, name, is_active) VALUES (?, ?, ?)',
        [uuidv4(), year, year === '2024/2025']
      );
    }
    
    const programmes = [
      { name: 'Computer Science', code: 'CS' },
      { name: 'Information Technology', code: 'IT' },
      { name: 'Software Engineering', code: 'SE' }
    ];
    for (const prog of programmes) {
      await connection.query(
        'INSERT IGNORE INTO programmes (id, name, code, is_active) VALUES (?, ?, ?, ?)',
        [uuidv4(), prog.name, prog.code, true]
      );
    }
    
    // 5. Generate dynamic timestamp suffix for uniqueness
    const suffix = Date.now().toString().slice(-6);
    
    // 6. Seed Students (Roster Data decoupled from users)
    console.log('Seeding student roster data...');
    const studentRecords = [];
    const levels = [100, 200, 300, 400];
    

    console.log('Staff credentials repaired successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
}

seed();
