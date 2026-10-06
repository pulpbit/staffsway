#!/usr/bin/env node
// Removes the *local* D1 database so `db:migrate` can rebuild it from scratch.
//
// Why not just drop the `d1_migrations` table? Because `wrangler d1 migrations
// apply` records what it has run in that table, and re-running the same
// migrations against a database whose tables still exist fails with "table
// already exists" / "duplicate column name", leaving the local database
// half-migrated.
//
// Why not `DROP TABLE` over the CLI? D1's SQL authorizer rejects DDL from
// `wrangler d1 execute` against the dev database (SQLITE_AUTH) while
// `wrangler dev` is running.
//
// So the sqlite files are deleted, which is the only route that reliably yields
// a genuinely empty local database.
//
// `wrangler dev` keeps a handle open on those files, and Windows then refuses
// the delete (EBUSY). Stop the dev server before running this, then start it
// again afterwards. Only local files are removed - the remote database is never
// touched.

import { rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const d1StateDir = join(backendRoot, '.wrangler', 'state', 'v3', 'd1')

if (!existsSync(d1StateDir)) {
  console.log('Local D1 state is already absent.')
  process.exit(0)
}

try {
  await rm(d1StateDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  console.log(`Removed local D1 state: ${d1StateDir}`)
} catch (err) {
  if (err.code === 'EBUSY' || err.code === 'EPERM' || err.code === 'ENOTEMPTY') {
    console.error(
      [
        `Could not remove local D1 state: ${err.code}.`,
        '',
        '`wrangler dev` is probably still running and holding the database open.',
        'Stop the dev server (Ctrl+C in its terminal), re-run this command, then',
        'start `npm run dev` again once migrations and seed finish.',
      ].join('\n'),
    )
    process.exit(1)
  }
  console.error(`Could not remove local D1 state: ${err.message}`)
  process.exit(1)
}