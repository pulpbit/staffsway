# Staffsway — Manpower Staffing HRMS

A complete HRMS + Attendance + Payroll management application for manpower staffing companies. Built as a demo for Prime Workforce Solutions.

## Features

- **Dashboard** — KPI cards, attendance trends, payroll history, employee distribution charts
- **Employee Management** — Full CRUD, search/filter/sort/pagination, activation/deactivation
- **Client Management** — Clients with sites, employee count per client/site
- **Site Management** — Multi-location support per client, supervisor assignment
- **Monthly Attendance** — Bulk entry sheet (present/absent/paid leave/unpaid leave/OT hours per employee per month); lock/unlock month
- **Payroll** — Generate from attendance + salary structures; configurable PF, ESIC, Professional Tax; review, finalize, mark paid
- **Salary Slips** — Auto-generated on payroll finalize; printable with company/employee/earnings/deductions breakdown
- **Reports** — 8 report types (employee, attendance, payroll register, salary, by-client, by-site, OT, status) with CSV export
- **Settings** — Company profile, payroll configuration (salary basis days, PF rate/cap, ESIC rate/cap, PT), leave types, shift types, user management

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 6, TypeScript, Tailwind CSS v4, React Router, TanStack Query, Recharts, Lucide Icons, Sonner toasts |
| Backend | Cloudflare Workers, Hono 4, Zod validation |
| Database | Cloudflare D1 (SQLite) |
| Deployment | Cloudflare Pages (frontend) + Cloudflare Workers (backend) |
| CI/CD | GitHub Actions |

## Project Structure

```
/
  DESIGN.md           # Design system specification
  assets/             # Logo and favicon files
  frontend/           # React SPA
    src/
      components/ui/  # Design system components (Button, Table, Modal, etc.)
      features/       # Page components by module
      services/       # API client layer
      context/        # Auth context
      utils/          # Formatters, CSV export
      layouts/        # AppLayout (sidebar + topbar + mobile drawer)
  backend/            # Cloudflare Worker
    src/
      routes/         # API route handlers
      services/       # Payroll engine
      middleware/     # Auth middleware
      utils/          # Password hashing, token helpers
      types.ts        # Shared TypeScript types
    migrations/        # D1 schema
    db/               # Seed SQL
    scripts/          # Seed data generator
```

## Quick Start (Local Development)

### Prerequisites

- Node.js 22+
- npm 11+
- A Cloudflare account (only needed for deployment; local dev works without)

### 1. Backend setup

```bash
cd backend
npm install
npm run db:setup    # Applies migrations + seeds demo data
npm run dev         # Starts wrangler dev server on :8787
```

### 2. Frontend setup

```bash
cd frontend
npm install
npm run dev         # Starts Vite dev server on :5173 (proxies /api to :8787)
```

### 3. Open the app

Visit **http://localhost:5173**

### Demo credentials

```
Email:    admin@primeworkforce.in
Password: Demo@123
```

## Demo Data

The seed script populates:

| Entity | Count |
|---|---|
| Users (admin) | 1 |
| Clients | 4 (ABC Facility Services, Metro Mall Management, SecureTech Industries, Greenfield Hospital) |
| Sites | 10 |
| Employees | 38 (35 active, 3 inactive) |
| Salary structures | 38 |
| July 2026 attendance | 35 records (finalized) |
| August 2026 attendance | 35 records (draft) |
| July 2026 payroll | Paid (₹4.41L net) |
| August 2026 payroll | Draft (₹4.86L gross) |
| July 2026 salary slips | 35 |

All employee names, designations, salaries, and attendance figures are realistic Indian staffing data.

## Cloudflare Deployment

### Prerequisites

1. Create a Cloudflare account
2. Install wrangler globally: `npm install -g wrangler`
3. Login: `wrangler login`

### Backend (Workers + D1)

```bash
cd backend

# Create remote D1 database
wrangler d1 create staffsway-demo
# Copy the returned database_id into wrangler.toml (replace the placeholder UUID)

# Apply migrations to remote database
wrangler d1 migrations apply staffsway-demo --remote

# Seed remote database
wrangler d1 execute staffsway-demo --remote --file=./db/seed.sql

# Deploy worker
wrangler deploy
```

### Frontend (Pages)

```bash
cd frontend

# Build
npm run build

# Create Pages project (first time only)
wrangler pages project create staffsway

# Deploy
wrangler pages deploy dist --project-name staffsway
```

### GitHub Actions

Add these secrets to your repository:

| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | API token with Workers + Pages permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

The workflow in `.github/workflows/deploy.yml` will deploy on every push to `main`.

### Environment Variables

**Frontend:** For production, set `VITE_API_URL` in Cloudflare Pages to your Worker's URL. By default, the API is accessed from the same origin (proxy in dev, or relative path if both on same domain).

**Backend:** Set `AUTH_SECRET` as a Cloudflare Worker secret (`wrangler secret put AUTH_SECRET`) for production token signing. A demo fallback is used in development.

## Payroll Configuration

Payroll calculations are fully configurable through the Settings page. The engine is in `backend/src/services/payroll.ts`:

| Parameter | Default | Description |
|---|---|---|
| Salary Basis Days | 26 | Per-day rate divisor |
| PF Rate | 12% | Employee PF contribution rate |
| PF Cap | ₹1,800 | Maximum monthly PF |
| PF Eligibility | ₹15,000 | Maximum gross for PF applicability |
| ESIC Rate | 0.75% | Employee ESIC contribution rate |
| ESIC Eligibility | ₹21,000 | Maximum gross for ESIC applicability |
| Professional Tax | ₹200 | Flat amount (above ₹10,000 gross) |
| Default OT Rate | ₹80/hr | Fallback overtime rate |

**Important:** These are demo configuration values. Adjust them to match your client's actual statutory requirements.

## Assumptions Made

1. **Indian locale** — ₹ currency, PF/ESIC/Professional Tax, Indian demo data. Company is India-based staffing firm.
2. **Monthly attendance only** — No daily punch-in/punch-out. Attendance is entered as a monthly summary per employee (present days, absent days, paid leave, unpaid leave, OT hours).
3. **Configurable payroll** — Statutory figures are demo placeholders. The engine is designed for easy customization.
4. **Simple auth** — HMAC-signed stateless tokens (demo-grade). Swap for Clerk/Auth0 in production.
5. **26-day salary basis** — Default per-day rate uses 26 working days (adjustable in Settings).

## Recommended Client Questions

After demoing, ask:

1. **Payroll rules** — What are your exact PF rates, caps, and eligibility rules? ESIC applicable? Professional tax slabs?
2. **Salary basis** — Do you use 26 working days, 30 calendar days, or something else?
3. **OT calculation** — Is OT calculated per-hour or per-day? Multiplier? Different rates for different shifts?
4. **Attendance** — Any fields needed beyond present/absent/leave/OT? Half-days? Late marks?
5. **Reports** — Any specific statutory reports required (ESIC return, PF challan, etc.)?
6. **Authentication** — Single admin or multiple users with role-based access?
7. **Document management** — Need digital storage for employee documents?
