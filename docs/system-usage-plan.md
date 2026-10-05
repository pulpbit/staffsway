# System Usage & D1 Monitoring — Implementation Plan

> Saved on 20 Sep 2026 for later implementation. Feature is designed, researched, and fully specified below. No code has been written yet for this feature.

## Status

- Plan mode research: complete.
- Implementation: **not started** (backend + frontend + tests remain).
- **Update 5 Oct 2026:** the migration this plan anticipated has now happened. Production is the client's Cloudflare account — Pages `staffsway-app` at `https://staffsway.in`, Worker `staffsway-backend` at `https://api.staffsway.in`, D1 `staffsway-db` (id `9335cd14-464c-4585-bdab-ed89d56e539f`) in account `f7b5649c9584f101d2f96bcf25f750d8`. The env-only design below is unchanged and still correct; the fallback id and account reference below are stale and need updating to the new values before implementation starts.

## Decided (locked in)

- **Navigation**: standalone sidebar **menu item** under the existing `System` group (`NAV_GROUPS` in `frontend/src/layouts/AppLayout.tsx`, currently holds `/settings`) → route `/system-usage`. Role-gated in `SidebarNav` to `super_admin` / `admin`.
- **Activity window**: last **24 hours** (same convention as `wrangler d1 info`).
- **Capacity limit**: `D1_LIMIT_BYTES` env optional, default **10 GiB** in a single config module (`backend/src/utils/d1config.ts`). App-side thresholds: 0–70 Normal, 70–85 Warning, 85–95 High, >95 Critical (app thresholds only — never presented as a Cloudflare claim).
- **Cloudflare account (migration-safe)**: `CF_API_TOKEN`, `CF_ACCOUNT_ID`, `D1_DATABASE_ID` come from **env only, no hardcoded account/id defaults**. `D1_DATABASE_ID` falls back to the id in `backend/wrangler.toml`, now `9335cd14-464c-4585-bdab-ed89d56e539f`. Production account id is `f7b5649c9584f101d2f96bcf25f750d8` — reference only, never hardcoded.
- Until config is set, **storage + activity show "unavailable" honestly** (no fake numbers). Records + health always work (D1 binding is account-independent). No R2 anywhere.

## Cloudflare metrics (verified against official docs + wrangler output)

- **Real storage size** — REST API:
  `GET https://api.cloudflare.com/client/v4/accounts/{account_id}/d1/database/{database_id}?fields=file_size`
  → `result.file_size` (bytes) + `num_tables`. Header `Authorization: Bearer <token>`.
  Cross-check: after configuring a token, `usedBytes` should equal `npx wrangler d1 info staffsway-db --json` → `database_size`. Re-measure at implementation time; the figure recorded when this plan was written was **651,264 bytes ~ 636 KB** / 59 tables, and the client's database has since been created from scratch with 63 tables.
- **Activity metrics** — GraphQL Analytics API:
  `POST https://api.cloudflare.com/client/v4/graphql`
  `viewer { accounts(filter: {accountTag: "..."}) { d1AnalyticsAdaptiveGroups(filter: {databaseId, datetime_geq, datetime_leq}) { sum { readQueries writeQueries rowsRead rowsWritten } } } }`
  Verified field names. Reference current 24h values from `wrangler d1 info`: read 716 / write 104 queries, rows read 11,907 / written 394.
- Both must be fetched **server-side** (token never reaches the frontend).

## Backend (additive only)

1. `backend/src/utils/d1config.ts` — single source of config from `Env`:
   - `CF_API_TOKEN?`, `CF_ACCOUNT_ID?`, `D1_DATABASE_ID?` (fallback = wrangler.toml id), `D1_LIMIT_BYTES?` (default 10 GiB).
2. `backend/src/utils/d1metrics.ts` — server-side fetchers, return `null` on any failure (timeout/4xx/5xx/parse), never throw:
   - `fetchStorage()` → REST `file_size`.
   - `fetchActivity(hours = 24)` → GraphQL sums. Missing/unset config → return `null` (→ "unavailable").
   - In-memory TTL cache (~300 s) to avoid hammering Cloudflare per request.
3. `backend/src/routes/system.ts` → `GET /api/system/usage` behind `requireRole('super_admin','admin')`:
   - 403 for other roles, 401 unauthenticated (auth middleware already global).
   - Response envelope `{ data: {...} }` per app convention; error `{ error: { code: 'forbidden', ... } }`.
   - `storage`: `{ available, usedBytes, limitBytes, remainingBytes (max(limit-used,0)), usagePercentage (2dp, ÷0/NaN-safe), status: Normal|Warning|High|Critical }`.
   - `records`: single **`db.batch([...])`** of `SELECT COUNT(*)` over real tables → `{ key, label, count }[]`:
     employees, clients, sites, users, attendance_monthly, leave_requests, payroll, payroll_items, salary_slips, salary_structures, job_openings, candidates, interviews, performance_reviews, assets, trainings, separations, hr_requests, employee_documents, advances, employee_loans, plus `num_tables`.
     (Confirm exact table names exist against schema before coding — do NOT invent tables.)
   - `activity`: `{ available, rowsRead, rowsWritten, readQueries, writeQueries }` — null → `available: false`.
   - `health`: `{ database (count batch is the real connectivity check), api (the 200 response), authentication (authenticated admin context) }`.
   - `updatedAt`: server ISO time.
   - Sections degrade independently; one failure never blanks the page.
4. `backend/src/types.ts` — add `CF_API_TOKEN?`, `CF_ACCOUNT_ID?`, `D1_DATABASE_ID?`, `D1_LIMIT_BYTES?` to `Env`.
5. `backend/src/index.ts` — mount `app.route('/api/system', systemRoutes)` after auth middleware.

## Frontend (additive)

6. `frontend/src/types/api.ts` — `SystemUsage`, `StorageInfo`, `RecordCount`, `ActivityInfo`, `HealthInfo`, snapshot type.
7. `frontend/src/services/api.ts` — `usageApi.get()` → `api.get<SystemUsage>('/system/usage')`. (`const API = import.meta.env.VITE_API_URL || '/api'` exists at L3.)
8. `frontend/src/utils/format.ts` — add `formatBytes(n)` (auto B/KB/MB/GB/TB, 2dp) and `formatDateTime(iso)` → "20 Sep 2026, 6:32 PM" (en-IN). No such helpers exist yet.
9. `frontend/src/features/systemusage/SystemUsagePage.tsx` (matching SettingsPage patterns):
   - Admin gate `hasRole('super_admin','admin')` → access-denied state.
   - `PageHeader` + Refresh `Button` (calls `refetch()`, no page reload).
   - Storage card: usage bar (color + text + icon — accessible, not color-only), Used / Available / Max capacity / Status / Last updated.
   - Records grid: responsive `StatCard`s with en-IN `number()` grouping in `SectionCard`s.
   - Activity: 4 stat cards, or "Not available" when `available:false`.
   - Health: `StatusBadge` per subsystem.
   - `useQuery({ queryKey: ['system-usage'], queryFn: usageApi.get, refetchInterval: 300000, staleTime: 120000 })`.
   - `LoadingState` / `PageError`(+Retry); partial-failure inline warnings; responsive stacked layout, no horizontal overflow.
10. `frontend/src/App.tsx` — add route `path="system-usage"`.
11. `frontend/src/layouts/AppLayout.tsx` — add `System Usage` item to `System` group + `hasRole` filter in `SidebarNav`.

## Secrets & config (documented, never exposed)

- Local: `.dev.vars` (already git-ignored, currently holds `SESSION_SECRET`) — add `CF_API_TOKEN`, `CF_ACCOUNT_ID` (optional for now).
- Production: `wrangler secret put CF_API_TOKEN` (D1 read scope) + account id via env or code default. Token never reaches frontend.
- Without a token: storage + activity show "unavailable" with a clear message; records + health still work.

## Documentation

12. `docs/system-usage.md` — endpoint, metrics source (REST + GraphQL), required server-side secret names (no values), capacity config (`D1_LIMIT_BYTES`), migration note (set the 3 vars on the client account — no code change), unavailable-metrics behavior.

## Testing & build validation

- API (local dev + live worker): admin → 200; hr/payroll/finance/manager/employee → **403**; no token → **401**. Use temporary test users and **deactivate them after** (only the local dev DB; application-level, no schema change).
- Edge cases: capacity zero / missing metric (unset token locally) → no negative remaining, no div-by-zero, "unavailable" messages.
- Cross-check: once a token is configured, `usedBytes` == `wrangler d1 info --json` `database_size`.
- **Backend typecheck**: `npx tsc --noEmit`. **Frontend**: `npx tsc -b --noEmit` then `npm run build`. (No lint/test scripts exist in this repo.)
- Regression: login, dashboard, payroll preview, slips still pass.
- **Zero schema changes → no data loss.** No migration needed for this feature.

## Repo / environment context (restart helper)

- Backend: Hono + D1, everything mounted under `/api`, `authMiddleware` global, `requireRole(...)`. Roles: `super_admin, admin, hr, payroll, finance, manager, employee`.
- Local dev: `npm run dev` (wrangler, port 8787); frontend `npm run dev` (vite, `http://localhost:5173`, binds IPv6 — `127.0.0.1:5173` fails, use `localhost`).
- Local login (after seeding locally): `admin@staffsway.in` / `Demo@1992`. Production login is `staffsway.jobs@gmail.com` — the seeded demo accounts do not exist in the client's database.
- Deploys that worked: `npx wrangler d1 migrations apply staffsway-db --remote`, `npx wrangler deploy`, `npm run build` + `npx wrangler pages deploy dist --project-name staffsway-app --branch main --commit-dirty=true`.
- `.env.production` = `VITE_API_URL=https://api.staffsway.in/api`.
- Production D1 is **empty apart from one admin user** (63 tables, no business data). The payroll rows described below lived in the old PulpBit database and no longer exist in production.
- Remote D1 does not support `UPDATE ... FROM` — use correlated subqueries on remote.
- Browser automation unavailable until `npx playwright install` (Playwright chromium missing).
- Logs/PIDs in `C:\Users\abdul\AppData\Local\Temp\opencode\` (`sw-out.log`, `sw-err.log`, `sw-backend.pid`, `sw-fe*.log`, `sw-fe.pid`).