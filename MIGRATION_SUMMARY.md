# Migration from PostgreSQL to MySQL - Summary

## Changes Made

### 1. Database Package
- ✅ Replaced `pg` with `mysql2` in `package.json`
- ✅ Added `uuid` package for UUID generation

### 2. Database Configuration (`backend/src/config/database.js`)
- ✅ Updated to use `mysql2/promise` instead of `pg`
- ✅ Created wrapper to convert PostgreSQL syntax to MySQL:
  - `$1, $2, ...` → `?` placeholders
  - `ILIKE` → `LIKE` (case-insensitive by default in MySQL)
  - `RETURNING` clause handling
  - Transaction support (`BEGIN`/`COMMIT`/`ROLLBACK`)

### 3. Database Schema (`backend/src/config/schema.sql`)
- ✅ Converted PostgreSQL syntax to MySQL:
  - `UUID` → `CHAR(36)` (UUIDs generated in application code)
  - `JSONB` → `JSON`
  - `CHECK` constraints (MySQL 8.0+ supports them)
  - `ENUM` types for better data integrity
  - Removed PostgreSQL-specific extensions
  - Updated foreign key syntax
  - `ON UPDATE CURRENT_TIMESTAMP` for auto-updating timestamps

### 4. Migration Script (`backend/src/config/migrate.js`)
- ✅ Updated to handle MySQL statement execution
- ✅ Split SQL statements properly for MySQL

### 5. Seed Script (`backend/src/config/seed.js`)
- ✅ Updated to use MySQL syntax:
  - `ON CONFLICT` → `ON DUPLICATE KEY UPDATE`
  - `$1, $2` → `?` placeholders
  - Direct connection usage for transactions

### 6. Server Configuration (`backend/server.js`)
- ✅ Updated connection check from `pool.connect()` to `pool.getConnection()`

### 7. Controllers
- ✅ Database wrapper automatically handles PostgreSQL → MySQL conversion
- ✅ UUID generation moved to application code (using `uuid` package)
- ✅ Transaction handling updated for MySQL

## Setup Instructions

1. **Install MySQL** (if not already installed)
   - Download from https://dev.mysql.com/downloads/mysql/
   - Or use XAMPP/WAMP

2. **Create Database**
   ```sql
   CREATE DATABASE htu_dues_db;
   ```

3. **Update `.env` file**
   ```env
   DATABASE_URL=mysql://root:yourpassword@localhost:3306/htu_dues_db
   ```
   Or use individual parameters:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=yourpassword
   DB_NAME=htu_dues_db
   ```

4. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

5. **Run Migrations**
   ```bash
   npm run migrate
   ```

6. **Seed Database**
   ```bash
   npm run seed
   ```

7. **Start Server**
   ```bash
   npm run dev
   ```

## Key Differences Handled

| PostgreSQL | MySQL | Solution |
|------------|-------|----------|
| `$1, $2` parameters | `?` placeholders | Auto-converted in wrapper |
| `ILIKE` | `LIKE` | Auto-converted (case-insensitive by default) |
| `RETURNING` clause | `LAST_INSERT_ID()` | Handled in wrapper |
| `UUID()` function | `CHAR(36)` + app code | Generate UUIDs in controllers |
| `JSONB` | `JSON` | Direct conversion |
| `BEGIN`/`COMMIT` | `START TRANSACTION`/`COMMIT` | Handled in wrapper |

## Testing

After migration, test:
1. ✅ Database connection
2. ✅ User registration
3. ✅ User login (both student and admin)
4. ✅ Database queries
5. ✅ Transactions

## Notes

- All existing controllers should work without modification due to the database wrapper
- UUIDs are now generated in application code using the `uuid` package
- MySQL LIKE is case-insensitive by default with `utf8mb4_unicode_ci` collation
- Transactions are properly handled through the connection pool

