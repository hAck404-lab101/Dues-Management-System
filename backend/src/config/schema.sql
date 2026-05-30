-- HTU Departmental Dues Management System Database Schema (MySQL)

-- Users table (for authentication)
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'admin', 'treasurer', 'financial_secretary', 'president') NOT NULL,
    student_id VARCHAR(50) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Academic years table
CREATE TABLE IF NOT EXISTS academic_years (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(20) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Programmes table
CREATE TABLE IF NOT EXISTS programmes (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    code VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36),
    student_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    level INT NOT NULL,
    programme VARCHAR(255) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    phone_number VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Dues table
CREATE TABLE IF NOT EXISTS dues (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    deadline DATE,
    late_fee DECIMAL(10, 2) DEFAULT 0.00,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Due assignments (many-to-many: dues to students)
CREATE TABLE IF NOT EXISTS due_assignments (
    id CHAR(36) PRIMARY KEY,
    due_id CHAR(36) NOT NULL,
    student_id CHAR(36) NOT NULL,
    level INT,
    programme VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    status ENUM('unpaid', 'partial', 'paid') DEFAULT 'unpaid',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_assignment (due_id, student_id),
    FOREIGN KEY (due_id) REFERENCES dues(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id CHAR(36) PRIMARY KEY,
    student_id CHAR(36) NOT NULL,
    due_id CHAR(36) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    service_fee DECIMAL(10, 2) DEFAULT 0.00,
    payment_method ENUM('paystack', 'mtn_momo', 'vodafone_cash', 'airteltigo', 'bank_transfer', 'cash', 'other') NOT NULL,
    payment_type ENUM('online', 'manual') NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'completed') NOT NULL DEFAULT 'pending',
    paystack_reference VARCHAR(255),
    paystack_transaction_id VARCHAR(255),
    proof_image_url TEXT,
    notes TEXT,
    approved_by CHAR(36),
    approved_at TIMESTAMP NULL,
    rejected_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (due_id) REFERENCES dues(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Receipts table
CREATE TABLE IF NOT EXISTS receipts (
    id CHAR(36) PRIMARY KEY,
    receipt_number VARCHAR(100) UNIQUE NOT NULL,
    student_id CHAR(36) NOT NULL,
    due_id CHAR(36) NOT NULL,
    payment_id CHAR(36),
    amount_paid DECIMAL(10, 2) NOT NULL,
    balance DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    receipt_url TEXT,
    qr_code_data TEXT,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    issued_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (due_id) REFERENCES dues(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
    FOREIGN KEY (issued_by) REFERENCES users(id)
);

-- Settings table used by payment, portal, branding, SMS and email settings
CREATE TABLE IF NOT EXISTS settings (
    id CHAR(36) PRIMARY KEY,
    `key` VARCHAR(100) UNIQUE NOT NULL,
    `value` TEXT,
    category VARCHAR(100) NOT NULL DEFAULT 'sys_general',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id CHAR(36),
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Email notifications table
CREATE TABLE IF NOT EXISTS email_notifications (
    id CHAR(36) PRIMARY KEY,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Backward-compatible schema upgrades for existing databases
ALTER TABLE dues ADD COLUMN late_fee DECIMAL(10, 2) DEFAULT 0.00 AFTER deadline;
ALTER TABLE payments ADD COLUMN service_fee DECIMAL(10, 2) DEFAULT 0.00 AFTER amount;
ALTER TABLE due_assignments ADD COLUMN status ENUM('unpaid', 'partial', 'paid') DEFAULT 'unpaid' AFTER amount;
ALTER TABLE due_assignments ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER assigned_at;

-- Default system settings
INSERT IGNORE INTO settings (id, `key`, `value`, category, description) VALUES
(UUID(), 'payment_service_fee', '0', 'pay_charges', 'Extra service fee added to online payments'),
(UUID(), 'paystack_public_key', '', 'pay_paystack', 'Paystack public key for frontend checkout'),
(UUID(), 'paystack_secret_key', '', 'pay_paystack', 'Encrypted Paystack secret key'),
(UUID(), 'paystack_webhook_secret', '', 'pay_paystack', 'Encrypted Paystack webhook secret'),
(UUID(), 'manual_payment_enabled', 'true', 'pay_manual', 'Allow students to upload manual payment proof'),
(UUID(), 'manual_payment_bank_name', '', 'pay_manual', 'Bank or MoMo name for manual payments'),
(UUID(), 'manual_payment_account_name', '', 'pay_manual', 'Account name for manual payments'),
(UUID(), 'manual_payment_account_number', '', 'pay_manual', 'Account number or MoMo number for manual payments'),
(UUID(), 'student_registration_open', 'true', 'portal', 'Allow students to register from the portal'),
(UUID(), 'active_academic_year', '', 'portal', 'Current academic year'),
(UUID(), 'sms_provider', 'arkesel', 'comm_sms', 'SMS provider name'),
(UUID(), 'sms_api_key', '', 'comm_sms', 'Encrypted SMS provider API key'),
(UUID(), 'sms_sender_id', 'HTU DUES', 'comm_sms', 'SMS sender ID'),
(UUID(), 'sms_payment_template', 'Hello {name}, your payment of GHS {amount} for {due_name} has been received. Receipt: {receipt_no}. Download: {url}', 'comm_sms', 'Payment SMS template'),
(UUID(), 'sms_credentials_template', 'Hello {name}, your student portal login has been reset. Login ID: {login}. Temporary password: {password}. Please change it after login.', 'comm_sms', 'Student credential reset SMS template'),
(UUID(), 'email_host', '', 'comm_email', 'SMTP host'),
(UUID(), 'email_port', '587', 'comm_email', 'SMTP port'),
(UUID(), 'email_user', '', 'comm_email', 'SMTP username'),
(UUID(), 'email_pass', '', 'comm_email', 'Encrypted SMTP password'),
(UUID(), 'email_from', '', 'comm_email', 'Email sender address'),
(UUID(), 'email_from_name', 'HTU Dues Management', 'comm_email', 'Email sender display name'),
(UUID(), 'app_name', 'HTU Dues Management System', 'sys_general', 'Application name'),
(UUID(), 'app_logo', '', 'sys_appearance', 'Primary app logo'),
(UUID(), 'app_logo_secondary', '', 'sys_appearance', 'Secondary app logo'),
(UUID(), 'app_favicon', '', 'sys_appearance', 'Application favicon');

-- Compatibility update for databases that already inserted these settings under older categories
UPDATE settings SET category = 'comm_sms' WHERE `key` IN ('sms_provider', 'sms_api_key', 'sms_sender_id', 'sms_payment_template', 'sms_credentials_template');
UPDATE settings SET category = 'comm_email' WHERE `key` IN ('email_host', 'email_port', 'email_user', 'email_pass', 'email_from', 'email_from_name');

-- Indexes for performance (MySQL doesn't support IF NOT EXISTS for indexes, so migrate.js skips duplicate errors)
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_student_id ON users(student_id);
CREATE INDEX idx_students_student_id ON students(student_id);
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_level ON students(level);
CREATE INDEX idx_students_programme ON students(programme);
CREATE INDEX idx_dues_academic_year ON dues(academic_year);
CREATE INDEX idx_dues_active ON dues(is_active);
CREATE INDEX idx_due_assignments_due_id ON due_assignments(due_id);
CREATE INDEX idx_due_assignments_student_id ON due_assignments(student_id);
CREATE INDEX idx_due_assignments_status ON due_assignments(status);
CREATE INDEX idx_payments_student_id ON payments(student_id);
CREATE INDEX idx_payments_due_id ON payments(due_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_receipts_student_id ON receipts(student_id);
CREATE INDEX idx_receipts_receipt_number ON receipts(receipt_number);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
