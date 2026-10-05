# Deployment

## Production targets (client Cloudflare account)

| Component | Name | Where |
|---|---|---|
| Frontend | Cloudflare Pages project `staffsway-app` | `https://staffsway.in`, `https://www.staffsway.in` |
| Backend API | Cloudflare Worker `staffsway-backend` | `https://api.staffsway.in` |
| Workers.dev fallback | same Worker | `https://staffsway-backend.staffsway-jobs-f7b.workers.dev` |
| Database | D1 `staffsway-db` (id `9335cd14-464c-4585-bdab-ed89d56e539f`) | region APAC |

Cloudflare account id: `f7b5649c9584f101d2f96bcf25f750d8`.

CORS is `origin: '*'` on the Worker, so the split between the Pages hostname and
the API hostname needs no code change. Only `VITE_API_URL` names the API host.

## Infrastructure as code

- `backend/wrangler.toml` pins the D1 binding (`DB` -> `staffsway-db`), the
  Worker name, and the migrations dir. Changing the D1 id here is what repoints
  the Worker at a different database.
- `frontend/.env.production` pins `VITE_API_URL=https://api.staffsway.in/api`
  and **is committed**. The value is baked into the built bundle at compile
  time, so changing the API hostname requires a rebuild and redeploy.

## CI/CD — `.github/workflows/deploy.yml`

On every push to `main`, two independent jobs:

1. **backend** — `npm ci`, typecheck + build, then
   `wrangler d1 migrations apply staffsway-db --remote`, then `wrangler deploy`.
2. **frontend** — `npm ci`, build, then
   `wrangler pages deploy dist --project-name staffsway-app --branch main`.

Migrations are **blocking**. An earlier revision had `continue-on-error: true`
on that step, which meant a failed schema apply still shipped the Worker and
the breakage only surfaced as runtime 500s. Do not reintroduce it.

Because the jobs are independent, a green run overall still warrants checking
both jobs individually, and re-verifying the live site after a backend-only
failure.

## Required secrets

| Where | Secret | Notes |
|---|---|---|
| Worker | `SESSION_SECRET` | 32+ chars, signs JWTs |
| GitHub Actions | `CLOUDFLARE_ACCOUNT_ID` | client account id above |
| GitHub Actions | `CLOUDFLARE_API_TOKEN` | needs D1, Workers Scripts, Pages write; DNS Edit only if the domain ever moves |

`SESSION_SECRET` is set with `wrangler secret put SESSION_SECRET --name staffsway-backend`.
It is **not** in the repo and **not** in `wrangler.toml`. If it is missing or
under 32 chars, `backend/src/utils/jwt.ts:getSecret` falls back to a hardcoded
dev string and logs a warning — every token is then forgeable, so treat that
warning as a deployment failure.

Locally the secret lives in `backend/.dev.vars` (gitignored).

The GitHub token is the highest-privilege credential in this project: it can
rewrite the Worker code and the database. Rotate it if it is ever pasted into
a chat, a log, or a shell command — `wrangler` echoes the token's presence but
`echo $TOKEN` style commands put it in scrollback.

## First admin account

There is no self-service signup. `/api/auth/login` is the only auth entry
point, so the first admin is inserted directly into D1:

```powershell
node scripts/gen-admin-hash.mjs "<password>"   # prints a pbkdf2$... hash
npx wrangler d1 execute staffsway-db --remote --command "INSERT OR REPLACE INTO users (id, name, email, password_hash, role, status) VALUES (1, '<name>', '<email>', '<hash>', 'admin', 'active');"
```

`gen-admin-hash.mjs` mirrors `src/utils/hash.ts` (PBKDF2-SHA256, 100k
iterations, 16-byte salt). Using the repo helper instead of hand-rolling a hash
keeps the two from drifting.

`users.status` must be `'active'` or login rejects the account. `employee_id`
is nullable, so a staff admin works without a linked employee record.
`role` gates the write permissions in `backend/src/index.ts`.

## Login rate limiting

`auth.ts` throttles failed logins per-isolate in-memory, which resets on
isolate recycle. For real hardening add a Cloudflare WAF rate-limit rule on
`/api/auth/login`.

## Email routing

`staffsway.in` MX records and the SPF TXT are hosted at Namecheap
(`eforward1..5.registrar-servers.com`) and were deliberately **not** touched
during the Pages cutover. Cloudflare Pages does not proxy MX, so mail keeps
working. The risk is a future "Full (strict)" SSL flip or a ruleset change that
matches MX and silently breaks mail — treat those records as frozen.

`www.staffsway.in` previously CNAMEd to `parkingpage.namecheap.com`. That
parking page was removed and both the apex and `www` now point at Pages.

## Rollback

Worker: `wrangler rollback`, or redeploy the previous commit. D1: write a
corrective forward migration, or use point-in-time recovery (Time Travel) in the
dashboard if a bad migration slipped through.

## Never do

- Never run the seed against the remote database without an explicit client
  request. The seed is insert-only, so it will not overwrite, but it does
  populate reports with demo employees.
- Never hand-edit a migration that has already been applied remotely.
- Never reset a database to "fix" state. Write a corrective migration.
- Never let a failed migration step be non-blocking.

## Pre-handover checklist

- [x] Client account: D1 created, all migrations applied to an empty database, verified from scratch
- [x] SESSION_SECRET set on the Worker (dev fallback no longer in play)
- [x] First admin created; login verified end to end through the custom domain
- [x] Pages project created; apex, www, and api hostnames all serving
- [x] GitHub Actions secrets repointed; a green run confirmed by reading the log
- [x] Demo seed NOT run against production
- [x] Login demo autofill and hardcoded dashboard figures removed
- [x] Migrations step made blocking in CI
- [x] Namecheap MX + SPF untouched and re-verified after DNS changes
- [ ] Rotate the admin password before handing over
- [ ] Rotate both Cloudflare API tokens (both were exposed in plaintext during migration)
- [ ] Decide what happens to the old PulpBit deployment (still online, demo data, no longer deployed to)
- [ ] Tighten CORS from * to the two production hostnames
