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
- [ ] `wrangler secret put SESSION_SECRET --name staffsway-backend` executed and verified
- [ ] Remote migrations applied once manually and verified (`wrangler d1 migrations apply --remote`)
- [ ] Demo data NOT present remotely unless client wants a sandbox — seed only if requested,
      and remember the seed is insert-only (safe, but pollutes reports with fake employees)
- [ ] Admin password changed from demo default via UI after first login
- [ ] Custom domain bound + CORS origin tightened from `*` to the real Pages domain
- [ ] Smoke test: login → create employee → attendance → payroll preview → slip

## Rollback
Workers: `wrangler rollback` (or redeploy previous commit). D1: point-in-time recovery via
Cloudflare dashboard (Time Travel) if a bad migration slipped through.

## Never do
- Never run `db:seed` against remote without explicit client request.
- Never hand-edit applied migration files.
- Never wipe/reset any database to "fix" state — write a corrective migration instead.
