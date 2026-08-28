import type { AttendanceRow, PayrollSettings } from '../types'
import { r2 } from '../utils/money'

/**
 * Payroll calculation engine.
 *
 * DELIBERATE DESIGN: this is a DEMO configuration. Statutory figures (PF rate,
 * ESIC rate, professional tax, caps) are sample values loaded from the Settings
 * table and are NOT claimed to reflect any client's real statutory obligations.
 *
 * Customization points for the final build:
 *  - Attendance deduction basis (per-day = earnings / salary_basis_days)
 *  - PF: rate, cap, and eligibility threshold
 *  - ESIC: rate and eligibility threshold
 *  - Professional tax: flat amount + minimum gross threshold
 *  - Per-employee overtime rate (from salary_structures)
 *  - Monthly advances (from advances table)
 *  - Per-employee fixed other deduction (from salary_structures)
 */

export interface SalaryLike {
  basic: number
  hra: number
  conveyance: number
  other_allowance: number
  overtime_rate: number
  pf_applicable: number
  esic_applicable: number
  other_deduction: number
}

/**
 * Per-employee statutory applicability. This is the source of truth for which
 * statutory components apply to THIS employee. Payroll must never assume a
 * component applies to everyone. When null (legacy rows), PF/ESI fall back to
 * salary_structures flags and LWF/PT/TDS default to off.
 */
export interface StatutoryFlags {
  pf_applicable: number
  esi_applicable: number
  lwf_applicable: number
  pt_applicable: number
  tds_applicable: number
}

export interface CalcInput {
  attendance: AttendanceRow | null
  salary: SalaryLike | null
  statutory?: StatutoryFlags | null
  advance: number
  incentive?: number
  bonus?: number
  arrears?: number
  loanDeduction?: number
  payrollSettings: PayrollSettings
}

export interface CalcResult {
  earnings: number
  perDay: number
  attendanceDeduction: number
  overtimeEarnings: number
  incentive: number
  bonus: number
  arrears: number
  gross: number
  pf: number
  esic: number
  professionalTax: number
  lwf: number
  tds: number
  advance: number
  loanDeduction: number
  otherDeduction: number
  totalDeductions: number
  net: number
}

export function calculatePayroll(input: CalcInput): CalcResult | null {
  const { attendance, salary, advance, payrollSettings: s } = input
  if (!attendance || !salary) return null

  const basic = salary.basic
  const hra = salary.hra
  const conveyance = salary.conveyance
  const otherAllowance = salary.other_allowance

  const earnings = basic + hra + conveyance + otherAllowance
  const perDay = r2(earnings / s.salary_basis_days)
  const absentDays = attendance.absent_days + attendance.unpaid_leave
  const attendanceDeduction = r2(perDay * absentDays)
  const overtimeEarnings = r2(attendance.ot_hours * salary.overtime_rate)
  const incentive = r2(Number(input.incentive || 0))
  const bonus = r2(Number(input.bonus || 0))
  const arrears = r2(Number(input.arrears || 0))
  const gross = r2(earnings - attendanceDeduction + overtimeEarnings + incentive + bonus + arrears)

  const pfApplicable = (input.statutory ? input.statutory.pf_applicable === 1 : salary.pf_applicable === 1) && basic + hra <= s.pf_eligibility
  const pf = pfApplicable ? Math.min(r2(((basic + hra) * s.pf_rate) / 100), s.pf_cap) : 0

  const esicApplicable = (input.statutory ? input.statutory.esi_applicable === 1 : salary.esic_applicable === 1) && gross <= s.esic_eligibility
  const esic = esicApplicable ? r2((gross * s.esic_rate) / 100) : 0

  const professionalTax = input.statutory?.pt_applicable === 1 && gross >= s.professional_tax_min_gross ? s.professional_tax_amount : 0

  // LWF: flat employee share from organization settings, only when applicable
  const lwf = input.statutory?.lwf_applicable === 1 ? r2(Number(s.lwf_employee_amount || 0)) : 0

  // TDS: configurable percentage of gross, only when applicable
  const tds = input.statutory?.tds_applicable === 1 && Number(s.tds_percent) > 0 ? r2((gross * Number(s.tds_percent)) / 100) : 0

  const loanDeduction = r2(Number(input.loanDeduction || 0))
  const totalDeductions = r2(pf + esic + professionalTax + lwf + tds + advance + loanDeduction + salary.other_deduction)
  const net = r2(gross - totalDeductions)

  return {
    earnings,
    perDay,
    attendanceDeduction,
    overtimeEarnings,
    incentive,
    bonus,
    arrears,
    gross,
    pf,
    esic,
    professionalTax,
    lwf,
    tds,
    advance,
    loanDeduction,
    otherDeduction: salary.other_deduction,
    totalDeductions,
    net,
  }
}

export function attendancePercent(att: AttendanceRow): number {
  const total = att.present_days + att.absent_days + att.paid_leave + att.unpaid_leave
  if (total <= 0) return 0
  return r2((att.present_days / total) * 100)
}
