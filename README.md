# UCC Departmental Dues Management System

A secure, transparent digital system for managing, collecting, tracking, and reporting departmental dues/fees for students using Ghanaian Cedi (GHS).

## Features

- **User Authentication**: Role-based access control for Students and Administrators
- **Student Management**: Complete CRUD operations for student profiles
- **Dues Management**: Create, assign, and track departmental dues
- **Payment Processing**: Paystack integration (MTN MoMo, Vodafone Cash, AirtelTigo, Bank Cards)
- **Manual Payments**: Upload proof of payment with admin approval workflow
- **Receipt Generation**: Automatic PDF receipt generation with QR codes
- **Dashboards**: Separate dashboards for students and administrators
- **Reporting & Analytics**: Comprehensive reports with filtering and export capabilities
- **Audit Logging**: Complete audit trail for all financial transactions

## Tech Stack

### Frontend
- Next.js 14 (React Framework)
- Tailwind CSS
- TypeScript

### Backend
- Node.js
- Express.js
- MySQL
- JWT Authentication

### Payment Gateway
- Paystack (GHS enabled)

## Getting Started

### Prerequisites
- Node.js 18+ 
- MySQL 8.0+ or MariaDB 10.3+
- npm or yarn

### Installation

1. Install all dependencies:
```bash
npm run install:all
```

2. Set up environment variables:

**Backend** (`.env` in `backend/` folder):
```
PORT=5000
NODE_ENV=development
DATABASE_URL=mysql://user:password@localhost:3306/ucc_dues_db
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
BASE_URL=http://localhost:3000
```

**Frontend** (`.env.local` in `frontend/` folder):
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...
```

3. Set up the database:
```bash
cd backend
npm run migrate
npm run seed
```

4. Run the development servers:

Terminal 1 (Backend):
```bash
npm run dev:backend
```

Terminal 2 (Frontend):
```bash
npm run dev:frontend
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Default Admin Credentials

After seeding:
- Email: admin@ucc.edu.gh
- Password: Admin123!

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── types/
│   └── package.json
└── README.md
```

## License

ISC

