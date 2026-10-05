# Architecture

```
Browser SPA (React 18 + Vite + Tailwind v4)
        │  fetch /api/*, Bearer token
        ▼
Cloudflare Worker — Hono 4 (backend/)
        │  Zod validation per route
        ▼
D1 SQLite (staffsway-db)          — single datastore (text/metadata only,
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
- API layer: thin typed wrappers in `src/services/api.ts`.
- Shared UI kit in `src/components/ui/*` (`layout`, `data`, `fields`, `actions`,
  `overlay`, `drawer`, `state`, `validation`, `status`, `skeleton`). Feature pages
  compose these; they should not hand-roll tables, modals, or form grids.

### Design language
One palette across the app, derived from the login page + management dashboard:
- Surfaces: white cards, `rounded-2xl`, `border-slate-200/80`, `shadow-xs`, on `bg-slate-50/80`.
- Accent: blue (`blue-600`) for primary action/active state; slate for structure.
- Status: soft tinted badges (`emerald` / `amber` / `rose` / `slate`), never solid fills.
- Type: compact uppercase `text-[11px] font-bold tracking-wider` labels; tabular
  numerals for money, dates, and counts.
- The older `ink` / `body` / `mute` / `hairline` / `card-shadow` / `mono-label`
  tokens are **retired**. Do not reintroduce them.

### Scroll & sticky model (load-bearing)
`AppLayout`'s `<main>` is the **single page scroller** and carries `min-h-0`.
Three rules keep tables working; breaking any one of them silently clips rows
rather than erroring:

1. **Page roots must not be `h-full min-h-0`.** Use `min-h-full`. `h-full` only
   resolves if *every* ancestor up to the scroller is definite; if `main` lacks
   `min-h-0` it stops scrolling and crushes the content instead. Table cards get
   an explicit `min-h` floor.
2. **`Table` is its own bounded scroll region** (`maxHeight`, default
   `max-h-[calc(100vh-16rem)] min-h-[420px]`). `thead` is `sticky top-0` *inside
   that region* — a sticky header in a non-scrolling ancestor does nothing, and
   `overflow-x-auto` alone is not enough because it computes `overflow-y:auto`.
3. **Sticky cells must be fully opaque**, using the same value as their row
   (`bg-white` / `bg-slate-50` / `bg-blue-50`). Any `/70` or `/90` alpha lets
   scrolled content bleed through the pinned column.

Pinned columns: `Column.sticky` is `'left' | 'right'`, and multiple columns per
side are supported. Offsets are **cumulative**, measured from real header widths
with a `ResizeObserver` — never `left-0` on every sticky column, which stacks them.
Cell order in `columns` must keep sticky-left columns contiguous.

Any grid with pinned headers/columns must use `border-separate border-spacing-0`,
**not** `border-collapse`, which suppresses `position: sticky` in Chromium (this
is what the attendance day grid uses).

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
