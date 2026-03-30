# Shop Management System

A portable, full-stack business management system for small shops. Supports three business modules — General Store, Barber Shop, and Travel Agency — with shared customer management and credit/debit tracking.

## Features

- **General Store** — record sales and payments for grocery/retail items
- **Barber Shop** — track services, staff, and customer balances
- **Travel Agency** — manage airline tickets with PNR, passport, and travel date info
- **Customer Management** — unified customer database with balance history
- **Udhaar (credit) tracking** — cash/card sales settle immediately; udhaar sales create a debt
- **Reports** — filter transactions by module, customer, and date range; export to CSV
- **JWT authentication** with forced password change on first login

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router 7, Axios |
| Backend | Node.js 22, Express 4 |
| Database | PostgreSQL (portable, bundled) |

## Quick Start (Windows — Portable)

1. Double-click `START_PORTABLE.bat`
2. Wait for the console to show "Shop System Backend Server Started"
3. Open your browser at `http://localhost:3001`
4. Log in with username `admin` — you will be prompted to set a new password on first login

To stop the server, double-click `STOP_PORTABLE.bat`.

## Manual Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 13+

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set DB_PASSWORD, and replace JWT_SECRET with a strong random string
# Generate a secret: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
npm install
node database/setup.js
npm start
```

### Frontend

```bash
cd frontend
npm install
npm start
```

The frontend runs on port 3001 by default, the backend on port 3000.

## Environment Variables (`backend/.env`)

| Variable | Description |
|---|---|
| `PORT` | Backend port (default: 3000) |
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port |
| `DB_USER` | PostgreSQL user |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_NAME` | Database name |
| `JWT_SECRET` | Secret for signing JWT tokens — **must be 32+ random characters** |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins (e.g. `http://localhost:3001`) |

## API Endpoints

All endpoints except `POST /api/auth/login` require an `Authorization: Bearer <token>` header.

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Login |
| PUT | `/api/auth/change-password` | Change password |
| GET | `/api/customers` | List customers (paginated, searchable) |
| POST | `/api/customers` | Create customer |
| GET | `/api/customers/:id` | Get customer with transaction history |
| PUT | `/api/customers/:id` | Update customer |
| DELETE | `/api/customers/:id` | Delete customer and all their transactions |
| POST | `/api/transactions` | Create transaction |
| GET | `/api/transactions/module/:module` | List transactions for a module |
| PUT | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |
| GET | `/api/transactions/reports/transactions` | Filtered report (module, customer, date range) |
| GET | `/api/transactions/reports/daily-summary` | Daily summary grouped by module |
| GET | `/api/transactions/reports/outstanding` | Customers with outstanding balances |

## Security

- Default admin password (`admin123`) must be changed on first login — enforced by the system
- Set a strong `JWT_SECRET` before running in any non-development environment
- Set `ALLOWED_ORIGINS` to your specific frontend URL in production
- Login is rate-limited to 10 attempts per 15 minutes per IP
