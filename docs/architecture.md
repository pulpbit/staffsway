# Architecture

```
Browser SPA (React 18 + Vite + Tailwind v4)
        │  fetch /api/*, Bearer token
        ▼
Cloudflare Worker — Hono 4 (backend/)
        │  Zod validation per route
        ▼
D1 SQLite (staffsway-demo)          — single datastore (text/metadata only,
                                      no file storage by product decision)
```

## Backend
- `src/index.ts` — Hono app; `authMiddleware` guards all `/api/*` except `/api/auth/login`; CORS.
- Routes mirror modules: `auth`, `dashboard`, `employees` (incl. per-employee documents CRUD),
  `clients`, `sites`, `attendance`, `payroll`, `advances`, `slips`, `reports`, `settings`.
- `src/services/payroll.ts` — pure calculation engine (`calculatePayroll`) taking attendance rows,
  salary components and **per-employee statutory flags**. No globals, fully unit-testable.
- `src/utils/token.ts` — removed. Auth is now:
  - `src/utils/jwt.ts` — real HS256 JWTs (header.payload.signature, base64url) with `exp` checks;
    secret from `SESSION_SECRET` (Worker secret in prod, `.dev.vars` locally, ≥32 chars enforced).
  - `src/utils/hash.ts` — PBKDF2-SHA256 password hashing (100k iterations, per-user salt,
    constant-time compare). Legacy salted-SHA-256 demo hashes verify and are transparently
    re-hashed on next successful login (`needsRehash` upgrade path).
  - `middleware/auth.ts` — `authMiddleware` verifies the Bearer JWT; `requireRole(...roles)`
    guards writes centrally from `index.ts` (master data: hr+; attendance: hr/payroll;
    payroll, slips & advances: payroll; settings/users & deletes: admin). Login is throttled
    in-memory (10 failures / 5 min / IP+email — per-isolate best effort).

## Frontend
- React Router feature pages under `src/features/*`; TanStack Query for data; Sonner toasts; Recharts charts.
- Design tokens live in `src/index.css` `@theme` (navy/gold brand palette from logo).
- API layer: thin typed wrappers in `src/services/api.ts`.

## Data flow rules
- Payroll reads **finalized** attendance only for finalization-grade runs (draft runs allowed for preview).
- Every payroll item persists its inputs (days, rates, gross, each deduction) — full auditability,
  no recomputation needed to explain a payslip.
- Statutory flags are read at calculation time from `employee_statutory` with fallback to legacy
  salary-structure flags for pre-migration records.

## Deployment topology
- Worker: `staffsway-backend` via wrangler (GH Actions).
- SPA: Cloudflare Pages (`frontend/`), `/api/*` proxied to the worker route/domain.

See also: database.md, payroll-rules.md, deployment.md.
