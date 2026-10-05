# Progress Log

Newest first. One entry per shipped batch; every entry is on `origin/main` and
deployed (GitHub Actions → Cloudflare Workers + Pages) unless noted.

---

## 2026-10-05 — Client Cloudflare migration + demo placeholder removal

Delivered the running system into the client own Cloudflare account and moved it onto a real domain.
Frontend https://staffsway.in, API https://api.staffsway.in, D1 staffsway-db.

### Migration sequence
1. Created D1 staffsway-db and applied all 29 migrations to the empty remote database (63 tables).
   Verified the whole set applies clean from scratch rather than assuming — the repo has no 0019
   and 0031 was deleted, so numbering gaps were checked explicitly.
2. Set SESSION_SECRET (64-char random). Previously unset, so production was signing JWTs with the
   hardcoded dev fallback from utils/jwt.ts:getSecret.
3. Seeded the first admin (Vijay Sharma) by generating a PBKDF2 hash with a new
   backend/scripts/gen-admin-hash.mjs, which mirrors utils/hash.ts so the two cannot drift. No signup
   endpoint exists, so this insert is the only path to the first account.
4. Created Pages project staffsway-app, deployed Worker + Pages.
5. Attached staffsway.in and www.staffsway.in to Pages, api.staffsway.in to the Worker.
6. Repointed the GitHub Actions secrets from the old account to the client, then confirmed the pipeline
   works end to end by pushing and reading the run log.

### DNS note
The apex A record pointed at Namecheap parking IP, which blocks attaching a custom domain to Pages.
Replaced the apex A and the www parking CNAME with CNAMEs to Pages. The 5 Namecheap MX records and
the SPF TXT were left untouched and re-verified after the change — mail is unaffected.

### Dashboard placeholders removed
The earlier mock-removal pass had missed several hardcoded figures that would have been shown to the client:
- Financial summary bar (earnings / deductions / net / PF / ESI) was literal text. Now sums payroll_items
  for the selected month.
- Pending Leaves card was 18 / 52 / 3. Now counts leave_requests by status.
- Last Mo: ₹ 7,98,450 with a fabricated +6.0% — now the prior month real net salary and a computed
  percentage.
- Coverage: Pan-India → active client count. Next long weekend in 4 weeks → next real holiday, hidden
  when there are none.

### Salary-pending false positive
salaryPending was payrollStatus !== paid, so a missing payroll row (null) counted as outstanding work.
On the empty client database this showed Salary Pending 1 and Process salary with zero employees and zero
attendance rows. Now gated on totalActive > 0 || enrolled > 0, and the task title distinguishes
No payroll run for X/Y from Process salary.

### Login autofill removed
The login page pre-seeded admin@staffsway.in / Demo@1992 and offered three demo fill buttons (auto-fill,
Staff Demo, My Space Demo). Those accounts do not exist in the client database, so every autofill would
have failed on submit. Fields now start empty.

### Still open
- Staffsway@123 is the live production admin password.
- Both Cloudflare API tokens were pasted in plaintext during the migration and need rotating; the GitHub
  one is duplicated into Actions secrets.
- Old PulpBit deployment (staffsway-backend.pulpbit.workers.dev) is still online with demo data and no
  longer receives deploys.
- CORS is still * on the Worker.

---

## 2026-10-04 — Full UI redesign pass + table/scroll fixes (commit `11eaf8e`)

Scope: **46 frontend files**. No backend, API, permission, or calculation changes —
`backend/` is untouched in this commit.

### A. Design language rolled out everywhere
Took the login page + management dashboard language (slate/blue, `rounded-2xl`,
`border-slate-200/80`, `shadow-xs`, gradient KPI tiles, soft badges, uppercase
compact labels) across the shared UI kit and **all** feature pages:

- `components/ui/` — `layout`, `data`, `fields`, `actions`, `overlay`, `drawer`,
  `state`, `validation`, `status`, `skeleton`, `AadhaarBoxes`.
- Every `features/*` page, incl. assets, attendance report, clients, compliance,
  documents, helpdesk, leaves, my space, payroll, performance, recruitment,
  referrers, reports, separation, settings, sites, slips, training.
- Legacy `ink` / `body` / `mute` / `hairline` / `card-shadow` / `mono-label`
  tokens swept out. Verified in-browser across all 21 routes: **0** occurrences
  of any retired token still in the DOM.

### B. Employee suite
| Change | Where |
|---|---|
| Five-stage step tracker + anchor nav (`FORM_STAGES`, `IntersectionObserver`, `jumpToStage`) | `employees/EmployeeForm.tsx` |
| Profile header, quick actions, active-tab styling | `employees/EmployeeProfileDrawer.tsx` |
| Quality bar, import progress, gradient result tiles, phase tracker | `employees/BulkEmployeeImport.tsx` |
| Print-safe enterprise voucher | `slips/SalarySlipView.tsx` |
| Employee Master now pins **Emp. ID + Status + Employee Name** | `employees/EmployeesPage.tsx` |

Also fixed 31 pre-existing TypeScript errors surfaced by the pass: modal/drawer
call sites matched to real component APIs, `ConfirmDialog confirmText/cancelText`,
`FormGrid cols={2}`, `validate(RULES, form)` argument order, missing `Plus` /
`Textarea` imports, `ReportsPage` table `keyFn`.

### C. Three functional regressions — the important part
The redesign broke table rendering. User report: *"Employee Master can show only
2-3 rows; Monthly Attendance shows only a header."*

**Root cause 1 — collapsed page scroll.** Page roots used `h-full min-h-0` while
`AppLayout` `main` had `min-height:auto`. `main` therefore never scrolled
(`scrollHeight === clientHeight`) and the flex chain crushed the table cards to
**134–160px**, clipping rows that were always in the DOM (36 attendance, 39 employee).
Fix: `min-h-0` on `main`; page roots use `min-h-full`; cards get real `min-h`
floors; `Table` is its own bounded scroll region.

**Root cause 2 — headers could not stick.** `data.tsx` `thead` had no `top`, and
`overflow-x-auto` computes `overflow-y:auto`, so `position:sticky` had no scroller
to stick to. Fix: sticky `thead` inside a bounded `maxHeight` region
(`max-h-[calc(100vh-16rem)] min-h-[420px]`, overridable per table).

**Root cause 3 — `border-collapse` killed sticky on the attendance grid.** Switching
that grid to `border-separate border-spacing-0` made `position:sticky` work.

Also: sticky cells used `bg-slate-50/90` / `bg-slate-50/70` (and rows
`bg-slate-50/40`), so scrolled day cells **bled through** the pinned columns.
Now every sticky cell uses a fully opaque background matching its row state
(`bg-white` / `bg-slate-50` / `bg-blue-50`). And because `data.tsx` gave every
sticky column `left-0`, a second pinned column would stack on the first — offsets
are now measured cumulatively via `ResizeObserver` on the header cells.

### D. Verification (all passed, local, headless Chromium)
- `npx tsc --noEmit` clean; `npm run build` green (only the pre-existing
  >500 kB chunk warning).
- **Rows in view** @1280×720: employees 8/39 (was 2–3), attendance 10/36 (was 0),
  slips 7/35, reports 6/39, sites 7/10, assets 8/8.
- **Sticky headers** hold position after a 600px scroll on all 9 table pages.
- **Sticky columns** after a 900px right-scroll: employees 160 sticky cells,
  attendance 230 — **0 translucent**, cumulative `left` offsets
  employees `0 → 96 → 206`, attendance `0 → 60 → 192 → 296 → 392`.
- All 21 routes render; **0 React console errors**.

### E. Findings worth remembering
- **`h-full` + `min-h-0` on a page root only works if every ancestor up to the
  scroller has `min-h-0` too.** Otherwise the scroller silently stops scrolling and
  clips the page instead. Symptom looks like missing data, not a CSS bug.
- **`border-collapse` suppresses `position:sticky`** in Chromium. Use
  `border-separate border-spacing-0` for any grid with pinned headers/columns.
- **A sticky cell must be fully opaque.** `bg-*/70` reads as a bug the moment
  anything scrolls under it. Also pin the *row* to the same opaque value or you
  get a seam.
- Multiple pinned columns per side need **cumulative** offsets; `left-0` on all of
  them overlaps. Measure real widths — content decides them, not a width class.

### F. Open bug — pre-existing, NOT from this commit
`GET /api/performance/summary` returns **500**
(`D1_ERROR: Wrong number of parameter bindings`). At
`backend/src/routes/performance.ts:554` the `performance_pips` count binds
`...params`, which includes `fiscal_year`, but that query has **no `fiscal_year`
placeholder** (`performance_pips` has no such column). Broken in both the
employee-scoped and org-wide cases. Reproduces on `a30bf43` with no local
changes. One-line fix: bind only `employee_id`, matching lines 552–553.
**Left unfixed** to keep this commit frontend-only, per the no-backend-change
constraint.

### G. Doc debt / follow-ups
- Apply the one-line `performance.ts` binding fix above.
- `docs/architecture.md` has no section on the shared table scroll/sticky model
  or the design tokens — both were the source of today's regressions and are
  now written up in **E**.
- Visual sign-off still pending: the model used for this pass has **no image
  input**, so all layout/contrast claims above are DOM + computed-style evidence
  (`getBoundingClientRect`, `getComputedStyle`), not screenshots.

---

## 2026-09-27 — Referrer registration intake (commit `7d84a55`)

Public URL for candidates: **`https://staffsway.pages.dev/apply`**
(also served at `/`; admin at `/referrers`).

### A. Model decision
Replaced the in-progress **supplier**/application model with a plain **referrer**
flow after user clarification:

- Referrer = **contact only**: name, code, contact person, phone, email, active flag.
  No day rate, agreement ref, GST no., address/city/state/pincode, or notes.
- One **shared public link** (not per-referrer). The person filling the form states
  which referrer sent them; HR verifies it at approval. Self-asserted by design.
- Spelling is **referrer** (two r's) everywhere, per user instruction.

### B. DB — migration `0029_referrer_registrations.sql`
- New tables `referrers`, `referrer_applications` (renamed from the supplier design).
- `employees` gains `source`, `referrer_id`, `referrer_application_id`.
- Unique Aadhaar: global on `employees(aadhaar)`, plus a **partial** unique index on
  `referrer_applications(aadhaar) WHERE status='pending'` so a pending duplicate is
  blocked but a historical approved record never blocks a re-apply.
- Additive + backward compatible. **Applied to remote D1 after checking for
  duplicate Aadhaar** (12 live employees, all unique, no blanks) because the global
  unique index would have failed the migration otherwise.

### C. Backend
- `routes/publicReferrers.ts` — `GET /options` (active referrers only),
  `POST /check-aadhaar` (existence probe), `POST /` (submit). Unauthenticated.
  Anti-spam: rate limit, honeypot field, and a **minimum fill time checked only on
  submit** (an earlier version checked it on the Aadhaar probe, which blocked fast
  typists and had to be removed).
- `routes/referrers.ts` — referrer CRUD (deactivate instead of delete), registration
  review, reject, and approve. Approve requires joining date + site + designation +
  a **positive** basic salary, then creates the employee and flips the application to
  `approved` with `employee_id` back-linked.
- `services/employeeCreation.ts` (**new**) — single writer for the `employees` row and
  everything hanging off it (salary structure, statutory, documents, onboarding tasks).
  Direct add, recruitment join, and referrer approval now share it, so they can no
  longer drift apart.
- `utils/throttle.ts` (**new**) — the login limiter extracted out of `routes/auth.ts`
  so the public intake can reuse it; `auth.ts` now just wraps it.
- `utils/aadhaar.ts` (**new**) — normalise (strip spaces/dashes) + 12-digit validation.
- Role guards: referrer writes = `super_admin` / `admin` / `hr`; delete = `super_admin` / `admin`.

### D. Frontend
- `features/referrers/ReferrerApplyPage.tsx` (**new**) — 3-step public form
  (Aadhaar → personal details → referrer + review). Deliberately **omits** salary,
  designation, department, site, and joining date; those are HR's call at approval.
- `features/referrers/ReferrerApplicationsPage.tsx` (**new**) — tabs
  *Registrations* / *Referrers*; approval form enforces the required fields.
- `components/ui/AadhaarBoxes.tsx` (**new**) — a11y: digit-grouped Aadhaar input
  (4-4-4) shared by the public and admin forms, replacing plain text boxes.
- `App.tsx` public `/apply` + protected `/referrers`; `AppLayout` nav entry **Referrers**.

### E. The 500 behind "something went wrong" (user-reported on Approve)
`D1_ERROR: 50 values for 48 columns`. The writer had a hand-maintained `VALUES` list
with 50 `?` for 48 columns, so **every** employee insert failed — referrer approval,
direct Add Employee, *and* recruitment join. Fixed by generating the placeholders from
the `EMPLOYEE_COLUMNS` array, binding an aligned `values` array, and adding a
length guard so the two can never silently drift again.

### Verification
- Typecheck clean (backend `tsc --noEmit`, frontend `tsc -b --noEmit`); frontend build OK.
- Full migration chain re-applied from a wiped local D1; seed regenerated and applied.
- Approve tested end-to-end locally: application `990102` → employee `SW0039` with
  `source='referrer'`, correct `referrer_id` + `referrer_application_id`, 1 salary
  structure, 1 statutory record, 8 onboarding tasks. Direct Add Employee also OK.
  **Test rows were deleted afterwards** and the application reset to `pending`.
- Live: `/apply` HTTP 200; deployed bundle has 21 `Referrer` and **0** `Supplier`
  mentions; `GET /api/public/referrers/options` 200; `check-aadhaar` 200.
- Approval was **not** exercised against production on purpose — it writes a real employee.

### Deployment facts (corrected)
- `.github/workflows/deploy.yml` applies D1 migrations **and** deploys both the Worker
  and Pages on every push to `main`. The push of `7d84a55` ran green (43s) and the
  newest worker version is from that run, so the live worker is the git version —
  backend changes do **not** need a manual `wrangler deploy`.
- Frontend build bakes `VITE_API_URL=https://staffsway-backend.pulpbit.workers.dev/api`
  from `frontend/.env.production`.
- Production D1 `staffsway-demo` is **real data** (12 employees), not a demo copy.

### Open items (next session)
1. **Blocking real use — production `referrers` table is empty.** `/apply` currently
   shows "No referrers are registered yet". Add referrers at `/referrers` → *Referrers*.
2. **Security before real submissions.** Backend CORS is still `origin: '*'` on an
   unauthenticated write endpoint. The rate limit is in-memory per Worker isolate, so
   it is weak in practice. Plan: restrict CORS to `staffsway.pages.dev` + add
   Cloudflare Turnstile.
3. Recruitment Join modal does not yet expose the employee-type / shift / statutory
   options the backend accepts; review shared-writer statutory defaults for omitted values.
4. Attendance parity: the employee quick-action still opens the **latest recorded**
   month instead of the currently selected month.
5. Optional: custom domain (e.g. `apply.staffsway.in`) instead of `pages.dev`.
6. `docs/payroll-rules.md` still documents the legacy (non payable-days) formula —
   carried over from the previous entry, still open.
- Closed from the previous entry: `docs/database.md` now documents both `0027`
  attendance tables and `0029` referrer tables.

---

## 2026-09-21 — Attendance module + follow-up fixes

### A. Attendance redesign (commit `64a5817`)
Day-by-day marks grid replacing count-only attendance, with payroll driven by
**payable days**.

- **DB**: additive migration `0027_attendance_daily.sql` — per-day `attendance_daily`
  (`employee_id`, `date`, `mark`) + aggregate columns on `attendance_monthly`
  (`total_days`, `rest_days`, `holiday_days`, `half_days`, `leave_days`, `ot_days`,
  `payable_days`, `actual_salary`). Applied to remote D1 by CI (never destructive).
- **Backend** (`backend/src/routes/attendance.ts`):
  - `GET /sheet` — every active employee + a full computed month grid
    (`{ days, holidays, anyGrid, rows }`), rows carry `marks`, `weekly_off`,
    `monthly_earnings`, `working_hours`, summary.
  - `POST /marks` — replaces `attendance_daily` for an employee+month (DELETE+INSERT
    full grid), recomputes `attendance_monthly`, keeps legacy count columns in sync.
  - `GET /report` — employee detail + client/site rollups + totals.
- **Payroll** (`backend/src/services/payroll.ts`, `routes/payroll.ts`): grid-basis
  months use `payable_days`; legacy months fall back to `days_in_month − absent − unpaid`.
  `per_day = monthly_earnings / total_days`; OT is already inside payable for grid months.
- **Sites**: `weekly_off` per site (default `Sun`), drives automatic `R` mark.
- **Frontend**: `AttendancePage` (editable grid), `AttendanceReportPage`,
  `attendanceGrid.ts` helpers, `services/api.ts` + `types/api.ts` sheet/report types,
  Attendance submenu in `AppLayout`.
- Auto cell default: weekday === site `weekly_off` → `R`; holiday → `HD`; else `P`.
  Payable days = `P + R + HD + HF/2 + OT days`.

### B. Grid UX fixes (commits `2ffa0b2`, `0f11349`, `f4e8ced`)
- Render the computed grid for **all** employees (previously only rows with saved
  marks; the rest showed dots / looked "scattered").
- Solid mark chips + matching legend (`P` success, `A` error, `R` neutral,
  `HD` info, `HF` warning, `L` error-deep).
- Single-row sticky day header (weekday + day-number stacked) — replaced a two-row
  `rowSpan` header that overlapped the day cells on scroll.
- Removed right-column pinning so the summary block no longer overlays day cells.
- Opaque backgrounds on the frozen left columns so scrolled marks don't bleed through.

### C. Layout (commit `2f3b653`)
- **Sidebar hidden by default globally**; reveal by hovering the far-left edge rail
  (or the topbar toggle to pin). State persisted in
  `localStorage['staffsway_sidebar_pinned']`.
- Attendance grid now scrolls **internally on both axes**
  (`flex-1 min-h-[280px] overflow-auto`), page itself does not scroll; `thead`
  sticky top, `tfoot` sticky bottom.
- Narrowed frozen left columns (total 476px, was 632): Emp. ID 60, Emp. Name 132,
  Father/Spouse 104, Designation 96, Salary 84. Exact table width 2180.
- Attendance summary stats collapsed to a single scrollable row.

### D. Fix batch (commit `30f8555`) — user-reported
| # | Fix | Where |
|---|---|---|
| 1 | **ESIC No. shown on salary slips.** Slip API now selects `e.esi_number`; rendered on admin slip (`SalarySlipsPage`) and ESS payslip (`MySpacePage`, also adds UAN). | `backend/src/routes/slips.ts`, `frontend/src/features/slips/SalarySlipsPage.tsx`, `frontend/src/features/myspace/MySpacePage.tsx`, `frontend/src/types/api.ts` |
| 2 | **Pre-joining days shown as `X`** (not `A`/`P`). New `X` mark code; `isPreJoining(date, joiningDate)` short-circuits default marks; `X` cells are read-only and excluded from payable. Backend accepts/stores `X` and does not count it as present/absent. | `frontend/src/features/attendance/attendanceGrid.ts`, `AttendancePage.tsx`, `frontend/src/types/api.ts`, `backend/src/routes/attendance.ts` |
| 3 | **Joining form fits 2 pages** (was 3). Compacted header/spacing, Bank + Nominee side by side, print CSS hides the app shell (`body.print-joining #root { display:none }`) and makes `.print-join` static; `@page` margin 12mm/10mm. | `frontend/src/features/employees/JoiningFormModal.tsx`, `frontend/src/index.css` |
| 4 | **Joining-form action icon** added beside view/edit on the employee list. | `frontend/src/features/employees/EmployeesPage.tsx` |

### Verification (all passed, local + live)
- Typecheck: backend `tsc --noEmit` clean; frontend `tsc -b --noEmit` clean.
- Browser (headless, local): employees list 40/40 rows show the joining-form button;
  attendance 1110 day cells, 10 `X` marks on mid-month joiners; salary slip renders
  the `ESI No.` row; joining form print PDF = **exactly 2 pages**.
- Live (`https://staffsway.pages.dev`, `https://staffsway-backend.pulpbit.workers.dev`):
  12/12 joining-form buttons, attendance grid loads, **0 console errors / 0 failed requests**.
- Deploy workflow for `30f8555`: **success**.

### Findings worth remembering
- **ESIC amount was never the problem** — it is computed and persisted
  (e.g. Sept 2026 slip `esic = 131.50`). Only the **ESIC number** was missing from
  the API/UI. Verified against live `/payroll/preview` + `/slips/:id`.
- `X` (pre-joining) is intentionally **non-payable**: it is excluded from
  `payable_days`, so a mid-month joiner earns for worked days only.

### Doc debt / follow-ups
- `docs/payroll-rules.md` still documents the legacy formula
  (`per_day = earned / salary_basis_days`, `lop = per_day × (absent + unpaid)`).
  Update it to the payable-days basis above before the next payroll change.
- `docs/database.md` should note the `attendance_daily` table + new
  `attendance_monthly` aggregate columns from migration `0027`.
- Live employee records currently have **no ESIC numbers saved**, so slips print
  `ESI No. —` until HR fills them (Employee Form → Salary & Statutory → ESI No.).

---

## 2026-09-21 — Employee Master redesign (commits `8ad6777`, `5d5110f`)
- Employee Management nav dropdown + dedicated Add New Employee page.
- Working-hours payroll basis + OT hourly rate.
- Employee Master: stat cards, date/exit filters, profile drawer, table scroll fixes.
