# Deployment

## Targets
- **Worker (API)**: `staffsway-backend` on Cloudflare Workers.
- **SPA**: Cloudflare Pages, project from `frontend/` build output.

## CI/CD — `.github/workflows/deploy.yml`
1. On push to `main`.
2. Backend: `npm ci` → typecheck → `wrangler d1 migrations apply staffsway-demo --remote`
   (incremental, tracked in `d1_migrations`, never destructive) → `wrangler deploy`.
3. Frontend: `npm ci` → build → Pages deploy.

## Secrets / config
- Cloudflare API token + account id are repo secrets; no app secrets in the repo.
- **`SESSION_SECRET` (required since Phase 2)**: signs JWTs. Set once with
  `wrangler secret put SESSION_SECRET --name staffsway-backend` (generate e.g.
  `openssl rand -base64 48`; must be ≥32 chars). Locally it lives in `backend/.dev.vars`
  (gitignored). If missing, the worker logs a warning and uses an insecure dev fallback —
  never acceptable in production.
- Login rate limiting is per-isolate in-memory; for hardened production add Cloudflare's
  WAF rate-limiting rule on `/api/auth/login`.

## Go-live checklist
- [ ] All open questions in docs/open-questions.md answered
- [ ] Phase 2 auth hardening merged (real JWT, PBKDF2 passwords, role guards) ✓ done
- [x] `wrangler secret put SESSION_SECRET --name staffsway-backend` executed and verified (login JWT signing works) ✓ done
- [x] Remote migrations applied once manually and verified (`wrangler d1 migrations apply --remote`) — confirmed `✅ No migrations to apply!` on CI ✓ done
- [ ] Demo data NOT present remotely unless client wants a sandbox — seed only if requested,
      and remember the seed is insert-only (safe, but pollutes reports with fake employees)
- [ ] Admin password changed from demo default via UI after first login
- [ ] Custom domain bound + CORS origin tightened from `*` to the real Pages domain
- [x] Smoke test: login `admin@staffsway.in` / `Demo@123` → 200 **on the live worker**; browser login → dashboard works with zero console errors ✓ done

## Current deployment status (28 Aug 2026)
All live and verified end-to-end:

| What | Value |
|---|---|
| Frontend (Pages) | https://staffsway.pages.dev — serves SPA, logs in, renders dashboard + all module nav |
| Backend (Worker) | https://staffsway-backend.pulpbit.workers.dev — `/api/auth/login` returns 200 + JWT |
| API base baked into build | `frontend/.env.production` = `VITE_API_URL=https://staffsway-backend.pulpbit.workers.dev/api` (now **committed**, not gitignored) |
| D1 migrations | All applied remotely incl. `0015` — live employee codes now `SW####` (0 legacy `PWS` remaining) |

Recent fixes shipped in commit `2ea486f` (on `origin/main`):
1. **Mobile drawer** — nav scrolls internally (`overflow-y-auto min-h-0`); bottom user block now pinned & visible (was pushed out of reach). Removed redundant outer scroll wrapper.
2. **Settings tabs responsive** — `Tabs` container changed `w-fit` → `w-full flex-wrap` so tabs wrap instead of forcing horizontal page scroll.
3. **Salary slip / ESS slip print** — `@media print` now uses `position: fixed; top/left:0` + `max-height:none; overflow:visible` so the slip anchors to the page top-left and paginates fully (bottom no longer cut off); `#ess-slip-print` added to print rules; print button hidden on paper (`print:hidden`).
4. **Legacy codes** — `backend/migrations/0015_employee_codes.sql` normalizes `PWS####` → `SW####` (data migration, applied to remote D1).

## Security follow-up (still open)
- Rotate Cloudflare API token `cfut_a3T3...` (was pasted into chat / used via shell) and update GitHub
  repo secret with the new D1-capable token, re-uploaded with no trailing newline.

## Rollback
Workers: `wrangler rollback` (or redeploy previous commit). D1: point-in-time recovery via
Cloudflare dashboard (Time Travel) if a bad migration slipped through.

## Never do
- Never run `db:seed` against remote without explicit client request.
- Never hand-edit applied migration files.
- Never wipe/reset any database to "fix" state — write a corrective migration instead.
