# Staffsway HRMS — Requirements

Manpower staffing & HR management system for a single company, deployed on Cloudflare.
Source of truth for scope decisions. Keep updated as requirements change.

## Users & Roles
| Role | Scope |
|---|---|
| Super Admin | Full access incl. user management + company settings |
| Admin | Everything except destructive/user-admin actions |
| HR | Employees, clients, sites, attendance, documents, leave |
| Payroll | Attendance finalization, payroll runs, salary slips, advances |
| Manager | Team attendance/reports for assigned sites (future) |
| Employee | Self-service portal: own slips, attendance, profile (Phase 12+) |
| Finance | Reports, payroll review, statutory summaries |

## Modules
1. **Auth** — email/password login, JWT session, role-based route guards (hardening in Phase 2).
2. **Clients & Sites** — client companies with contract dates; sites under clients with supervisor + shift.
3. **Employees** — full profile, bank details, joining info, site assignment, documents
   (text records only — type/name/number; no file storage by product decision), status lifecycle.
4. **Salary structures** — effective-dated components (basic, HRA, conveyance, other allowance, OT rate).
5. **Statutory settings (per employee)** — PF / ESI / LWF / PT / TDS applicability toggles stored in
   `employee_statutory`. **Never assumed globally** — this is a hard product rule.
6. **Attendance** — monthly consolidated grid (present/absent/paid leave/unpaid leave/OT hours), draft → finalized lock.
7. **Advances** — monthly advance deductions per employee (record/list/delete on the Payroll page's
   Advances tab; consumed as a deduction line by the payroll engine).
8. **Payroll** — monthly run: preview → generate → finalize → mark paid; per-employee line items persisted with all inputs (traceability).
9. **Salary slips** — generated per employee from payroll items; printable/PDF-ready layout.
10. **Reports** — headcount, site-wise strength, payroll summary, OT analysis.
11. **Settings** — company profile + statutory rates/caps/thresholds incl. flat LWF amounts and TDS %.

## Dashboards
- **Employee**: my profile, my slips, my attendance summary.
- **HR/Admin**: headcount KPIs, pending attendance, quick actions.
- **Management**: payroll cost trend, site/client distribution, OT cost.

## Explicit Out of Scope
Biometric devices, face recognition, GPS/geo-fencing, WhatsApp/SMS integration.

## Constraints
- Budget ₹14,000 total — prefer pragmatic solutions over gold-plating.
- Cloudflare Workers + D1 in production; local dev uses wrangler's local D1 (SQLite-compatible).
- No legal/compliance claims in UI copy ("as configured" language only).
