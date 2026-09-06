-- Migration 0017: Expand sites table into the full Site Master
-- Adds structured registered address, site incharge contact details,
-- operational settings (shifts keep existing shift_type column), payroll
-- toggles, and statutory & compliance toggles with editable default values.
-- Legacy columns (location, supervisor_name) are left dormant so existing
-- queries in other modules (employees, reports) keep working.

-- Address (same structure as clients)
ALTER TABLE sites ADD COLUMN address_line1 TEXT;
ALTER TABLE sites ADD COLUMN address_line2 TEXT;
ALTER TABLE sites ADD COLUMN city TEXT;
ALTER TABLE sites ADD COLUMN state TEXT;
ALTER TABLE sites ADD COLUMN district TEXT;
ALTER TABLE sites ADD COLUMN pincode TEXT;

-- Contact details (Site Incharge)
ALTER TABLE sites ADD COLUMN site_incharge TEXT;
ALTER TABLE sites ADD COLUMN site_incharge_designation TEXT;
ALTER TABLE sites ADD COLUMN site_incharge_contact TEXT;
ALTER TABLE sites ADD COLUMN site_incharge_email TEXT;

-- Operational details
ALTER TABLE sites ADD COLUMN overtime_enabled INTEGER NOT NULL DEFAULT 1;

-- Payroll settings
ALTER TABLE sites ADD COLUMN payroll_applicable INTEGER NOT NULL DEFAULT 1;
ALTER TABLE sites ADD COLUMN leave_policy_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE sites ADD COLUMN arrears_enabled INTEGER NOT NULL DEFAULT 0;

-- Statutory & compliance (toggle + editable default value)
ALTER TABLE sites ADD COLUMN pf_applicable INTEGER NOT NULL DEFAULT 1;
ALTER TABLE sites ADD COLUMN pf_percent REAL NOT NULL DEFAULT 12;
ALTER TABLE sites ADD COLUMN esic_applicable INTEGER NOT NULL DEFAULT 1;
ALTER TABLE sites ADD COLUMN esic_percent REAL NOT NULL DEFAULT 0.75;
ALTER TABLE sites ADD COLUMN lwf_applicable INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sites ADD COLUMN lwf_percent REAL NOT NULL DEFAULT 0.5;
ALTER TABLE sites ADD COLUMN pt_applicable INTEGER NOT NULL DEFAULT 1;
ALTER TABLE sites ADD COLUMN pt_amount REAL NOT NULL DEFAULT 200;
ALTER TABLE sites ADD COLUMN tds_applicable INTEGER NOT NULL DEFAULT 1;
ALTER TABLE sites ADD COLUMN tds_percent REAL NOT NULL DEFAULT 2;
ALTER TABLE sites ADD COLUMN gratuity_applicable INTEGER NOT NULL DEFAULT 1;