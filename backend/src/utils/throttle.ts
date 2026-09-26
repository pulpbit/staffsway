// Fixed-window in-memory rate limiter.
//
// Extracted from routes/auth.ts, which had a private copy used only to slow
// down password guessing on login. The public referrer intake endpoint is
// unauthenticated and accepts writes from anyone, so it needs the same guard.
//
// LIMITATION, stated plainly: this is per-isolate memory. Cloudflare Workers
// runs many isolates, so the effective limit is roughly (limit x isolates). It
// is enough to blunt casual hammering, not a hard guarantee. A public
// unauthenticated write endpoint that needs real protection should sit behind
// Turnstile or a Durable Object rate limiter; see the note in
// routes/publicReferrers.ts.

const DEFAULT_WINDOW_MS = 5 * 60 * 1000
const DEFAULT_MAX_ATTEMPTS = 10

type Bucket = { count: number; resetAt: number }
const attempts = new Map<string, Bucket>()

function pruneExpired(now: number): void {
  if (attempts.size < 500) return
  for (const [k, b] of attempts) if (b.resetAt < now) attempts.delete(k)
}

export function throttle(
  key: string,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
  windowMs: number = DEFAULT_WINDOW_MS
): { blocked: boolean; retryAfterSec: number } {
  const now = Date.now()
  pruneExpired(now)
  const b = attempts.get(key)
  if (!b || b.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs })
    return { blocked: false, retryAfterSec: 0 }
  }
  b.count += 1
  if (b.count > maxAttempts) {
    return { blocked: true, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) }
  }
  return { blocked: false, retryAfterSec: 0 }
}

export function clearThrottle(key: string): void {
  attempts.delete(key)
}
