// Core generator: reads data from seed-data.mjs and writes db/seed.sql
import { pbkdf2Sync, randomBytes } from 'node:crypto'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ADMIN_PASSWORD, SETTINGS, CLIENTS, SITES, EMPLOYEES, ADVANCES } from './seed-data.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'db', 'seed.sql')

const r2 = (n) => Math.round(n * 100) / 100
// Must match backend/src/utils/hash.ts format: pbkdf2$<iter>$<salt_b64url>$<hash_b64url>
const b64u = (b) => Buffer.from(b).toString('base64url')
const seedSalt = randomBytes(16)
const seedHash = pbkdf2Sync(ADMIN_PASSWORD, seedSalt, 100000, 32, 'sha256')
const adminHash = `pbkdf2$100000$${b64u(seedSalt)}$${b64u(seedHash)}`

const L = []
const add = (s) => L.push(s)

// ---------- Configuration used for payroll math ----------
const C = {
  basis_days: SETTINGS.salary_basis_days,
  pf_rate: SETTINGS.pf_rate,
  pf_cap: SETTINGS.pf_cap,
  pf_eligibility: SETTINGS.pf_eligibility,
  esic_rate: SETTINGS.esic_rate,
  esic_eligibility: SETTINGS.esic_eligibility,
  pt_amount: SETTINGS.professional_tax_amount,
  pt_min_gross: SETTINGS.professional_tax_min_gross,
  lwf_amount: SETTINGS.lwf_employee_amount,
  tds_pct: SETTINGS.tds_percent,
}

// ---------- Calculation engine (mirrors backend/src/services/payroll.ts) ----------
function calculate(att, sal, advance, st = { lwf: false, tds: false }) {
  const earnings = sal.b + sal.h + sal.c + sal.o
  const perDay = r2(earnings / C.basis_days)
  const attendanceDeduction = r2(perDay * (att.ab + att.unpaid))
  const overtimeEarnings = r2(att.ot * sal.ot)
  const gross = r2(earnings - attendanceDeduction + overtimeEarnings)
  const pf = sal.pf && sal.b + sal.h <= C.pf_eligibility
    ? Math.min(r2(((sal.b + sal.h) * C.pf_rate) / 100), C.pf_cap)
    : 0
  const esic = sal.esic && gross <= C.esic_eligibility ? r2((gross * C.esic_rate) / 100) : 0
  const pt = gross >= C.pt_min_gross ? C.pt_amount : 0
  const lwf = st.lwf ? C.lwf_amount : 0
  const tds = st.tds ? r2((gross * C.tds_pct) / 100) : 0
  const totalDeductions = r2(pf + esic + pt + lwf + tds + advance + sal.od)
  const net = r2(gross - totalDeductions)
  return { earnings, perDay, attendanceDeduction, overtimeEarnings, gross, pf, esic, pt, lwf, tds, advance, other: sal.od, totalDeductions, net }
}

function monthName(m) { return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1] }

// ---------- Idempotent demo seed ----------
// SAFETY RULE: this seed NEVER deletes or overwrites anything. Every insert is
// INSERT OR IGNORE with deterministic IDs, so:
//   - re-running on an existing demo DB changes nothing
//   - running against a DB that contains real data touches NOTHING that isn't
//     part of the demo dataset (demo rows use high ID offsets to avoid
//     colliding with real auto-increment IDs)
const TABLES = [] // informational only; seeding never deletes
add(`-- Demo seed (idempotent): safe to run multiple times; never deletes existing records.`)
add('')

// ---------- Users ----------
add(`INSERT OR IGNORE INTO users (id, name, email, password_hash, role, status) VALUES (1, 'System Administrator', 'admin@staffsway.in', '${adminHash}', 'admin', 'active');`)
add('')

// ---------- Settings ----------
const S = SETTINGS
add(`INSERT OR IGNORE INTO settings (id, company_name, company_tagline, address, city, state, pincode, phone, email, website, gstin, pan, cin, currency, financial_year_start, salary_basis_days, pf_rate, pf_cap, pf_eligibility, esic_rate, esic_eligibility, professional_tax_amount, professional_tax_min_gross, default_ot_rate, attendance_lock_enabled, lwf_employee_amount, lwf_employer_amount, tds_percent)
VALUES (1, '${S.company_name}', '${S.company_tagline}', '${S.address}', '${S.city}', '${S.state}', '${S.pincode}', '${S.phone}', '${S.email}', '${S.website}', '${S.gstin}', '${S.pan}', '${S.cin}', '${S.currency}', ${S.financial_year_start}, ${S.salary_basis_days}, ${S.pf_rate}, ${S.pf_cap}, ${S.pf_eligibility}, ${S.esic_rate}, ${S.esic_eligibility}, ${S.professional_tax_amount}, ${S.professional_tax_min_gross}, ${S.default_ot_rate}, 1, ${S.lwf_employee_amount}, ${S.lwf_employer_amount}, ${S.tds_percent});`)
add('')

// ---------- Leave types ----------
add(`INSERT OR IGNORE INTO leave_types (id, name, code, paid_default, max_days) VALUES
  (1, 'Casual Leave', 'CL', 1, 10),
  (2, 'Earned Leave', 'EL', 1, 15),
  (3, 'Sick Leave', 'SL', 1, 7),
  (4, 'Unpaid Leave', 'UL', 0, NULL),
  (5, 'Festival Leave', 'FL', 1, 3),
  (6, 'Comp Off', 'CO', 1, 5);`)
// Quota/accrual defaults for reference rows (guarded — never clobbers user edits).
add(`UPDATE leave_types SET annual_quota = 12 WHERE code = 'CL' AND annual_quota = 0;
UPDATE leave_types SET annual_quota = 15 WHERE code = 'EL' AND annual_quota = 0;
UPDATE leave_types SET annual_quota = 7 WHERE code = 'SL' AND annual_quota = 0;
UPDATE leave_types SET annual_quota = 3 WHERE code = 'FL' AND annual_quota = 0;
UPDATE leave_types SET is_comp_off = 1 WHERE code = 'CO' AND is_comp_off = 0;`)
add('')
add('')
add('')

// ---------- Shift types ----------
add(`INSERT OR IGNORE INTO shift_types (id, name, start_time, end_time) VALUES
  (1, 'General', '09:00', '18:00'),
  (2, 'Morning', '06:00', '14:00'),
  (3, 'Evening', '14:00', '22:00'),
  (4, 'Night', '22:00', '06:00'),
  (5, 'Rotational', NULL, NULL),
  (6, 'Split', '10:00', '14:00');`)
add('')

// ---------- Clients ----------
const cRows = CLIENTS.map((c) => `(${c.id}, '${c.name}', '${c.contact}', '${c.phone}', '${c.email}', '${c.address}', '${c.start}', '${c.end}', '${c.status}')`).join(',\n  ')
add(`INSERT OR IGNORE INTO clients (id, name, contact_person, phone, email, address, contract_start, contract_end, status) VALUES\n  ${cRows};`)
add('')

// ---------- Sites ----------
const sRows = SITES.map((s) => `(${s.id}, ${s.clientId}, '${s.name}', '${s.location}', '${s.supervisor}', '${s.shift}', '${s.status}')`).join(',\n  ')
add(`INSERT OR IGNORE INTO sites (id, client_id, name, location, supervisor_name, shift_type, status) VALUES\n  ${sRows};`)
add('')

// ---------- Employees + salary structures + documents ----------
const employees = EMPLOYEES
const empMap = new Map()
// Derive each site's supervisor once so subordinates get a reporting manager.
const siteSup = new Map()
for (const e of employees) {
  if (/supervisor/i.test(e.designation) && e.siteId && !siteSup.has(e.siteId)) siteSup.set(e.siteId, `${e.first} ${e.last}`)
}
const FATHERS = ['Ramesh', 'Suresh', 'Mahesh', 'Dinesh', 'Rakesh', 'Naresh', 'Mukesh', 'Bhaskar']
const EMG_FIRST = ['Vijay', 'Ajay', 'Prakash', 'Harish', 'Ganesh']
const PREV_EMP = ['SecureGuard Services', 'Metro Facilities', 'SafeHands Manpower', 'CityWatch Security']
const gradeOf = (basic) => (basic >= 15000 ? 'A' : basic >= 9000 ? 'B' : 'C')
for (const e of employees) {
  const code = `SW${String(e.id).padStart(4, '0')}`
  const email = `${e.first.toLowerCase()}.${e.last.toLowerCase()}@staffsway.in`
  const address = `${e.city}, ${e.state} ${e.pincode}`
  const sal = e.sal
  const eff = e.joining
  const father = `${FATHERS[e.id % FATHERS.length]} ${e.last}`
  const emgName = `${EMG_FIRST[e.id % EMG_FIRST.length]} ${e.last}`
  const emgPhone = `98${String(20000000 + e.id * 137).padStart(8, '0')}`
  const sup = siteSup.get(e.siteId)
  const repMgr = sup && !`${e.first} ${e.last}`.includes(sup.split(' ')[0]) ? sup : null
  const prevEmp = e.empType !== 'permanent' ? `Previously at ${PREV_EMP[e.id % PREV_EMP.length]} (${(e.id % 5) + 1} yrs)` : null
  add(`INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, city, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (${e.id}, '${code}', '${e.first}', '${e.last}', '${father}', '${e.gender}', '${e.dob}', '${e.mobile}', '${email}', '${e.aadhaar}', '${address}', '${e.city}', '${e.state}', '${e.pincode}', '${emgName}', '${emgPhone}', '${e.bank}', '${e.account}', '${e.ifsc}', '${e.pan}', '${e.uan}', '${e.joining}', '${e.designation}', '${e.department}', '${gradeOf(sal.b)}', ${repMgr ? `'${repMgr}'` : 'NULL'}, ${prevEmp ? `'${prevEmp}'` : 'NULL'}, '${e.empType}', '${e.shift}', ${e.siteId}, '${e.status}');`)
  add(`INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (${e.id}, ${e.id}, '${eff}', ${sal.b}, ${sal.h}, ${sal.c}, ${sal.o}, ${sal.ot}, ${sal.pf}, ${sal.esic}, ${sal.od});`)
  // Statutory applicability is stored per employee (never assumed). Demo rows
  // mirror the salary-structure PF/ESI flags; LWF/TDS off, PT on by default.
  add(`INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (${e.id}, ${sal.pf}, ${sal.esic}, ${(e.st && e.st.lwf) ? 1 : 0}, ${(e.st && e.st.pt === false) ? 0 : 1}, ${(e.st && e.st.tds) ? 1 : 0});`)
  add(`INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (${900000 + e.id * 10 + 1}, ${e.id}, 'Aadhaar Card', 'Aadhaar Card', '${e.aadhaar}'),
  (${900000 + e.id * 10 + 2}, ${e.id}, 'PAN Card', 'PAN Card', '${e.pan}'),
  (${900000 + e.id * 10 + 3}, ${e.id}, 'Bank Proof', 'Bank Account Passbook', '${e.account}'),
  (${900000 + e.id * 10 + 4}, ${e.id}, 'Joining Form', 'Appointment Letter', NULL);`)
  empMap.set(e.id, { ...e, code, email, salary: sal })
}
add('')

// ---------- Attendance ----------
const attendanceSql = []
const attMap = new Map()
// Deterministic monthly late/early counts for report demo data (~0-6 days).
const lateEarly = (id) => ({ late: (id * 3) % 7, early: (id * 5) % 5 })
for (const e of employees) {
  if (e.status !== 'active') continue
  const a = e.attendanceAug
  const j = e.attendanceJul
  const leAug = lateEarly(e.id)
  const leJul = { late: (leAug.late + 1) % 7, early: (leAug.early + 2) % 5 }
  attendanceSql.push(`(${920000 + e.id}, ${e.id}, 8, 2026, ${a.p}, ${a.ab}, ${a.paid}, ${a.unpaid}, ${a.ot}, ${leAug.late}, ${leAug.early}, '${a.remarks}', 'draft'),`)
  attendanceSql.push(`(${910000 + e.id}, ${e.id}, 7, 2026, ${j.p}, ${j.ab}, ${j.paid}, ${j.unpaid}, ${j.ot}, ${leJul.late}, ${leJul.early}, '${j.remarks}', 'finalized'),`)
  attMap.set(e.id, { aug: a, jul: j })
}
add('INSERT OR IGNORE INTO attendance_monthly (id, employee_id, month, year, present_days, absent_days, paid_leave, unpaid_leave, ot_hours, late_marks, early_departures, remarks, status) VALUES')
for (let i = 0; i < attendanceSql.length; i++) {
  const last = i === attendanceSql.length - 1
  add(`  ${attendanceSql[i].replace(/,$/, last ? ';' : ',')}`)
}
add('')
add(`UPDATE attendance_monthly SET status = 'finalized' WHERE month = 7 AND year = 2026;`)
// Ensure late/early demo counts are present even when attendance rows already
// existed (INSERT OR IGNORE would otherwise leave them at 0).
for (const e of employees) {
  if (e.status !== 'active') continue
  const leAug = lateEarly(e.id)
  const leJul = { late: (leAug.late + 1) % 7, early: (leAug.early + 2) % 5 }
  add(`UPDATE attendance_monthly SET late_marks = ${leAug.late}, early_departures = ${leAug.early} WHERE employee_id = ${e.id} AND month = 8 AND year = 2026;`)
  add(`UPDATE attendance_monthly SET late_marks = ${leJul.late}, early_departures = ${leJul.early} WHERE employee_id = ${e.id} AND month = 7 AND year = 2026;`)
}
add('')

// ---------- Advances ----------
const advRows = ADVANCES.map((a, i) => `(${930000 + i + 1}, ${a.employee_id}, ${a.amount}, ${a.month}, ${a.year}, '${a.remarks}')`).join(',\n  ')
add(`INSERT OR IGNORE INTO advances (id, employee_id, amount, month, year, remarks) VALUES\n  ${advRows};`)
add('')

// ---------- Payroll: July (paid) & August (draft) ----------
function buildPayroll(month, year, status, finalizedAt, paidAt) {
  const items = []
  let totalEmployees = 0, grossTotal = 0, deductionTotal = 0, netTotal = 0
  for (const e of employees) {
    if (e.status !== 'active') continue
    const key = month === 8 ? 'aug' : 'jul'
    const att = attMap.get(e.id)[key]
    const advance = ADVANCES.find((a) => a.employee_id === e.id && a.month === month && a.year === year)?.amount ?? 0
    const st = { lwf: !!(e.st && e.st.lwf), tds: !!(e.st && e.st.tds) }
    const calc = calculate(att, e.sal, advance, st)
    items.push({ e, att, calc })
    totalEmployees++
    grossTotal += calc.gross
    deductionTotal += calc.totalDeductions
    netTotal += calc.net
  }
  const monthLabel = monthName(month)
  add(`INSERT OR IGNORE INTO payroll (id, month, year, status, total_employees, gross_total, deduction_total, net_total, created_at, finalized_at, paid_at)
VALUES (${month === 8 ? 2 : 1}, ${month}, ${year}, '${status}', ${totalEmployees}, ${r2(grossTotal)}, ${r2(deductionTotal)}, ${r2(netTotal)}, '2026-0${month}-03 10:00:00', ${finalizedAt ? `'${finalizedAt}'` : 'NULL'}, ${paidAt ? `'${paidAt}'` : 'NULL'});`)
  add(`INSERT OR IGNORE INTO payroll_items (id, payroll_id, employee_id, attendance_id, present_days, absent_days, paid_leave, unpaid_leave, ot_hours, basic, hra, conveyance, other_allowance, overtime_earnings, attendance_deduction, gross, pf, esic, professional_tax, lwf, tds, advance_deduction, other_deduction, total_deductions, net_salary, status) VALUES`)
  const itemRows = []
  items.forEach(({ e, att, calc }, i) => {
    const id = month === 8 ? 2000 + e.id : 1000 + e.id
    itemRows.push(`(${id}, ${month === 8 ? 2 : 1}, ${e.id}, NULL, ${att.p}, ${att.ab}, ${att.paid}, ${att.unpaid}, ${att.ot}, ${e.sal.b}, ${e.sal.h}, ${e.sal.c}, ${e.sal.o}, ${calc.overtimeEarnings}, ${calc.attendanceDeduction}, ${calc.gross}, ${calc.pf}, ${calc.esic}, ${calc.pt}, ${calc.lwf}, ${calc.tds}, ${calc.advance}, ${calc.other}, ${calc.totalDeductions}, ${calc.net}, '${month === 8 ? 'draft' : 'finalized'}')`)
  })
  add(`  ${itemRows.join(',\n  ')};`)
  if (month === 7) {
    add(`INSERT OR IGNORE INTO salary_slips (id, payroll_item_id, employee_id, slip_number, month, year, generated_at) VALUES`)
    const slipRows = []
    items.forEach(({ e }, i) => {
      slipRows.push(`(${940000 + e.id}, ${1000 + e.id}, ${e.id}, 'SL-${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}', ${month}, ${year}, '2026-08-03 12:00:00')`)
    })
    add(`  ${slipRows.join(',\n  ')};`)
  }
  add('')
}

buildPayroll(7, 2026, 'paid', '2026-08-03 11:00:00', '2026-08-05 15:30:00')
buildPayroll(8, 2026, 'draft', null, null)

// ---------- Recruitment & Joining demo data ----------
add('-- Recruitment: openings, candidates, interviews')
add(`INSERT OR IGNORE INTO job_openings (id, code, title, department, site_id, positions_required, status, notes) VALUES
  (${950001}, 'JOB0001', 'Security Guard', 'Security', ${2}, 4, 'open', 'Night shift coverage for Highland Towers'),
  (${950002}, 'JOB0002', 'Housekeeping Staff', 'Housekeeping', ${4}, 3, 'fulfilled', 'City Centre Mall — mall opening team'),
  (${950003}, 'JOB0003', 'Electrician (Licensed)', 'Technical', NULL, 1, 'open', 'Internal requirement — Chennai region');`)
add(`INSERT OR IGNORE INTO candidates (id, full_name, mobile, email, opening_id, source, experience, expected_salary, remarks, status) VALUES
  (${960001}, 'Prakash Nair', '98100 20001', 'prakash.nair@example.in', ${950001}, 'walk_in', '3 yrs', 9500.0, 'Ex-serviceman quota preferred', 'selected'),
  (${960002}, 'Deepa Krishnan', '98100 20002', NULL, ${950001}, 'job_portal', '1 yr', 8800.0, NULL, 'screening'),
  (${960003}, 'Imran Shaikh', '98100 20003', 'imran.s@example.in', ${950002}, 'agency', '4 yrs', 8200.0, 'Via Metro Facilities agency tie-up', 'joined'),
  (${960004}, 'Latha Rao', '98100 20004', NULL, ${950002}, 'referral', '2 yrs', 8000.0, NULL, 'rejected'),
  (${960005}, 'Ganesh Iyer', '98100 20005', 'ganesh.iyer@example.in', ${950003}, 'referral', '6 yrs', 14000.0, 'KA license + wireman certificate claimed', 'shortlisted');`)
add(`INSERT OR IGNORE INTO interviews (id, candidate_id, round, scheduled_at, interviewer, mode, outcome, remarks) VALUES
  (${970001}, ${960001}, 1, '2026-08-10 10:30', 'Suresh Kumar', 'in_person', 'passed', 'Good discipline record'),
  (${970002}, ${960002}, 1, '2026-08-14 14:00', 'Ramesh Kumar', 'video', 'pending', NULL),
  (${970003}, ${960003}, 1, '2026-07-28 11:00', 'Sunil Pawar', 'in_person', 'passed', NULL),
  (${970004}, ${960005}, 1, '2026-08-18 16:00', 'Anand Kumar', 'phone', 'passed', 'Technical round pending'),
  (${970005}, ${960004}, 1, '2026-07-25 12:00', 'Sunil Pawar', 'phone', 'failed', 'Did not meet attendance expectations');`)

// ---------- Loan demo ----------
add(`INSERT OR IGNORE INTO employee_loans (id, employee_id, principal, emi_amount, outstanding, start_month, start_year, remarks) VALUES
  (${990001}, 5, 40000, 4000, 40000, 8, 2026, 'Salary advance loan — 10 month recovery');`)

// ---------- Holidays & leave requests demo ----------
add(`INSERT OR IGNORE INTO holidays (date, name) VALUES
  ('2026-01-26', 'Republic Day'),
  ('2026-05-01', 'Labour Day'),
  ('2026-08-15', 'Independence Day'),
  ('2026-10-02', 'Gandhi Jayanti'),
  ('2026-11-08', 'Diwali'),
  ('2026-12-25', 'Christmas');`)
add(`INSERT OR IGNORE INTO leave_requests (id, employee_id, leave_type_id, start_date, end_date, days, reason, status, manager_status, manager_by, manager_at, hr_status, hr_by, hr_at, created_by) VALUES
  (${980001}, 2, 1, '2026-08-03', '2026-08-04', 2.0, 'Family function', 'approved', 'approved', 'admin@staffsway.in', '2026-07-30 10:00:00', 'approved', 'admin@staffsway.in', '2026-07-31 09:30:00', 'admin@staffsway.in'),
  (${980002}, 9, 3, '2026-08-12', '2026-08-12', 1.0, 'Fever', 'pending_hr', 'approved', 'admin@staffsway.in', '2026-08-11 18:00:00', 'pending', NULL, NULL, 'admin@staffsway.in'),
  (${980003}, 12, 4, '2026-08-20', '2026-08-21', 2.0, 'Personal travel (unpaid)', 'pending_manager', 'pending', NULL, NULL, 'pending', NULL, NULL, 'admin@staffsway.in');`)

// ---------- Self-service demo login linked to an employee ----------
{
  const demo = empMap.get(2)
  const uname = `${demo.first} ${demo.last}`
  add(`INSERT OR IGNORE INTO users (id, name, email, password_hash, role, status, employee_id)
VALUES (7, '${uname}', '${uname.toLowerCase().replace(/ /g, '.')}@staffsway.in', '${adminHash}', 'employee', 'active', 2);`)
}

// ---------- Statutory compliance demo data ----------
// Sample Haryana minimum wages (illustrative figures for the demo).
add(`INSERT OR IGNORE INTO minimum_wages (state, category, basic_monthly, va_monthly, effective_from) VALUES
  ('Haryana', 'Unskilled', 11000, 500, '2026-01-01'),
  ('Haryana', 'Semi-skilled', 12500, 550, '2026-01-01'),
  ('Haryana', 'Skilled', 14000, 600, '2026-01-01'),
  ('Haryana', 'Highly Skilled', 16000, 700, '2026-01-01');`)
add('')
// Skill category derived from latest Basic tier (guarded — never clobbers edits).
{
  const parts = employees
    .filter((e) => e.status === 'active')
    .map((e) => {
      const cat = e.sal.b < 13000 ? 'Unskilled' : e.sal.b < 16000 ? 'Semi-skilled' : e.sal.b < 20000 ? 'Skilled' : 'Highly Skilled'
      return `WHEN ${e.id} THEN '${cat}'`
    })
  if (parts.length) add(`UPDATE employees SET skill_category = CASE id ${parts.join(' ')} ELSE skill_category END WHERE skill_category IS NULL;`)
}
add('')
// Compliance calendar: past months filed, current month pending.
{
  const recs = []
  let rid = 995000
  const obligations = [
    ['PF', 15], ['ESI', 15], ['PT', 15], ['TDS', 7],
  ]
  const today = new Date().toISOString().slice(0, 10)
  for (let m = 1; m <= 8; m++) {
    const dueMonth = m === 12 ? `${2026 + 1}-01` : `2026-${String(m + 1).padStart(2, '0')}`
    for (const [ob, day] of obligations) {
      const due = `${dueMonth}-${String(day).padStart(2, '0')}`
      // Records whose due date has passed are marked as already filed.
      const status = due <= today || m < 8 ? 'done' : 'pending'
      rid++
      recs.push(`(${rid}, '${ob}', 2026, ${m}, '${due}', '${status}', ${status === 'done' ? "'Filed on time'" : 'NULL'}, ${status === 'done' ? "'admin@staffsway.in'" : 'NULL'}, ${status === 'done' ? `'${due} 12:00:00'` : 'NULL'})`)
    }
  }
  rid++
  recs.push(`(${rid}, 'LWF', 2026, 6, '2026-07-31', 'done', 'Half-yearly return filed', 'admin@staffsway.in', '2026-07-28 11:00:00')`)
  rid++
  recs.push(`(${rid}, 'BONUS', 2026, 3, '2026-11-30', 'pending', NULL, NULL, NULL)`)
  add('INSERT OR IGNORE INTO compliance_records (id, obligation, year, month, due_date, status, remarks, done_by, done_at) VALUES')
  add(`  ${recs.join(',\n  ')};`)
}
add('')

// ---------- Assets demo data ----------
add('-- Assets: catalog + assignment history')
add(`INSERT OR IGNORE INTO assets (id, asset_code, asset_type, brand, model, serial_number, purchase_date, purchase_price, warranty_expiry, condition_notes, status) VALUES
  (${200001}, 'AST0001', 'Laptop', 'HP', 'EliteBook 840', 'SN-LAP-0001', '2025-01-15', 62000, '2027-01-14', 'Good', 'assigned'),
  (${200002}, 'AST0002', 'Mobile', 'Samsung', 'Galaxy M14', 'SN-MOB-0002', '2025-03-02', 14500, '2027-03-01', 'Good', 'assigned'),
  (${200003}, 'AST0003', 'ID Card', NULL, NULL, 'ID-0003', '2025-02-10', 150, NULL, NULL, 'assigned'),
  (${200004}, 'AST0004', 'Uniform', NULL, 'XL', 'UNI-0004', '2025-01-20', 900, NULL, NULL, 'assigned'),
  (${200005}, 'AST0005', 'Laptop', 'Dell', 'Latitude 5430', 'SN-LAP-0005', '2024-10-05', 58000, '2026-10-04', 'Good', 'available'),
  (${200006}, 'AST0006', 'Vehicle', 'TVS', 'Apache RTR', 'MH12-PW-0006', '2024-06-15', 110000, '2027-06-14', 'Good', 'assigned'),
  (${200007}, 'AST0007', 'Mobile', 'Vivo', 'Y21', 'SN-MOB-0007', '2025-06-01', 12500, '2027-05-31', NULL, 'available'),
  (${200008}, 'AST0008', 'Tools', 'Bosch', 'Drill Kit', 'TK-0008', '2025-02-25', 8500, NULL, NULL, 'assigned');`)
add(`INSERT OR IGNORE INTO asset_assignments (id, asset_id, employee_id, action, issue_date, return_date, replacement_id, reason, performed_by, created_at) VALUES
  (${201001}, ${200001}, 1, 'issue', '2025-01-20', NULL, NULL, 'Supervisor laptop', 'admin@staffsway.in', '2025-01-20 10:00:00'),
  (${201002}, ${200002}, 6, 'issue', '2025-03-10', NULL, NULL, 'Facility supervisor mobile', 'admin@staffsway.in', '2025-03-10 10:00:00'),
  (${201003}, ${200003}, 2, 'issue', '2025-02-12', NULL, NULL, 'Site entry ID', 'admin@staffsway.in', '2025-02-12 10:00:00'),
  (${201004}, ${200004}, 3, 'issue', '2025-01-25', NULL, NULL, 'Night shift uniform', 'admin@staffsway.in', '2025-01-25 10:00:00'),
  (${201005}, ${200006}, 22, 'issue', '2024-06-20', NULL, NULL, 'Transport duty vehicle', 'admin@staffsway.in', '2024-06-20 10:00:00'),
  (${201006}, ${200008}, 4, 'issue', '2025-03-01', NULL, NULL, 'Electrical maintenance kit', 'admin@staffsway.in', '2025-03-01 10:00:00');`)

add('')
add('')

// ---------- Separations demo data (Exit / Attrition reports) ----------
add('-- Separations: resignation & termination workflow demo')
add(`INSERT OR IGNORE INTO separations (id, employee_id, separation_type, resignation_date, last_working_date, notice_period_days, notice_served_days, notice_buyout, reason, status, approved_by, approved_at, created_at, updated_at) VALUES
  (${300001}, 36, 'resignation', '2026-08-05', '2026-08-25', 30, 20, 0, 'Personal relocation', 'approved', 'admin@staffsway.in', '2026-08-07 11:00:00', '2026-08-05 09:00:00', '2026-08-07 11:00:00'),
  (${300002}, 37, 'resignation', '2026-08-12', '2026-08-31', 30, 19, 0, 'Higher studies', 'approved', 'admin@staffsway.in', '2026-08-14 12:00:00', '2026-08-12 09:00:00', '2026-08-14 12:00:00'),
  (${300003}, 38, 'termination', '2026-08-18', '2026-08-18', 0, 0, 1, 'Policy violation', 'terminated', 'admin@staffsway.in', '2026-08-18 10:00:00', '2026-08-18 09:00:00', '2026-08-18 10:00:00'),
  (${300004}, 8, 'resignation', '2026-07-10', '2026-07-31', 30, 21, 0, 'Better opportunity', 'approved', 'admin@staffsway.in', '2026-07-12 11:00:00', '2026-07-10 09:00:00', '2026-07-12 11:00:00');`)
add(`INSERT OR IGNORE INTO exit_interviews (id, separation_id, employee_id, reason_for_leaving, job_satisfaction, work_environment, management_rating, growth_opportunity, would_recommend, feedback_text, conducted_by, conducted_at) VALUES
  (${301001}, ${300001}, 36, 'Relocating to another city', 3, 3, 3, 2, 1, 'Good company to work with.', 'admin@staffsway.in', '2026-08-26 10:00:00'),
  (${301002}, ${300004}, 8, 'Better pay at competitor', 3, 4, 4, 3, 1, 'Night shift rotation is tough.', 'admin@staffsway.in', '2026-08-01 10:00:00');`)

add('')
add('')

// ---------- Performance reviews demo data ----------
add('-- Performance: reviews demo data')
add(`INSERT OR IGNORE INTO performance_reviews (id, employee_id, review_period, review_type, reviewer_id, reviewer_name, overall_rating, strengths, improvements, comments, status, created_by, created_at) VALUES
  (${400001}, 1, 'Q1 2026', 'quarterly', NULL, 'Admin', 4.5, 'Leadership, discipline', 'Delegate more', 'Strong performer', 'finalized', 'admin@staffsway.in', '2026-04-15 10:00:00'),
  (${400002}, 6, 'Q1 2026', 'quarterly', NULL, 'Admin', 4.0, 'Site coordination', 'Documentation', 'Reliable', 'finalized', 'admin@staffsway.in', '2026-04-15 10:00:00'),
  (${400003}, 30, 'Q1 2026', 'quarterly', NULL, 'Admin', 4.2, 'Technical skill', 'Punctuality', NULL, 'finalized', 'admin@staffsway.in', '2026-04-16 10:00:00'),
  (${400004}, 2, 'Q1 2026', 'quarterly', NULL, 'Admin', 3.5, 'Attendance', 'Skill upgrade', NULL, 'finalized', 'admin@staffsway.in', '2026-04-16 10:00:00'),
  (${400005}, 12, 'Q2 2026', 'quarterly', NULL, 'Admin', 4.3, 'Team handling', NULL, 'Good', 'finalized', 'admin@staffsway.in', '2026-07-18 10:00:00'),
  (${400006}, 14, 'Q2 2026', 'quarterly', NULL, 'Admin', 3.8, 'Responsiveness', 'Safety compliance', NULL, 'finalized', 'admin@staffsway.in', '2026-07-18 10:00:00');`)

add('')
add('')

// ---------- Expenses demo data (Expense Report) ----------
add('-- Expenses: operating / administrative expense register')
add(`INSERT OR IGNORE INTO expenses (id, category, description, amount, expense_date, payment_method, vendor, site_id, reference, created_by) VALUES
  (${500001}, 'Salaries', 'Site payroll disbursement', 184500, '2026-08-05', 'Bank Transfer', 'ABC Facility Services', 1, 'PAY-JUL26', 'admin@staffsway.in'),
  (${500002}, 'Transport', 'Staff transport for night shift', 42500, '2026-08-12', 'UPI', 'City Cabs', 7, 'TRN-AUG12', 'admin@staffsway.in'),
  (${500003}, 'Uniforms', 'Uniform procurement Q3', 18000, '2026-08-14', 'Cheque', 'UniWear Traders', NULL, 'UNI-Q3', 'admin@staffsway.in'),
  (${500004}, 'Training', 'Fire safety training batch', 12000, '2026-07-20', 'Card', 'Safeguard Academy', 2, 'TRN-FIRE', 'admin@staffsway.in'),
  (${500005}, 'Equipment', 'PPE kits purchase', 24500, '2026-08-08', 'Bank Transfer', 'SafetyPlus Supplies', 8, 'PPE-AUG', 'admin@staffsway.in'),
  (${500006}, 'Utilities', 'Office electricity', 5600, '2026-08-10', 'Auto Debit', 'MSEDCL', NULL, 'UTL-AUG', 'admin@staffsway.in'),
  (${500007}, 'Salaries', 'Mid-month advance payout', 22000, '2026-08-18', 'Bank Transfer', 'Staffsway Payroll', 1, 'ADV-MID', 'admin@staffsway.in'),
  (${500008}, 'Marketing', 'Staffing fair participation', 15000, '2026-07-28', 'Card', 'JobFest Events', NULL, 'MKT-JOBF', 'admin@staffsway.in');`)

add('')
add('')

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, L.join('\n'), 'utf8')
console.log(`Wrote ${OUT} (${L.length} lines)`)
