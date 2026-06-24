require('dotenv').config();
const { pool } = require('./database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

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
    const staffPassword = await bcrypt.hash('Admin123!', 10);
    
    console.log('Clearing old database tables for fresh seed...');
    await connection.query('DELETE FROM receipts');
    await connection.query('DELETE FROM payments');
    await connection.query('DELETE FROM due_assignments');
    await connection.query('DELETE FROM due_price_history');
    await connection.query('DELETE FROM dues');
    await connection.query('DELETE FROM students');
    await connection.query('DELETE FROM announcements');
    await connection.query('DELETE FROM refund_requests');
    await connection.query('DELETE FROM role_permissions');
    await connection.query('DELETE FROM permissions');
    await connection.query('DELETE FROM users');
    
    // 1. Seed Permissions
    console.log('Seeding permissions list...');
    for (const perm of permissionsList) {
      await connection.query(
        'INSERT INTO permissions (id, `key`, description) VALUES (?, ?, ?)',
        [uuidv4(), perm.key, perm.desc]
      );
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
    

    
    for (let i = 1; i <= 5; i++) {
      const studentId = uuidv4();
      const indexNum = `0409${suffix}${i}`;
      const email = `student${i}_${suffix}@example.com`;
      const level = levels[i % levels.length];
      const programme = programmes[i % programmes.length].name;
      
      await connection.query(
        `INSERT INTO students (id, student_id, id_card_number, full_name, email, roster_email, level, programme, academic_year, phone_number, roster_phone, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [studentId, indexNum, indexNum, `Dummy Student ${i}`, email, email, level, programme, '2024/2025', `024000${suffix.slice(-4)}`, `024000${suffix.slice(-4)}`, true]
      );
      
      studentRecords.push({ id: studentId, name: `Dummy Student ${i}`, level, programme });
    }
    
    // 7. Seed Dues & Price History
    console.log('Seeding dues and pricing records...');
    await connection.query('DELETE FROM due_price_history');
    await connection.query('DELETE FROM dues');
    
    const duesList = [
      { id: uuidv4(), name: `Departmental Dues (${suffix})`, amount: 150.00, year: '2024/2025' },
      { id: uuidv4(), name: `SRC Dues (${suffix})`, amount: 50.00, year: '2024/2025' },
      { id: uuidv4(), name: `Association Dues (${suffix})`, amount: 80.00, year: '2024/2025' }
    ];
    
    for (const due of duesList) {
      // Insert baseline due
      await connection.query(
        `INSERT INTO dues (id, name, amount, academic_year, deadline, description, is_active, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [due.id, due.name, due.amount, due.year, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'Sample dues generated by seed script', true, adminUserId]
      );
      
      // Insert initial price history
      await connection.query(
        `INSERT INTO due_price_history (id, due_id, amount, effective_from, changed_by, reason) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?)`,
        [uuidv4(), due.id, due.amount, adminUserId, 'Initial price seeding']
      );
    }
    
    // 8. Assign Dues to Students
    console.log('Seeding due assignments...');
    const assignments = [];
    for (const student of studentRecords) {
      for (const due of duesList) {
        const assignmentId = uuidv4();
        
        // Fetch active history ID
        const [historyRows] = await connection.query('SELECT id FROM due_price_history WHERE due_id = ? LIMIT 1', [due.id]);
        const historyId = historyRows[0]?.id || null;
        
        await connection.query(
          `INSERT INTO due_assignments (id, due_id, locked_amount, price_history_id, student_id, level, programme, amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [assignmentId, due.id, due.amount, historyId, student.id, student.level, student.programme, due.amount, 'unpaid']
        );
        assignments.push({ id: assignmentId, due_id: due.id, student_id: student.id, amount: due.amount });
      }
    }
    
    // 9. Seed Payments & Receipts (using payments structure)
    console.log('Seeding mock payment records...');
    
    // Student 1: Paid Departmental Dues fully (online via Paystack)
    const payment1Id = uuidv4();
    await connection.query(
      `INSERT INTO payments (id, student_id, due_id, amount, service_fee, payment_method, payment_type, status, paystack_reference, approval_source, payer_email, payer_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [payment1Id, studentRecords[0].id, duesList[0].id, duesList[0].amount, 0, 'paystack', 'online', 'completed', `REF_SEED_${suffix}_1`, 'paystack_webhook', 'payer@example.com', '0240000001']
    );
    await connection.query(
      `UPDATE due_assignments SET status = 'paid' WHERE student_id = ? AND due_id = ?`,
      [studentRecords[0].id, duesList[0].id]
    );
    await connection.query(
      `INSERT INTO receipts (id, receipt_number, student_id, due_id, payment_id, amount_paid, balance, total_amount, issued_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), `REC-${suffix}-1`, studentRecords[0].id, duesList[0].id, payment1Id, duesList[0].amount, 0, duesList[0].amount, adminUserId]
    );
    
    // Student 2: Pending manual payment for SRC Dues
    const payment2Id = uuidv4();
    await connection.query(
      `INSERT INTO payments (id, student_id, due_id, amount, service_fee, payment_method, payment_type, status, notes, payer_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [payment2Id, studentRecords[1].id, duesList[1].id, duesList[1].amount, 0, 'mtn_momo', 'manual', 'pending', 'Paid via MoMo, waiting approval', 'payer2@example.com']
    );
    
    // Student 3: Rejected manual payment for Association Dues
    const payment3Id = uuidv4();
    await connection.query(
      `INSERT INTO payments (id, student_id, due_id, amount, service_fee, payment_method, payment_type, status, notes, rejected_reason, approved_by, approval_source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [payment3Id, studentRecords[2].id, duesList[2].id, duesList[2].amount, 0, 'bank_transfer', 'manual', 'rejected', 'Bank transfer', 'Proof image was blurry and unreadable', adminUserId, 'manual_admin']
    );
    
    console.log('Database seeding completed successfully!');
    console.log(`Staff Credentials: email: admin|treasurer|fsecretary|president@example.com, password: Admin123!`);
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
}

seed();