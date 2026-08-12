// Core generator: reads data from seed-data.mjs and writes db/seed.sql
import { createHash } from 'node:crypto'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ADMIN_PASSWORD, SALT, SETTINGS, CLIENTS, SITES, EMPLOYEES, ADVANCES } from './seed-data.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'db', 'seed.sql')

const r2 = (n) => Math.round(n * 100) / 100
const adminHash = `${SALT}$${createHash('sha256').update(`${SALT}:${ADMIN_PASSWORD}`).digest('hex')}`

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
}

// ---------- Calculation engine (mirrors backend/src/services/payroll.ts) ----------
function calculate(att, sal, advance) {
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
  const totalDeductions = r2(pf + esic + pt + advance + sal.od)
  const net = r2(gross - totalDeductions)
  return { earnings, perDay, attendanceDeduction, overtimeEarnings, gross, pf, esic, pt, advance, other: sal.od, totalDeductions, net }
}

function monthName(m) { return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1] }

// ---------- Wipe (safe re-runs) ----------
const TABLES = ['salary_slips','payroll_items','payroll','advances','attendance_monthly','salary_structures','employee_documents','employees','sites','clients','leave_types','shift_types','settings','users']
for (const t of TABLES) add(`DELETE FROM ${t};`)
add('')
add(`DELETE FROM sqlite_sequence WHERE name IN ('${TABLES.join("','")}');`)
add('')

// ---------- Users ----------
add(`INSERT INTO users (id, name, email, password_hash, role, status) VALUES (1, 'System Administrator', 'admin@staffsway.in', '${adminHash}', 'admin', 'active');`)
add('')

// ---------- Settings ----------
const S = SETTINGS
add(`INSERT INTO settings (id, company_name, company_tagline, address, city, state, pincode, phone, email, website, gstin, pan, cin, currency, financial_year_start, salary_basis_days, pf_rate, pf_cap, pf_eligibility, esic_rate, esic_eligibility, professional_tax_amount, professional_tax_min_gross, default_ot_rate, attendance_lock_enabled)
VALUES (1, '${S.company_name}', '${S.company_tagline}', '${S.address}', '${S.city}', '${S.state}', '${S.pincode}', '${S.phone}', '${S.email}', '${S.website}', '${S.gstin}', '${S.pan}', '${S.cin}', '${S.currency}', ${S.financial_year_start}, ${S.salary_basis_days}, ${S.pf_rate}, ${S.pf_cap}, ${S.pf_eligibility}, ${S.esic_rate}, ${S.esic_eligibility}, ${S.professional_tax_amount}, ${S.professional_tax_min_gross}, ${S.default_ot_rate}, 1);`)
add('')

// ---------- Leave types ----------
add(`INSERT INTO leave_types (id, name, code, paid_default, max_days) VALUES
  (1, 'Casual Leave', 'CL', 1, 10),
  (2, 'Earned Leave', 'EL', 1, 15),
  (3, 'Sick Leave', 'SL', 1, 7),
  (4, 'Unpaid Leave', 'UL', 0, NULL),
  (5, 'Festival Leave', 'FL', 1, 3);`)
add('')

// ---------- Shift types ----------
add(`INSERT INTO shift_types (id, name, start_time, end_time) VALUES
  (1, 'General', '09:00', '18:00'),
  (2, 'Morning', '06:00', '14:00'),
  (3, 'Evening', '14:00', '22:00'),
  (4, 'Night', '22:00', '06:00'),
  (5, 'Rotational', NULL, NULL),
  (6, 'Split', '10:00', '14:00');`)
add('')

// ---------- Clients ----------
const cRows = CLIENTS.map((c) => `(${c.id}, '${c.name}', '${c.contact}', '${c.phone}', '${c.email}', '${c.address}', '${c.start}', '${c.end}', '${c.status}')`).join(',\n  ')
add(`INSERT INTO clients (id, name, contact_person, phone, email, address, contract_start, contract_end, status) VALUES\n  ${cRows};`)
add('')

// ---------- Sites ----------
const sRows = SITES.map((s) => `(${s.id}, ${s.clientId}, '${s.name}', '${s.location}', '${s.supervisor}', '${s.shift}', '${s.status}')`).join(',\n  ')
add(`INSERT INTO sites (id, client_id, name, location, supervisor_name, shift_type, status) VALUES\n  ${sRows};`)
add('')

// ---------- Employees + salary structures + documents ----------
const employees = EMPLOYEES
const empMap = new Map()
for (const e of employees) {
  const code = `PWS${String(e.id).padStart(4, '0')}`
  const email = `${e.first.toLowerCase()}.${e.last.toLowerCase()}@pws.in`
  const address = `${e.city}, ${e.state} ${e.pincode}`
  const sal = e.sal
  const eff = e.joining
  add(`INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (${e.id}, '${code}', '${e.first}', '${e.last}', '${e.gender}', '${e.dob}', '${e.mobile}', '${email}', '${address}', '${e.city}', '${e.state}', '${e.pincode}', '${e.bank}', '${e.account}', '${e.ifsc}', '${e.pan}', '${e.uan}', '${e.joining}', '${e.designation}', '${e.department}', '${e.empType}', '${e.shift}', ${e.siteId}, '${e.status}');`)
  add(`INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (${e.id}, ${e.id}, '${eff}', ${sal.b}, ${sal.h}, ${sal.c}, ${sal.o}, ${sal.ot}, ${sal.pf}, ${sal.esic}, ${sal.od});`)
  add(`INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (${e.id}, 'Aadhaar Card', 'Aadhaar Card', '${e.aadhaar}'),
  (${e.id}, 'PAN Card', 'PAN Card', '${e.pan}'),
  (${e.id}, 'Bank Proof', 'Bank Account Passbook', '${e.account}'),
  (${e.id}, 'Joining Form', 'Appointment Letter', NULL);`)
  empMap.set(e.id, { ...e, code, email, salary: sal })
}
add('')

// ---------- Attendance ----------
const attendanceSql = []
const attMap = new Map()
for (const e of employees) {
  if (e.status !== 'active') continue
  const a = e.attendanceAug
  const j = e.attendanceJul
  attendanceSql.push(`(${e.id}, 8, 2026, ${a.p}, ${a.ab}, ${a.paid}, ${a.unpaid}, ${a.ot}, '${a.remarks}', 'draft'),`)
  attendanceSql.push(`(${e.id}, 7, 2026, ${j.p}, ${j.ab}, ${j.paid}, ${j.unpaid}, ${j.ot}, '${j.remarks}', 'finalized'),`)
  attMap.set(e.id, { aug: a, jul: j })
}
add('INSERT INTO attendance_monthly (employee_id, month, year, present_days, absent_days, paid_leave, unpaid_leave, ot_hours, remarks, status) VALUES')
for (let i = 0; i < attendanceSql.length; i++) {
  const last = i === attendanceSql.length - 1
  add(`  ${attendanceSql[i].replace(/,$/, last ? ';' : ',')}`)
}
add('')
add(`UPDATE attendance_monthly SET status = 'finalized' WHERE month = 7 AND year = 2026;`)
add('')

// ---------- Advances ----------
const advRows = ADVANCES.map((a) => `(${a.employee_id}, ${a.amount}, ${a.month}, ${a.year}, '${a.remarks}')`).join(',\n  ')
add(`INSERT INTO advances (employee_id, amount, month, year, remarks) VALUES\n  ${advRows};`)
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
    const calc = calculate(att, e.sal, advance)
    items.push({ e, att, calc })
    totalEmployees++
    grossTotal += calc.gross
    deductionTotal += calc.totalDeductions
    netTotal += calc.net
  }
  const monthLabel = monthName(month)
  add(`INSERT INTO payroll (id, month, year, status, total_employees, gross_total, deduction_total, net_total, created_at, finalized_at, paid_at)
VALUES (${month === 8 ? 2 : 1}, ${month}, ${year}, '${status}', ${totalEmployees}, ${r2(grossTotal)}, ${r2(deductionTotal)}, ${r2(netTotal)}, '2026-0${month}-03 10:00:00', ${finalizedAt ? `'${finalizedAt}'` : 'NULL'}, ${paidAt ? `'${paidAt}'` : 'NULL'});`)
  add(`INSERT INTO payroll_items (id, payroll_id, employee_id, attendance_id, present_days, absent_days, paid_leave, unpaid_leave, ot_hours, basic, hra, conveyance, other_allowance, overtime_earnings, attendance_deduction, gross, pf, esic, professional_tax, advance_deduction, other_deduction, total_deductions, net_salary, status) VALUES`)
  const itemRows = []
  items.forEach(({ e, att, calc }, i) => {
    const id = month === 8 ? 2000 + e.id : 1000 + e.id
    itemRows.push(`(${id}, ${month === 8 ? 2 : 1}, ${e.id}, NULL, ${att.p}, ${att.ab}, ${att.paid}, ${att.unpaid}, ${att.ot}, ${e.sal.b}, ${e.sal.h}, ${e.sal.c}, ${e.sal.o}, ${calc.overtimeEarnings}, ${calc.attendanceDeduction}, ${calc.gross}, ${calc.pf}, ${calc.esic}, ${calc.pt}, ${calc.advance}, ${calc.other}, ${calc.totalDeductions}, ${calc.net}, '${month === 8 ? 'draft' : 'finalized'}')`)
  })
  add(`  ${itemRows.join(',\n  ')};`)
  if (month === 7) {
    add(`INSERT INTO salary_slips (payroll_item_id, employee_id, slip_number, month, year, generated_at) VALUES`)
    const slipRows = []
    items.forEach(({ e }, i) => {
      slipRows.push(`(${1000 + e.id}, ${e.id}, 'SL-${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}', ${month}, ${year}, '2026-08-03 12:00:00')`)
    })
    add(`  ${slipRows.join(',\n  ')};`)
  }
  add('')
}

buildPayroll(7, 2026, 'paid', '2026-08-03 11:00:00', '2026-08-05 15:30:00')
buildPayroll(8, 2026, 'draft', null, null)

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, L.join('\n'), 'utf8')
console.log(`Wrote ${OUT} (${L.length} lines)`)
