# Development Guide

## Prereqs
Node 18+, npm. Cloudflare account only needed for remote deploy.

## Setup
```bash
# backend
cd backend
npm ci
npm run db:migrate        # applies migrations to local D1 (wrangler-managed SQLite)
npm run db:seed           # OPTIONAL demo data — idempotent & non-destructive, safe to re-run
npm run dev               # wrangler dev on :8787

# frontend
cd ../frontend
npm ci
npm run dev               # Vite on :5173, proxies /api → :8787
```

Demo login after seeding: `admin@staffsway.in` (password in `backend/scripts/seed-data.mjs`,
demo-only). Change immediately for any shared environment.
Seed ships statutory config ready-made: LWF ₹100 (employee & employer), TDS 2%, and four
employees flagged (`3` LWF, `10` TDS, `14` LWF+TDS, `16` LWF) so every deduction path is
exercisable on a fresh install. July 2026 payroll is seeded paid/finalized; August stays draft.

## Scripts
| Where | Script | Does |
|---|---|---|
| backend | `db:migrate` | apply new migrations locally |
| backend | `db:seed` | regenerate-safe demo seed (insert-only) |
| backend | `generate-seed` | rebuild `db/seed.sql` from `scripts/seed-data.mjs` |
| backend | `typecheck` | tsc --noEmit |
| frontend | `build` | production bundle (also runs tsc) |

## Rules
1. Schema changes = new migration file + update docs/database.md.
2. Payroll math changes = update docs/payroll-rules.md + verify the A/B/C/D regression matrix.
3. Seed changes go through `scripts/generate-seed.mjs`, never by editing `db/seed.sql`.
4. Keep statutory applicability per-employee; do not reintroduce global assumptions.
5. Run typecheck/build before pushing.

## Knowledge graph
`graphify-out/` holds a prebuilt codebase knowledge graph (`graph.html`, GRAPH_REPORT.md).
Regenerate with the graphify CLI when the architecture shifts materially; it is a dev-time
aid, never part of the build/runtime.

## Verification checklist before PR
- [ ] `npm run typecheck` (backend)
- [ ] `npm run build` (frontend)
- [ ] New migration applied cleanly on a fresh local DB (`rm -rf backend/.wrangler/state/v3/d1 && npm run db:migrate && npm run db:seed`)
- [ ] Payroll matrix (docs/payroll-rules.md) if payroll touched
