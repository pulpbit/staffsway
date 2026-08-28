# Assumptions

Decisions taken without explicit client confirmation. Each entry lists the fallback
behavior if the assumption proves wrong. Review with the client before Phase 10 sign-off.

1. **Statutory applicability is per-employee.** PF/ESI/LWF/PT/TDS flags live in
   `employee_statutory` per person. Migration `0002_statutory.sql` backfills from each
   employee's latest salary structure (PF/ESI carried over; PT on; LWF/TDS off).
2. **LWF is a flat monthly amount** (`settings.lwf_employee_amount` /
   `lwf_employer_amount`) until state-specific slabs are confirmed. State code is stored
   on the employee statutory row for future slab support.
3. **TDS is a flat % of gross** (`settings.tds_percent`) for employees flagged as TDS-
   applicable. Real slab-based computation only if the client confirms requirements.
4. **PT applies when enabled AND gross ≥ threshold** from settings.
5. **Attendance is monthly consolidated** (days, not daily punches). No timesheets.
6. **Salary basis** = fixed days/month value in settings (default 26) — used for LOP math.
7. **PF wage ceiling & eligibility** come from settings, applied only when the employee's
   PF flag is on. Rates are configuration, not hard-coded law values.
8. **Documents**: metadata/text records only (type, name, number). No file storage —
    product decision; the app never handles document bytes.
9. **Single tenant**, single company. Multi-company is out of scope.
10. **English UI**, professional tone; currency INR.
11. **Demo seed is idempotent and non-destructive** (INSERT OR IGNORE, high ID offsets);
    it never deletes or overwrites production data.
12. **Auth (Phase 2 done)**: HS256 JWTs signed with `SESSION_SECRET`; PBKDF2-SHA256 password
    hashing with transparent upgrade from the legacy demo hashes; role guards on all write
    endpoints; login throttling is in-memory per isolate (documented limitation). Refresh
    tokens and server-side revocation are deliberately deferred — deactivation blocks new
    logins, and existing JWTs expire within 7 days.
