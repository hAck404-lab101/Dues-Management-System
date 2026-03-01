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
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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

-- Indexes for performance (MySQL doesn't support IF NOT EXISTS for indexes, so we'll handle errors)
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
CREATE INDEX idx_payments_student_id ON payments(student_id);
CREATE INDEX idx_payments_due_id ON payments(due_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_receipts_student_id ON receipts(student_id);
CREATE INDEX idx_receipts_receipt_number ON receipts(receipt_number);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
