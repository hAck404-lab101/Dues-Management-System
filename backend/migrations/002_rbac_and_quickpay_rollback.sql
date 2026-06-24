-- DuesPay v2 Database Migration Rollback (MySQL)
-- 002_rbac_and_quickpay_rollback.sql

-- 10. Remove Paystack columns from payments
ALTER TABLE payments DROP INDEX uniq_paystack_reference;
ALTER TABLE payments DROP COLUMN payer_phone;
ALTER TABLE payments DROP COLUMN payer_email;
ALTER TABLE payments DROP COLUMN approval_source;

-- 9. Drop System Logs table
DROP TABLE IF EXISTS system_logs;

-- 8. Remove locked price columns from due_assignments and drop price history
ALTER TABLE due_assignments DROP FOREIGN KEY fk_assignments_price_history;
ALTER TABLE due_assignments DROP COLUMN price_history_id;
ALTER TABLE due_assignments DROP COLUMN locked_amount;
DROP TABLE IF EXISTS due_price_history;

-- 7. Restore Settings table shape (approximate)
ALTER TABLE settings DROP PRIMARY KEY;
ALTER TABLE settings ADD COLUMN id CHAR(36) NOT NULL FIRST;
-- Assign random UUIDs to id for settings rows
UPDATE settings SET id = UUID() WHERE id IS NULL;
ALTER TABLE settings ADD PRIMARY KEY (id);
ALTER TABLE settings MODIFY COLUMN category VARCHAR(100) NOT NULL DEFAULT 'sys_general';
ALTER TABLE settings ADD COLUMN description TEXT AFTER category;
ALTER TABLE settings ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER description;
ALTER TABLE settings ADD UNIQUE KEY `key` (`key`);
ALTER TABLE settings DROP COLUMN updated_by;

-- 6. Drop announcements table
DROP TABLE IF EXISTS announcements;

-- 5. Drop quick pay lookups table
DROP TABLE IF EXISTS quick_pay_lookups;

-- 4. Drop refund requests table
DROP TABLE IF EXISTS refund_requests;

-- 3. Drop permissions and role permissions tables
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;

-- 2. Restore user roles
ALTER TABLE users MODIFY COLUMN role ENUM('student', 'admin', 'treasurer', 'financial_secretary', 'president') NOT NULL;

-- 1. Restore students user linkage
ALTER TABLE students ADD COLUMN user_id CHAR(36) NULL AFTER id;
ALTER TABLE students ADD CONSTRAINT students_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE students DROP INDEX uniq_students_id_card_number;
ALTER TABLE students DROP COLUMN roster_phone;
ALTER TABLE students DROP COLUMN roster_email;
ALTER TABLE students DROP COLUMN id_card_number;
