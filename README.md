# Staffsway — Manpower Staffing HRMS

A complete HRMS + Attendance + Payroll management application for manpower staffing companies. Built as a demo for Staffsway.

## Features

### Core Modules
- **Dashboard** — KPI cards, attendance trends, payroll history, employee distribution charts
- **Employee Management** — Full CRUD, search/filter/sort/pagination, activation/deactivation
- **Client Management** — Clients with sites, employee count per client/site
- **Site Management** — Multi-location support per client, supervisor assignment
- **Monthly Attendance** — Bulk entry sheet (present/absent/paid leave/unpaid leave/OT hours per employee per month); lock/unlock month
- **Payroll** — Generate from attendance + salary structures; configurable PF, ESIC, Professional Tax; review, finalize, mark paid
- **Salary Slips** — Auto-generated on payroll finalize; printable with company/employee/earnings/deductions breakdown
- **Reports** — 8 report types (employee, attendance, payroll register, salary, by-client, by-site, OT, status) with CSV export
- **Settings** — Company profile, payroll configuration (salary basis days, PF rate/cap, ESIC rate/cap, PT), leave types, shift types, user management

### Advanced Modules
- **Compliance & ESS** — Minimum wages, compliance records, attendance regularization, employee self-service (attendance view, leave apply, salary slips, HR requests)
- **Recruitment** — Job openings, candidates, interviews, offer management, onboarding tasks
- **Leave Management** — Leave types with approval workflow (employee → manager → HR), holidays, comp-off, leave encashment, leave balances
- **Payroll Extensions** — Employee loans, full & final settlements, salary revisions
- **Statutory** — PF/ESIC configuration, statutory deductions, employee statutory details

### New Modules (Items 8–15)
- **Performance Management** — KPIs, goals, reviews (360°), feedback, self-appraisals, increment/promotion recommendations, PIPs, history
- **Documents Management** — Text-based document records (type, number, name), employee document tracking, HR verification
- **Asset Management** — Asset catalog (Laptop, Mobile, ID Card, Uniform, Tools, Vehicle), assignment/return/replace workflow, history, summary
- **Training Management** — Training calendar (7 types, 4 modes), assignments, attendance, materials, certifications, skill matrix, feedback
- **Separation / Exit Management** — Resignation/termination workflow (employee → manager → HR → action → closed), exit interviews, clearance checklist, asset returns, no-dues, experience/relieving letters
- **HR Helpdesk** — Employee request system with categories (Salary, Attendance, PF/ESI, Leave, Document, ID Card, Other), priority levels, multi-level approval (Employee → Manager → HR → Action → Closed), comments, internal notes
- **Management Dashboard** — Real-time workforce analytics (employees, present/absent/on-leave, new joinings, resignations, payroll cost, overtime, attrition rate, department manpower, attendance trend, salary cost trend)

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
    migrations/        # D1 schema (0001–0013)
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
Email:    admin@staffsway.in
Password: Demo@123
```

### Important: Running New Migrations

If modules (Performance, Assets, Training, Separation, Helpdesk) show "Failed to load", the migrations haven't been applied yet:

```bash
cd backend
npx wrangler d1 execute staffsway-demo --local --file=./migrations/0008_performance.sql
npx wrangler d1 execute staffsway-demo --local --file=./migrations/0009_documents_ext.sql
npx wrangler d1 execute staffsway-demo --local --file=./migrations/0010_asset_management.sql
npx wrangler d1 execute staffsway-demo --local --file=./migrations/0011_training_management.sql
npx wrangler d1 execute staffsway-demo --local --file=./migrations/0012_separation.sql
npx wrangler d1 execute staffsway-demo --local --file=./migrations/0013_helpdesk.sql
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

## Module Reference

| Module | Route | Backend API | Frontend Page | DB Migration |
|---|---|---|---|---|
| Dashboard | `/` | `GET /api/dashboard/management` | `ManagementDashboardPage.tsx` | — |
| Overview | `/overview` | `GET /api/dashboard` | `DashboardPage.tsx` | — |
| Employees | `/employees` | `GET/POST /api/employees` | `EmployeesPage.tsx` | 0001 |
| Clients | `/clients` | `GET/POST /api/clients` | `ClientsPage.tsx` | 0001 |
| Sites | `/sites` | `GET/POST /api/sites` | `SitesPage.tsx` | 0001 |
| Attendance | `/attendance` | `GET/POST /api/attendance` | `AttendancePage.tsx` | 0001 |
| Recruitment | `/recruitment` | `GET/POST /api/recruitment` | `RecruitmentPage.tsx` | 0004 |
| Leaves | `/leaves` | `GET/POST /api/leaves` | `LeavesPage.tsx` | 0005 |
| Payroll | `/payroll` | `GET/POST /api/payroll` | `PayrollPage.tsx` | 0001, 0006 |
| Salary Slips | `/slips` | `GET /api/slips` | `SalarySlipsPage.tsx` | 0001 |
| Reports | `/reports` | `GET /api/reports` | `ReportsPage.tsx` | — |
| Compliance | `/compliance` | `GET/POST /api/statutory` | `CompliancePage.tsx` | 0002, 0007 |
| Performance | `/performance` | `GET/POST /api/performance` | `PerformancePage.tsx` | 0008 |
| Documents | `/documents` | `GET/POST /api/employees/:id/documents` | `DocumentsPage.tsx` | 0009 |
| Assets | `/assets` | `GET/POST /api/assets` | `AssetsPage.tsx` | 0010 |
| Training | `/training` | `GET/POST /api/training` | `TrainingPage.tsx` | 0011 |
| Separation | `/separation` | `GET/POST /api/separation` | `SeparationPage.tsx` | 0012 |
| HR Helpdesk | `/helpdesk` | `GET/POST /api/helpdesk` | `HelpdeskPage.tsx` | 0013 |
| My Space | `/my` | `GET /api/ess/*` | `MySpacePage.tsx` | 0007 |
| Settings | `/settings` | `GET/POST /api/settings` | `SettingsPage.tsx` | — |

## RBAC (Role-Based Access Control)

| Role | Access |
|---|---|
| `super_admin` | Full access to everything |
| `admin` | Full access except super_admin-only operations |
| `hr` | Employee management, attendance, leaves, compliance, performance, assets, training, separation, helpdesk |
| `payroll` | Payroll, salary slips, advances |
| `manager` | Performance reviews, leave approvals, helpdesk reviews |
| `employee` | My Space (attendance, leave, payslips, profile), helpdesk requests |
| `intern` | Same as employee |

### Write Restrictions

Writes are restricted per module via middleware in `backend/src/index.ts`:
- Master data (employees/clients/sites): `super_admin`, `admin`, `hr`
- Attendance: `super_admin`, `admin`, `hr`, `payroll`
- Payroll/slips: `super_admin`, `admin`, `payroll`
- Performance: `super_admin`, `admin`, `hr`, `manager`
- Assets/training/separation: `super_admin`, `admin`, `hr`
- Helpdesk: all roles (employees can submit requests)

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

## API Endpoints Reference

### Authentication
- `POST /api/auth/login` — Login, returns JWT token
- `GET /api/auth/me` — Current user info
- `POST /api/auth/logout` — Logout

### Dashboard
- `GET /api/dashboard` — Overview dashboard (KPI, charts, recent employees/payroll)
- `GET /api/dashboard/management` — Management dashboard (workforce analytics, trends, attrition)

### Employees
- `GET /api/employees` — List (filterable by status, search, department, designation, site, client)
- `POST /api/employees` — Create employee
- `GET /api/employees/:id` — Employee detail
- `PUT /api/employees/:id` — Update employee
- `POST /api/employees/:id/documents` — Add document record
- `GET /api/employees/:id/statutory` — Statutory details
- `GET /api/employees/:id/revisions` — Salary revision history
- `POST /api/employees/:id/revision` — Add salary revision

### Assets
- `GET /api/assets` — List assets (filter by type, status, search)
- `GET /api/assets/summary` — Summary stats
- `POST /api/assets` — Create asset (auto-generates asset code)
- `PUT /api/assets/:id` — Update asset
- `DELETE /api/assets/:id` — Delete asset
- `POST /api/assets/:id/assign` — Assign to employee
- `POST /api/assets/:id/return` — Return asset
- `POST /api/assets/:id/replace` — Replace with new asset
- `GET /api/assets/assignments/all` — All assignment history

### Training
- `GET /api/training` — List trainings
- `GET /api/training/summary` — Summary stats
- `POST /api/training` — Create training
- `PUT /api/training/:id` — Update training
- `DELETE /api/training/:id` — Delete training
- `POST /api/training/:id/assign` — Assign employees
- `DELETE /api/training/:id/assign/:empId` — Unassign employee
- `POST /api/training/:id/attendance` — Mark attendance
- `POST /api/training/:id/attendance/bulk` — Bulk attendance
- `POST /api/training/:id/materials` — Add material
- `DELETE /api/training/:id/materials/:matId` — Delete material
- `POST /api/training/:id/feedback` — Submit feedback
- `GET /api/training/certifications` — List certifications
- `POST /api/training/certifications` — Add certification
- `DELETE /api/training/certifications/:id` — Delete certification
- `GET /api/training/skills` — List skills
- `GET /api/training/skills/matrix` — Skill matrix view
- `POST /api/training/skills` — Upsert skill
- `DELETE /api/training/skills/:id` — Delete skill
- `GET /api/training/history` — Training history

### Separation
- `GET /api/separation` — List separations
- `GET /api/separation/summary/stats` — Summary stats
- `POST /api/separation` — Create separation request
- `GET /api/separation/:id` — Detail (interview, clearance, assets, dues, letters, settlement)
- `PATCH /api/separation/:id/approve` — Approve
- `PATCH /api/separation/:id/reject` — Reject
- `POST /api/separation/:id/interview` — Save exit interview
- `POST /api/separation/:id/clearance` — Add clearance item
- `PATCH /api/separation/:id/clearance/:itemId` — Toggle clearance
- `DELETE /api/separation/:id/clearance/:itemId` — Delete clearance item
- `POST /api/separation/:id/assets` — Add asset return
- `PATCH /api/separation/:id/assets/:retId` — Update asset return
- `POST /api/separation/:id/no-dues` — Add no-dues
- `PATCH /api/separation/:id/no-dues/:duesId` — Toggle no-dues
- `POST /api/separation/:id/letters` — Generate letter (experience/relieving)
- `DELETE /api/separation/:id/letters/:letterId` — Delete letter

### Helpdesk
- `GET /api/helpdesk` — List requests (filter by status, category, priority, search)
- `GET /api/helpdesk/summary/stats` — Summary stats
- `GET /api/helpdesk/categories` — List categories
- `GET /api/helpdesk/my` — Employee's own requests
- `POST /api/helpdesk` — Create request (HR/admin)
- `POST /api/helpdesk/self` — Employee self-create
- `GET /api/helpdesk/:id` — Detail with comments
- `PATCH /api/helpdesk/:id/manager` — Manager approve/reject
- `PATCH /api/helpdesk/:id/hr` — HR approve/reject
- `PATCH /api/helpdesk/:id/assign` — Assign to someone
- `PATCH /api/helpdesk/:id/action` — Take action & resolve
- `POST /api/helpdesk/:id/comments` — Add comment

### Performance
- `GET /api/performance/kpis` — List KPIs
- `POST /api/performance/kpis` — Create KPI
- `DELETE /api/performance/kpis/:id` — Delete KPI
- `GET /api/performance/goals` — List goals
- `POST /api/performance/goals` — Create goal
- `PATCH /api/performance/goals/:id` — Update goal
- `DELETE /api/performance/goals/:id` — Delete goal
- `GET /api/performance/reviews` — List reviews
- `POST /api/performance/reviews` — Create review
- `PATCH /api/performance/reviews/:id` — Update review
- `GET /api/performance/feedback` — List feedback
- `POST /api/performance/feedback` — Give feedback
- `GET /api/performance/self-appraisals` — List self-appraisals
- `POST /api/performance/self-appraisals` — Submit self-appraisal
- `GET /api/performance/history` — Performance history
- `GET /api/performance/increments` — Increment recommendations
- `POST /api/performance/increments` — Create increment recommendation
- `PATCH /api/performance/increments/:id` — Update increment
- `GET /api/performance/promotions` — Promotion recommendations
- `POST /api/performance/promotions` — Create promotion recommendation
- `PATCH /api/performance/promotions/:id` — Update promotion
- `GET /api/performance/pips` — PIPs
- `POST /api/performance/pips` — Create PIP
- `PATCH /api/performance/pips/:id` — Update PIP
- `GET /api/performance/summary` — Summary stats

## Assumptions Made

1. **Indian locale** — ₹ currency, PF/ESIC/Professional Tax, Indian demo data. Company is India-based staffing firm.
2. **Monthly attendance only** — No daily punch-in/punch-out. Attendance is entered as a monthly summary per employee (present days, absent days, paid leave, unpaid leave, OT hours).
3. **Configurable payroll** — Statutory figures are demo placeholders. The engine is designed for easy customization.
4. **Simple auth** — HMAC-signed stateless tokens (demo-grade). Swap for Clerk/Auth0 in production.
5. **26-day salary basis** — Default per-day rate uses 26 working days (adjustable in Settings).
6. **Documents are text records** — No file upload/storage. Documents are metadata records (type, name, number) only.
7. **Department is a text field** — Not a separate table. Departments are free-form text on the employee record.

## Recommended Client Questions

After demoing, ask:

1. **Payroll rules** — What are your exact PF rates, caps, and eligibility rules? ESIC applicable? Professional tax slabs?
2. **Salary basis** — Do you use 26 working days, 30 calendar days, or something else?
3. **OT calculation** — Is OT calculated per-hour or per-day? Multiplier? Different rates for different shifts?
4. **Attendance** — Any fields needed beyond present/absent/leave/OT? Half-days? Late marks?
5. **Reports** — Any specific statutory reports required (ESIC return, PF challan, etc.)?
6. **Authentication** — Single admin or multiple users with role-based access?
7. **Document management** — Need digital storage for employee documents? (Currently text records only)
8. **Asset types** — What types of assets need tracking? Additional fields beyond brand/model/serial?
9. **Training modes** — Virtual, in-person, hybrid, self-paced? Certification tracking needed?
10. **Separation workflow** — Current: Employee → Manager → HR → Action → Closed. Need adjustments?
