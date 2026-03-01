# MySQL Setup Guide for HTU Dues Management System

## Quick Setup Steps

### 1. Install MySQL
- Download MySQL from https://dev.mysql.com/downloads/mysql/
- Or use XAMPP/WAMP which includes MySQL
- Make sure MySQL service is running

### 2. Create Database in MySQL

**Option A: Using MySQL Command Line**
```bash
mysql -u root -p
CREATE DATABASE htu_dues_db;
EXIT;
```

**Option B: Using MySQL Workbench or phpMyAdmin**
1. Open MySQL Workbench or phpMyAdmin
2. Create a new database named `htu_dues_db`
3. Set collation to `utf8mb4_unicode_ci` (recommended)

### 3. Configure Backend .env File

Create `backend/.env` with MySQL connection:

```env
PORT=5000
NODE_ENV=development

# MySQL Connection (Option 1: Using DATABASE_URL)
DATABASE_URL=mysql://root:yourpassword@localhost:3306/htu_dues_db

# OR MySQL Connection (Option 2: Individual parameters)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=htu_dues_db

JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=7d
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key
PAYSTACK_WEBHOOK_SECRET=your_paystack_webhook_secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
UPLOAD_DIR=./uploads
```

**Important Notes:**
- Replace `yourpassword` with your MySQL root password
- If no password, use empty string: `mysql://root:@localhost:3306/htu_dues_db`
- Default MySQL port is `3306`

### 4. Install MySQL Dependencies

```bash
cd backend
npm install
```

This will install `mysql2` package (replaces `pg`).

### 5. Run Database Migrations

```bash
cd backend
npm run migrate
```

This creates all the tables in your MySQL database.

### 6. Seed Default Admin Users

```bash
cd backend
npm run seed
```

This creates default admin accounts:
- Email: `admin@htu.edu.gh`
- Password: `Admin123!`

### 7. Start Backend Server

```bash
cd backend
npm run dev
```

You should see:
```
Connected to MySQL database
Server running on port 5000
```

## Troubleshooting

### Connection Refused
- Ensure MySQL service is running
- Check MySQL port (default: 3306)
- Verify username and password

### Access Denied
- Check MySQL user permissions
- Try resetting MySQL root password
- Ensure user has CREATE, INSERT, UPDATE, DELETE privileges

### Database Doesn't Exist
- Create database first: `CREATE DATABASE htu_dues_db;`
- Verify database name matches in .env file

### Migration Errors
- Ensure database exists
- Check user has CREATE TABLE permissions
- Review error messages for specific issues

## MySQL vs PostgreSQL Differences

The system has been adapted to work with MySQL:
- UUIDs converted to CHAR(36) with UUID() function
- JSONB converted to JSON
- ILIKE converted to LIKE (case-insensitive by default in MySQL)
- PostgreSQL $1, $2 parameters converted to MySQL ? placeholders
- Automatic conversion handled by database wrapper

## Testing Connection

Test your MySQL connection:
```bash
mysql -u root -p -e "USE htu_dues_db; SHOW TABLES;"
```

Or in MySQL Workbench:
```sql
USE htu_dues_db;
SHOW TABLES;
```

You should see all the tables created by the migration.

