# Payroll Rules

Implemented in `backend/src/services/payroll.ts` (`calculatePayroll`). Pure function —
same inputs always produce same outputs; every output value is persisted to `payroll_items`.

## Inputs
- Attendance row: present, absent, paid_leave, unpaid_leave, ot_hours.
- Salary components: basic, hra, conveyance, other_allowance, overtime_rate.
- **Statutory flags (per employee)**: pf_applicable, esi_applicable, lwf_applicable,
  pt_applicable, tds_applicable — from `employee_statutory`.
- Settings: salary_basis_days, pf_rate/pf_cap/pf_eligibility, esic_rate/esic_eligibility,
  professional_tax_amount/min_gross, lwf_employee_amount, tds_percent.

## Formulas

Two attendance bases exist. **Grid months** (day-by-day `attendance_daily`) use
payable days; **legacy months** (counts only) fall back to absent/unpaid.

```
earned = basic + hra + conveyance + other_allowance

# --- payable-days basis (grid months) ---
per_day       = round2(earned / total_days)          # total_days = calendar days in month
payable_days  = P + R + HD + HF/2 + OT days          # X (pre-joining) excluded
attendance_deduction = round2(per_day × max(0, total_days − payable_days))
ot_earnings   = round2(ot_days × per_day)            # OT already inside payable_days
gross         = round2(per_day × payable_days + incentive + bonus + arrears)

# --- legacy count basis (no grid) ---
per_day       = round2(earned / days_in_month)
payable       = days_in_month − absent_days − unpaid_leave
attendance_deduction = round2(per_day × max(0, days_in_month − payable))
ot_earnings   = round2(ot_hours × hourly_rate)
gross         = round2(per_day × payable + ot_earnings + incentive + bonus + arrears)

# --- statutory (both bases) ---
pf            = pf_flag AND (basic+hra) ≤ pf_eligibility
                  ? min(round2((basic+hra) × pf_rate/100), pf_cap) : 0
esic          = esi_flag AND gross ≤ esic_eligibility ? round2(gross × esic_rate/100) : 0
pt            = pt_flag AND gross ≥ pt_min_gross ? pt_amount : 0
lwf           = lwf_flag ? lwf_employee_amount : 0        (flat until state slabs confirmed)
tds           = tds_flag ? round2(gross × tds_percent/100) : 0

total_deductions = round2(pf + esic + pt + lwf + tds + advance + loan_deduction + other_deduction)
net              = round2(gross − total_deductions)
```

`hourly_rate` derives from `overtime_rate`/`working_hours` (fallback 8) via
`hourlyRateFor`; `default_ot_rate` from settings is the last resort. All money is
`r2`-rounded at each step.

## Mandatory regression matrix (test on every payroll change)
| Employee profile | Expected |
|---|---|
| A: PF ✓ ESI ✗ LWF ✗ | PF only (+PT if enabled & eligible) |
| B: PF ✗ ESI ✓ LWF ✓ | ESIC + LWF, no PF |
| C: all off | Only advance + other deduction; net = gross − those |
| D: all on | Every component applied per thresholds |

Verify each against a hand-computed payslip before merging payroll changes.

## Traceability
`payroll_items` stores: days breakdown, OT hours/earnings, LOP amount, gross, each statutory
deduction, advance, other deduction, net. A payslip dispute is answered by reading the row —
never by re-running math.

## Lifecycle
preview (no writes) → generate (draft items) → finalize (lock run) → mark paid.
Attendance must be finalized for the month before the run can be finalized.
