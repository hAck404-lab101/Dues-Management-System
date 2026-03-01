# UCC Departmental Dues Management System - Setup Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- npm or yarn package manager
- Paystack account (for payment processing)

## Installation Steps

### 1. Clone/Download the Project

Navigate to the project directory:
```bash
cd "C:\Users\Hp\Documents\BBB\SOZO 2\LivingS"
```

### 2. Install Dependencies

Install root dependencies:
```bash
npm install
```

Install backend dependencies:
```bash
cd backend
npm install
```

Install frontend dependencies:
```bash
cd ../frontend
npm install
```

Or use the convenience script:
```bash
npm run install:all
```

### 3. Database Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE ucc_dues_db;
```

2. Configure database connection in `backend/.env`:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/ucc_dues_db
```

3. Run database migrations:
```bash
cd backend
npm run migrate
```

4. Seed default admin users:
```bash
npm run seed
```

Default admin credentials:
- Email: `admin@ucc.edu.gh`
- Password: `Admin123!`

### 4. Backend Configuration

Create `backend/.env` file with the following variables:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/ucc_dues_db
JWT_SECRET=your-super-secret-jwt-key-change-in-production
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

**Important:** 
- Replace `your-super-secret-jwt-key-change-in-production` with a strong random string
- Get your Paystack keys from https://dashboard.paystack.com/#/settings/developer
- For Gmail, use an App Password (not your regular password)

### 5. Frontend Configuration

Create `frontend/.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key
```

### 6. Create Required Directories

```bash
mkdir -p backend/uploads
mkdir -p backend/receipts
```

### 7. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Usage

### Student Registration & Login

1. Visit http://localhost:3000
2. Click "Register as Student" or go to `/register`
3. Fill in student details and create account
4. Login with your credentials

### Admin Login

1. Visit http://localhost:3000/admin/login
2. Login with admin credentials:
   - Email: `admin@ucc.edu.gh`
   - Password: `Admin123!`

### Making Payments

**Online Payment (Paystack):**
1. Go to Student Dashboard
2. Click "Make Payment" on any due
3. Enter amount
4. Click "Pay Online"
5. Complete payment on Paystack

**Manual Payment:**
1. Go to Student Dashboard
2. Click "Make Payment" on any due
3. Select payment method (MTN MoMo, Vodafone Cash, etc.)
4. Upload proof of payment
5. Submit for admin approval

### Admin Functions

- **Manage Students:** View, add, edit, activate/deactivate students
- **Manage Dues:** Create dues, assign to students (by level/programme/year)
- **Approve Payments:** Review and approve/reject manual payments
- **View Reports:** Generate reports on payments, defaulters, revenue
- **View Analytics:** Dashboard with charts and statistics

## Paystack Webhook Setup

1. Go to Paystack Dashboard > Settings > Webhooks
2. Add webhook URL: `http://your-domain.com/api/payments/webhook`
3. Copy the webhook secret and add to `backend/.env` as `PAYSTACK_WEBHOOK_SECRET`

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Verify database exists

### Payment Issues
- Verify Paystack keys are correct
- Check webhook configuration
- Ensure BASE_URL is set correctly

### Email Issues
- For Gmail, enable 2FA and create App Password
- Check EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS

### Port Already in Use
- Change PORT in `backend/.env` if 5000 is taken
- Update `NEXT_PUBLIC_API_URL` in `frontend/.env.local` accordingly

## Production Deployment

1. Set `NODE_ENV=production` in backend `.env`
2. Use strong `JWT_SECRET`
3. Use production Paystack keys
4. Configure proper database connection
5. Set up SSL/HTTPS
6. Configure proper CORS origins
7. Set up proper file storage (S3, etc.)
8. Configure production email service

## Support

For issues or questions, refer to the main README.md file.

