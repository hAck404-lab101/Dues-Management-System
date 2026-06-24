-- DuesPay v2 Database Migration (MySQL)
-- 002_rbac_and_quickpay.sql

-- 1. Decouple students from users
ALTER TABLE students ADD COLUMN id_card_number VARCHAR(50) NULL AFTER student_id;
UPDATE students SET id_card_number = student_id WHERE id_card_number IS NULL;
ALTER TABLE students MODIFY COLUMN id_card_number VARCHAR(50) NOT NULL;
ALTER TABLE students ADD UNIQUE KEY uniq_students_id_card_number (id_card_number);

ALTER TABLE students ADD COLUMN roster_email VARCHAR(255) NULL AFTER email;
ALTER TABLE students ADD COLUMN roster_phone VARCHAR(20) NULL AFTER phone_number;

-- Drop foreign key constraint first
ALTER TABLE students DROP FOREIGN KEY students_ibfk_1;

-- Clean up student users from auth table
DELETE FROM users WHERE role = 'student';

-- Drop the deprecated user_id column from students table
ALTER TABLE students DROP COLUMN user_id;

-- 2. Modify user roles (staff-only)
ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'treasurer', 'financial_secretary', 'president') NOT NULL;

-- 3. Create permissions and role_permissions tables
CREATE TABLE IF NOT EXISTS permissions (
    id CHAR(36) PRIMARY KEY,
    `key` VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role VARCHAR(50) NOT NULL,
    permission_key VARCHAR(100) NOT NULL,
    PRIMARY KEY (role, permission_key)
);

-- 4. Create refund requests table (co-signed)
CREATE TABLE IF NOT EXISTS refund_requests (
    id CHAR(36) PRIMARY KEY,
    payment_id CHAR(36) NOT NULL,
    requested_by CHAR(36) NOT NULL,
    reason TEXT,
    amount DECIMAL(12,2) NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'executed') NOT NULL DEFAULT 'pending',
    approved_by CHAR(36) NULL,
    approved_at TIMESTAMP NULL,
    executed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- 5. Create public quick-pay lookups table
CREATE TABLE IF NOT EXISTS quick_pay_lookups (
    id CHAR(36) PRIMARY KEY,
    index_number_attempted VARCHAR(50) NOT NULL,
    ip VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id CHAR(36) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    created_by CHAR(36) NOT NULL,
    audience ENUM('all_staff', 'level_100', 'level_200', 'level_300', 'level_400', 'custom') NOT NULL DEFAULT 'all_staff',
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. Consolidate Settings table shape
-- Drop unique index on key
ALTER TABLE settings DROP INDEX `key`;

-- Drop ID primary key
ALTER TABLE settings DROP PRIMARY KEY;

-- Modify column definitions to match the requested shape
ALTER TABLE settings MODIFY COLUMN category VARCHAR(50) NOT NULL;
ALTER TABLE settings MODIFY COLUMN `key` VARCHAR(100) NOT NULL;

-- Set new primary key
ALTER TABLE settings ADD PRIMARY KEY (category, `key`);

-- Add updated_by column (nullable CHAR(36))
ALTER TABLE settings ADD COLUMN updated_by CHAR(36) NULL AFTER `value`;

-- Drop unused fields
ALTER TABLE settings DROP COLUMN id;
ALTER TABLE settings DROP COLUMN description;
ALTER TABLE settings DROP COLUMN created_at;

-- 8. Price history and lock
CREATE TABLE IF NOT EXISTS due_price_history (
    id CHAR(36) PRIMARY KEY,
    due_id CHAR(36) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    effective_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    changed_by CHAR(36) NOT NULL,
    reason TEXT,
    FOREIGN KEY (due_id) REFERENCES dues(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id)
);
CREATE INDEX idx_due_effective ON due_price_history (due_id, effective_from);

-- Alter due_assignments to add locked price columns
ALTER TABLE due_assignments ADD COLUMN locked_amount DECIMAL(12,2) NULL AFTER due_id;
ALTER TABLE due_assignments ADD COLUMN price_history_id CHAR(36) NULL AFTER locked_amount;

-- Backfill locked_amount from dues
UPDATE due_assignments da
INNER JOIN dues d ON da.due_id = d.id
SET da.locked_amount = d.amount;

-- Modify locked_amount to NOT NULL
ALTER TABLE due_assignments MODIFY COLUMN locked_amount DECIMAL(12,2) NOT NULL;

-- Backfill price history for existing dues
-- Select one staff user to associate history with if d.created_by is null
INSERT INTO due_price_history (id, due_id, amount, effective_from, changed_by, reason)
SELECT UUID(), d.id, d.amount, COALESCE(d.created_at, CURRENT_TIMESTAMP), COALESCE(d.created_by, (SELECT id FROM users WHERE role IN ('admin', 'president') LIMIT 1), (SELECT id FROM users LIMIT 1)), 'Initial price backfill'
FROM dues d;

-- Map assignments to the initial price history row
UPDATE due_assignments da
INNER JOIN due_price_history h ON da.due_id = h.due_id
SET da.price_history_id = h.id;

-- Add foreign key constraint
ALTER TABLE due_assignments ADD CONSTRAINT fk_assignments_price_history FOREIGN KEY (price_history_id) REFERENCES due_price_history(id) ON DELETE SET NULL;

-- 9. Create System Logs table
CREATE TABLE IF NOT EXISTS system_logs (
    id CHAR(36) PRIMARY KEY,
    category ENUM(
        'payment',
        'webhook',
        'email',
        'sms',
        'auth',
        'public_access',
        'job',
        'error',
        'integration'
    ) NOT NULL,
    level ENUM('debug', 'info', 'warn', 'error', 'critical') NOT NULL DEFAULT 'info',
    event VARCHAR(100) NOT NULL,
    message TEXT,
    context JSON,
    related_payment_id CHAR(36) NULL,
    related_user_id CHAR(36) NULL,
    related_student_id CHAR(36) NULL,
    ip VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category_created (category, created_at),
    INDEX idx_level_created (level, created_at),
    INDEX idx_event (event),
    INDEX idx_related_payment (related_payment_id)
);

-- 10. Add Paystack automation columns to payments table
-- Clean up empty strings in paystack_reference to prevent unique key conflicts
UPDATE payments SET paystack_reference = NULL WHERE paystack_reference = '';

ALTER TABLE payments ADD COLUMN approval_source ENUM('paystack_webhook', 'manual_treasurer', 'manual_admin') NULL AFTER approved_by;
ALTER TABLE payments ADD COLUMN payer_email VARCHAR(255) NULL AFTER approval_source;
ALTER TABLE payments ADD COLUMN payer_phone VARCHAR(20) NULL AFTER payer_email;
ALTER TABLE payments ADD UNIQUE KEY uniq_paystack_reference (paystack_reference);
