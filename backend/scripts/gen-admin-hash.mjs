// One-off helper: prints a password_hash in the format expected by users.password_hash.
// Uses the exact same PBKDF2 parameters as src/utils/hash.ts so the two cannot drift.
// Usage: node scripts/gen-admin-hash.mjs <password>
const enc = new TextEncoder()

const b64url = (bytes) =>
  Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const ITERATIONS = 100_000
const SALT_BYTES = 16
const KEY_BITS = 256

const password = process.argv[2]
if (!password) {
  console.error('Usage: node scripts/gen-admin-hash.mjs <password>')
  process.exit(1)
}

const salt = new Uint8Array(SALT_BYTES)
crypto.getRandomValues(salt)

const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, key, KEY_BITS)

console.log(`pbkdf2$${ITERATIONS}$${b64url(salt)}$${b64url(new Uint8Array(bits))}`)
