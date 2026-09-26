// Aadhaar normalisation, shared by every write path and every duplicate check.
//
// WHY THIS EXISTS: Aadhaar is typed by hand on a public web form, so people
// enter it as "7896 0000 0001", "7896-0000-0001" or "78960000 0001". The
// original check in routes/employees.ts only .trim()'d the input, which meant
// any spaced variant silently missed the duplicate and inserted a second row
// for the same person. Always compare and store the digits-only form.

export function normalizeAadhaar(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '')
}

export function isValidAadhaar(value: unknown): boolean {
  return /^\d{12}$/.test(normalizeAadhaar(value))
}
