-- Demo seed (idempotent): safe to run multiple times; never deletes existing records.

INSERT OR IGNORE INTO users (id, name, email, password_hash, role, status) VALUES (1, 'System Administrator', 'admin@staffsway.in', 'pbkdf2$100000$3feWcswJ08_aTXhowm5Bdw$kncTUIy8GG5uRfB9ZyW2lSTgXCsuIF856TEHVsuczMg', 'admin', 'active');

INSERT OR IGNORE INTO settings (id, company_name, company_tagline, address, state, pincode, phone, email, website, gstin, pan, cin, currency, financial_year_start, salary_basis_days, pf_rate, pf_cap, pf_eligibility, esic_rate, esic_eligibility, professional_tax_amount, professional_tax_min_gross, default_ot_rate, attendance_lock_enabled, lwf_employee_amount, lwf_employer_amount, tds_percent)
VALUES (1, 'Staffsway', 'Manpower Staffing & HRMS', '501 Corporate Tower, Andheri East', 'Maharashtra', '400069', '+91 22 4890 2200', 'info@staffsway.in', 'https://staffsway.in', '27AABCP8892Q1Z5', 'AABCP8892Q', 'U74900MH2014PTC284110', 'INR', 4, 26, 12, 1800, 15000, 0.75, 21000, 200, 10000, 80, 1, 100, 100, 2);

INSERT OR IGNORE INTO leave_types (id, name, code, paid_default, max_days) VALUES
  (1, 'Casual Leave', 'CL', 1, 10),
  (2, 'Earned Leave', 'EL', 1, 15),
  (3, 'Sick Leave', 'SL', 1, 7),
  (4, 'Unpaid Leave', 'UL', 0, NULL),
  (5, 'Festival Leave', 'FL', 1, 3),
  (6, 'Comp Off', 'CO', 1, 5);
UPDATE leave_types SET annual_quota = 12 WHERE code = 'CL' AND annual_quota = 0;
UPDATE leave_types SET annual_quota = 15 WHERE code = 'EL' AND annual_quota = 0;
UPDATE leave_types SET annual_quota = 7 WHERE code = 'SL' AND annual_quota = 0;
UPDATE leave_types SET annual_quota = 3 WHERE code = 'FL' AND annual_quota = 0;
UPDATE leave_types SET is_comp_off = 1 WHERE code = 'CO' AND is_comp_off = 0;



INSERT OR IGNORE INTO shift_types (id, name, start_time, end_time) VALUES
  (1, 'General', '09:00', '18:00'),
  (2, 'Morning', '06:00', '14:00'),
  (3, 'Evening', '14:00', '22:00'),
  (4, 'Night', '22:00', '06:00'),
  (5, 'Rotational', NULL, NULL),
  (6, 'Split', '10:00', '14:00');

INSERT OR IGNORE INTO clients (id, client_code, name, primary_contact_person, hr_contact_person, company_email, address_line1, address_line2, state, district, pincode, gst_no, company_pan, payroll_cycle, salary_calculation, overtime_enabled, leave_policy_enabled, arrears_enabled, advance_loan_enabled, bank_name, bank_account, bank_ifsc, bank_account_holder, status) VALUES
  (1, 'AFS', 'ABC Facility Services', 'Anil Kapoor', 'Meena Kapoor', 'accounts@abcfacilities.in', '210 Trade Centre', 'Andheri East', 'Maharashtra', 'Mumbai Suburban', '400069', '27AABCV1234F1Z5', 'AABCV1234F', 'monthly', 'calendar_days', 1, 1, 1, 1, 'HDFC Bank', '60010000000001', 'HDFC0000401', 'ABC Facility Services', 'active'),
  (2, 'MMM', 'Metro Mall Management', 'Priya Nair', 'Ravi Kumar', 'ops@metromalls.in', '4-1-20 Metro House', 'Banjara Hills', 'Telangana', 'Hyderabad', '500034', '36AAACMM1234P1Z2', 'AAACMM1234P', 'monthly', 'calendar_days', 1, 1, 0, 1, 'ICICI Bank', '40010000000002', 'ICIC0001234', 'Metro Mall Management', 'active'),
  (3, 'SI', 'SecureTech Industries', 'Rajesh Menon', 'Lakshmi Iyer', 'hr@securetech.in', 'Plot 12, Industrial Estate', 'Ambattur', 'Tamil Nadu', 'Chennai', '600058', '33AABCS1234F1Z3', 'AABCS1234F', 'monthly', 'calendar_days', 0, 1, 1, 0, 'State Bank of India', '80010000000003', 'SBIN0009988', 'SecureTech Industries', 'active'),
  (4, 'GH', 'Greenfield Hospital', 'Dr. Sunita Rao', 'Dr. K. Shah', 'admin@greenfieldhosp.in', '5 Andheri West', 'Andheri', 'Maharashtra', 'Mumbai Suburban', '400053', '27AACFG1234H1Z4', 'AACFG1234H', 'monthly', 'working_days', 1, 1, 1, 1, 'Axis Bank', '90010000000004', 'UTIB0000444', 'Greenfield Hospital', 'active');

INSERT OR IGNORE INTO sites (id, client_id, name, status, address_line1, address_line2, state, district, pincode, site_incharge, site_incharge_designation, site_incharge_contact, site_incharge_email, shift_type, overtime_enabled, payroll_applicable, leave_policy_enabled, arrears_enabled, pf_applicable, pf_percent, esic_applicable, esic_percent, lwf_applicable, lwf_percent, pt_applicable, pt_amount, tds_applicable, tds_percent, gratuity_applicable) VALUES
  (1, 1, 'Corporate Park Chennai', 'active', '1 Highfield Road', 'Corporate Park, Guindy', 'Tamil Nadu', 'Chennai', '600028', 'R. Subramaniam', 'Site Incharge', '98400 11001', 'rcs@corporatepark.in', 'General', 1, 1, 1, 1, 1, 12, 1, 0.75, 1, 0.5, 1, 200, 1, 2, 1),
  (2, 1, 'Highland Towers Mumbai', 'active', '22 Marine Drive', 'Highland Towers', 'Maharashtra', 'Mumbai', '400002', 'V. Kulkarni', 'Site Supervisor', '98400 11002', 'vk@highlandtowers.in', 'Rotational', 1, 1, 1, 0, 1, 12, 1, 0.75, 0, 0.5, 1, 200, 1, 2, 1),
  (3, 1, 'Riverside Tech Hub Bengaluru', 'active', '88 Koramangala', 'Riverside Tech Hub', 'Karnataka', 'Bengaluru Urban', '560095', 'M. Narayan', 'Facility Manager', '98400 11003', 'mn@riversidetech.in', 'General', 1, 1, 1, 1, 1, 12, 1, 0.75, 1, 0.5, 1, 200, 1, 2, 1),
  (4, 2, 'City Centre Mall Pune', 'active', '45 FC Road', 'City Centre Mall', 'Maharashtra', 'Pune', '411004', 'A. Deshpande', 'Security Supervisor', '98400 11004', 'ad@citycentremall.in', 'Morning', 1, 1, 1, 1, 1, 12, 1, 0.75, 0, 0.5, 1, 200, 1, 2, 1),
  (5, 2, 'Grand Galleria Mall Hyderabad', 'active', '7 Banjara Hills', 'Grand Galleria Mall', 'Telangana', 'Hyderabad', '500034', 'P. Varma', 'Site Incharge', '98400 11005', 'pv@grandgalleria.in', 'Rotational', 1, 1, 1, 0, 1, 12, 1, 0.75, 1, 0.5, 1, 200, 1, 2, 1),
  (6, 2, 'Urban Square Mall Delhi', 'active', '101 Connaught Place', 'Urban Square Mall', 'Delhi', 'Central Delhi', '110001', 'S. Khanna', 'Security Head', '98400 11006', 'sk@urbansquare.in', 'Rotational', 1, 1, 1, 1, 1, 12, 1, 0.75, 0, 0.5, 1, 200, 1, 2, 1),
  (7, 3, 'Alpha Industrial Estate Chennai', 'active', '33 Ambattur Industrial Estate', 'Alpha Industrial Estate', 'Tamil Nadu', 'Chennai', '600058', 'R. Venkatesan', 'Site Incharge', '98400 11007', 'rv@alphaindustrial.in', 'Night', 1, 1, 1, 1, 1, 12, 1, 0.75, 1, 0.5, 1, 200, 1, 2, 1),
  (8, 3, 'Sigma Electronics Park Bengaluru', 'active', '12 Whitefield', 'Sigma Electronics Park', 'Karnataka', 'Bengaluru Urban', '560066', 'T. Prabhakar', 'Security Supervisor', '98400 11008', 'tp@sigmapark.in', 'General', 1, 1, 1, 0, 1, 12, 1, 0.75, 0, 0.5, 1, 200, 1, 2, 1),
  (9, 4, 'Greenfield Main Hospital Mumbai', 'active', '5 Andheri West', 'Greenfield Main Hospital', 'Maharashtra', 'Mumbai Suburban', '400053', 'Dr. K. Shah', 'Security Incharge', '98400 11009', 'ks@greenfieldhosp.in', 'Rotational', 1, 1, 1, 1, 1, 12, 1, 0.75, 1, 0.5, 1, 200, 1, 2, 1),
  (10, 4, 'Greenfield Annex Clinic Pune', 'active', '118 Kothrud', 'Greenfield Annex Clinic', 'Maharashtra', 'Pune', '411038', 'Dr. A. Joshi', 'Site Incharge', '98400 11010', 'aj@greenfieldhosp.in', 'General', 1, 1, 1, 1, 1, 12, 1, 0.75, 0, 0.5, 1, 200, 1, 2, 1);

INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (1, 'SW0001', 'Rahul', 'Sharma', 'Suresh Sharma', 'Male', '1988-04-12', '98100 10001', 'rahul.sharma@staffsway.in', '789600000001', 'Chennai, Tamil Nadu 600028', 'Tamil Nadu', '600028', 'Ajay Sharma', '9820000137', 'HDFC Bank', '60010000000001', 'HDFC0000401', 'AABPC0001K', '101000000001', '2023-01-10', 'Security Supervisor', 'Security', 'B', NULL, NULL, 'permanent', 'General', 1, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (1, 1, '2023-01-10', 12500, 5000, 1000, 1500, 95, 1, 0, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (1, 1, 0, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900011, 1, 'Aadhaar Card', 'Aadhaar Card', '789600000001'),
  (900012, 1, 'PAN Card', 'PAN Card', 'AABPC0001K'),
  (900013, 1, 'Bank Proof', 'Bank Account Passbook', '60010000000001'),
  (900014, 1, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (2, 'SW0002', 'Amit', 'Verma', 'Mahesh Verma', 'Male', '1992-07-23', '98100 10002', 'amit.verma@staffsway.in', '789600000002', 'Chennai, Tamil Nadu 600028', 'Tamil Nadu', '600028', 'Prakash Verma', '9820000274', 'State Bank of India', '60010000000002', 'SBIN0009988', 'AABPC0002K', '101000000002', '2023-02-14', 'Security Guard', 'Security', 'B', 'Rahul Sharma', NULL, 'permanent', 'General', 1, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (2, 2, '2023-02-14', 9000, 3600, 800, 600, 75, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (2, 1, 1, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900021, 2, 'Aadhaar Card', 'Aadhaar Card', '789600000002'),
  (900022, 2, 'PAN Card', 'PAN Card', 'AABPC0002K'),
  (900023, 2, 'Bank Proof', 'Bank Account Passbook', '60010000000002'),
  (900024, 2, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (3, 'SW0003', 'Sanjay', 'Gupta', 'Dinesh Gupta', 'Male', '1990-11-05', '98100 10003', 'sanjay.gupta@staffsway.in', '789600000003', 'Chennai, Tamil Nadu 600028', 'Tamil Nadu', '600028', 'Harish Gupta', '9820000411', 'ICICI Bank', '60010000000003', 'ICIC0001020', 'AABPC0003K', '101000000003', '2023-03-01', 'Security Guard', 'Security', 'C', 'Rahul Sharma', 'Previously at CityWatch Security (4 yrs)', 'contract', 'Night', 1, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (3, 3, '2023-03-01', 8500, 3400, 800, 600, 75, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (3, 1, 1, 1, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900031, 3, 'Aadhaar Card', 'Aadhaar Card', '789600000003'),
  (900032, 3, 'PAN Card', 'PAN Card', 'AABPC0003K'),
  (900033, 3, 'Bank Proof', 'Bank Account Passbook', '60010000000003'),
  (900034, 3, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (4, 'SW0004', 'Vikas', 'Yadav', 'Rakesh Yadav', 'Male', '1987-02-17', '98100 10004', 'vikas.yadav@staffsway.in', '789600000004', 'Chennai, Tamil Nadu 600028', 'Tamil Nadu', '600028', 'Ganesh Yadav', '9820000548', 'Axis Bank', '60010000000004', 'UTIB0000123', 'AABPC0004K', '101000000004', '2023-01-20', 'Electrician', 'Technical', 'B', 'Rahul Sharma', NULL, 'permanent', 'General', 1, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (4, 4, '2023-01-20', 11500, 4600, 800, 800, 90, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (4, 1, 1, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900041, 4, 'Aadhaar Card', 'Aadhaar Card', '789600000004'),
  (900042, 4, 'PAN Card', 'PAN Card', 'AABPC0004K'),
  (900043, 4, 'Bank Proof', 'Bank Account Passbook', '60010000000004'),
  (900044, 4, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (5, 'SW0005', 'Mohan', 'Das', 'Naresh Das', 'Male', '1995-09-30', '98100 10005', 'mohan.das@staffsway.in', '789600000005', 'Chennai, Tamil Nadu 600028', 'Tamil Nadu', '600028', 'Vijay Das', '9820000685', 'Canara Bank', '60010000000005', 'CNRB0001999', 'AABPC0005K', '101000000005', '2024-04-05', 'Office Boy', 'Administration', 'C', 'Rahul Sharma', NULL, 'permanent', 'General', 1, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (5, 5, '2024-04-05', 7500, 3000, 600, 400, 65, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (5, 1, 1, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900051, 5, 'Aadhaar Card', 'Aadhaar Card', '789600000005'),
  (900052, 5, 'PAN Card', 'PAN Card', 'AABPC0005K'),
  (900053, 5, 'Bank Proof', 'Bank Account Passbook', '60010000000005'),
  (900054, 5, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (6, 'SW0006', 'Suresh', 'Kumar', 'Mukesh Kumar', 'Male', '1985-05-08', '98100 10006', 'suresh.kumar@staffsway.in', '789600000006', 'Chennai, Tamil Nadu 600028', 'Tamil Nadu', '600028', 'Ajay Kumar', '9820000822', 'Bank of Baroda', '60010000000006', 'BARB0000112', 'AABPC0006K', '101000000006', '2022-08-01', 'Facility Supervisor', 'Facilities', 'A', 'Rahul Sharma', NULL, 'permanent', 'General', 1, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (6, 6, '2022-08-01', 16000, 6400, 1000, 1600, 110, 1, 0, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (6, 1, 0, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900061, 6, 'Aadhaar Card', 'Aadhaar Card', '789600000006'),
  (900062, 6, 'PAN Card', 'PAN Card', 'AABPC0006K'),
  (900063, 6, 'Bank Proof', 'Bank Account Passbook', '60010000000006'),
  (900064, 6, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (7, 'SW0007', 'Ramesh', 'Kumar', 'Bhaskar Kumar', 'Male', '1991-12-19', '98100 10007', 'ramesh.kumar@staffsway.in', '789600000007', 'Mumbai, Maharashtra 400002', 'Maharashtra', '400002', 'Prakash Kumar', '9820000959', 'Punjab National Bank', '60010000000007', 'PUNB0484600', 'AABPC0007K', '101000000007', '2023-05-02', 'Security Guard', 'Security', 'C', NULL, NULL, 'permanent', 'Rotational', 2, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (7, 7, '2023-05-02', 8800, 3520, 800, 500, 75, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (7, 1, 1, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900071, 7, 'Aadhaar Card', 'Aadhaar Card', '789600000007'),
  (900072, 7, 'PAN Card', 'PAN Card', 'AABPC0007K'),
  (900073, 7, 'Bank Proof', 'Bank Account Passbook', '60010000000007'),
  (900074, 7, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (8, 'SW0008', 'Deepak', 'Singh', 'Ramesh Singh', 'Male', '1993-03-25', '98100 10008', 'deepak.singh@staffsway.in', '789600000008', 'Mumbai, Maharashtra 400002', 'Maharashtra', '400002', 'Harish Singh', '9820001096', 'HDFC Bank', '60010000000008', 'HDFC0000401', 'AABPC0008K', '101000000008', '2023-06-12', 'Security Guard', 'Security', 'C', NULL, 'Previously at SecureGuard Services (4 yrs)', 'contract', 'Night', 2, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (8, 8, '2023-06-12', 8600, 3440, 800, 600, 75, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (8, 1, 1, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900081, 8, 'Aadhaar Card', 'Aadhaar Card', '789600000008'),
  (900082, 8, 'PAN Card', 'PAN Card', 'AABPC0008K'),
  (900083, 8, 'Bank Proof', 'Bank Account Passbook', '60010000000008'),
  (900084, 8, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (9, 'SW0009', 'Manoj', 'Tiwari', 'Suresh Tiwari', 'Male', '1996-08-14', '98100 10009', 'manoj.tiwari@staffsway.in', '789600000009', 'Mumbai, Maharashtra 400002', 'Maharashtra', '400002', 'Ganesh Tiwari', '9820001233', 'State Bank of India', '60010000000009', 'SBIN0009988', 'AABPC0009K', '101000000009', '2024-02-20', 'Cleaner', 'Housekeeping', 'C', NULL, NULL, 'permanent', 'Morning', 2, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (9, 9, '2024-02-20', 7200, 2880, 600, 400, 60, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (9, 1, 1, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900091, 9, 'Aadhaar Card', 'Aadhaar Card', '789600000009'),
  (900092, 9, 'PAN Card', 'PAN Card', 'AABPC0009K'),
  (900093, 9, 'Bank Proof', 'Bank Account Passbook', '60010000000009'),
  (900094, 9, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (10, 'SW0010', 'Raju', 'Patel', 'Mahesh Patel', 'Male', '1986-10-02', '98100 10010', 'raju.patel@staffsway.in', '789600000010', 'Mumbai, Maharashtra 400002', 'Maharashtra', '400002', 'Vijay Patel', '9820001370', 'ICICI Bank', '60010000000010', 'ICIC0001020', 'AABPC0010K', '101000000010', '2023-07-17', 'Plumber', 'Technical', 'B', NULL, 'Previously at SafeHands Manpower (1 yrs)', 'contract', 'General', 2, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (10, 10, '2023-07-17', 10500, 4200, 800, 800, 85, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (10, 1, 1, 0, 1, 1);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900101, 10, 'Aadhaar Card', 'Aadhaar Card', '789600000010'),
  (900102, 10, 'PAN Card', 'PAN Card', 'AABPC0010K'),
  (900103, 10, 'Bank Proof', 'Bank Account Passbook', '60010000000010'),
  (900104, 10, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (11, 'SW0011', 'Anil', 'Chauhan', 'Dinesh Chauhan', 'Male', '1994-01-28', '98100 10011', 'anil.chauhan@staffsway.in', '789600000011', 'Mumbai, Maharashtra 400002', 'Maharashtra', '400002', 'Ajay Chauhan', '9820001507', 'Axis Bank', '60010000000011', 'UTIB0000123', 'AABPC0011K', '101000000011', '2024-05-09', 'Housekeeping Staff', 'Housekeeping', 'C', NULL, NULL, 'permanent', 'Morning', 2, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (11, 11, '2024-05-09', 7800, 3120, 700, 500, 65, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (11, 1, 1, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900111, 11, 'Aadhaar Card', 'Aadhaar Card', '789600000011'),
  (900112, 11, 'PAN Card', 'PAN Card', 'AABPC0011K'),
  (900113, 11, 'Bank Proof', 'Bank Account Passbook', '60010000000011'),
  (900114, 11, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (12, 'SW0012', 'Nitin', 'Shetty', 'Rakesh Shetty', 'Male', '1989-06-21', '98100 10012', 'nitin.shetty@staffsway.in', '789600000012', 'Bengaluru, Karnataka 560095', 'Karnataka', '560095', 'Prakash Shetty', '9820001644', 'Canara Bank', '60010000000012', 'CNRB0001999', 'AABPC0012K', '101000000012', '2023-03-18', 'Security Supervisor', 'Security', 'B', NULL, NULL, 'permanent', 'General', 3, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (12, 12, '2023-03-18', 12500, 5000, 1000, 1500, 95, 1, 0, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (12, 1, 0, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900121, 12, 'Aadhaar Card', 'Aadhaar Card', '789600000012'),
  (900122, 12, 'PAN Card', 'PAN Card', 'AABPC0012K'),
  (900123, 12, 'Bank Proof', 'Bank Account Passbook', '60010000000012'),
  (900124, 12, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (13, 'SW0013', 'Karan', 'Malhotra', 'Naresh Malhotra', 'Male', '1992-09-11', '98100 10013', 'karan.malhotra@staffsway.in', '789600000013', 'Bengaluru, Karnataka 560095', 'Karnataka', '560095', 'Harish Malhotra', '9820001781', 'Bank of Baroda', '60010000000013', 'BARB0000112', 'AABPC0013K', '101000000013', '2023-04-02', 'Security Guard', 'Security', 'B', 'Nitin Shetty', NULL, 'permanent', 'General', 3, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (13, 13, '2023-04-02', 9200, 3680, 800, 600, 75, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (13, 1, 1, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900131, 13, 'Aadhaar Card', 'Aadhaar Card', '789600000013'),
  (900132, 13, 'PAN Card', 'PAN Card', 'AABPC0013K'),
  (900133, 13, 'Bank Proof', 'Bank Account Passbook', '60010000000013'),
  (900134, 13, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (14, 'SW0014', 'Arjun', 'Reddy', 'Mukesh Reddy', 'Male', '1988-11-27', '98100 10014', 'arjun.reddy@staffsway.in', '789600000014', 'Bengaluru, Karnataka 560095', 'Karnataka', '560095', 'Ganesh Reddy', '9820001918', 'Punjab National Bank', '60010000000014', 'PUNB0484600', 'AABPC0014K', '101000000014', '2023-01-15', 'Maintenance Technician', 'Technical', 'B', 'Nitin Shetty', NULL, 'permanent', 'General', 3, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (14, 14, '2023-01-15', 12000, 4800, 800, 1000, 90, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (14, 1, 1, 1, 1, 1);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900141, 14, 'Aadhaar Card', 'Aadhaar Card', '789600000014'),
  (900142, 14, 'PAN Card', 'PAN Card', 'AABPC0014K'),
  (900143, 14, 'Bank Proof', 'Bank Account Passbook', '60010000000014'),
  (900144, 14, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (15, 'SW0015', 'Pooja', 'Sharma', 'Bhaskar Sharma', 'Female', '1996-05-16', '98100 10015', 'pooja.sharma@staffsway.in', '789600000015', 'Bengaluru, Karnataka 560095', 'Karnataka', '560095', 'Vijay Sharma', '9820002055', 'HDFC Bank', '60010000000015', 'HDFC0000401', 'AABPC0015K', '101000000015', '2024-08-01', 'Receptionist', 'Administration', 'B', 'Nitin Shetty', NULL, 'permanent', 'General', 3, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (15, 15, '2024-08-01', 9500, 3800, 800, 600, 70, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (15, 1, 1, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900151, 15, 'Aadhaar Card', 'Aadhaar Card', '789600000015'),
  (900152, 15, 'PAN Card', 'PAN Card', 'AABPC0015K'),
  (900153, 15, 'Bank Proof', 'Bank Account Passbook', '60010000000015'),
  (900154, 15, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (16, 'SW0016', 'Sunil', 'Pawar', 'Ramesh Pawar', 'Male', '1987-03-06', '98100 10016', 'sunil.pawar@staffsway.in', '789600000016', 'Pune, Maharashtra 411004', 'Maharashtra', '411004', 'Ajay Pawar', '9820002192', 'State Bank of India', '60010000000016', 'SBIN0009988', 'AABPC0016K', '101000000016', '2023-02-01', 'Housekeeping Supervisor', 'Housekeeping', 'B', NULL, NULL, 'permanent', 'Morning', 4, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (16, 16, '2023-02-01', 11000, 4400, 800, 800, 85, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (16, 1, 1, 1, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900161, 16, 'Aadhaar Card', 'Aadhaar Card', '789600000016'),
  (900162, 16, 'PAN Card', 'PAN Card', 'AABPC0016K'),
  (900163, 16, 'Bank Proof', 'Bank Account Passbook', '60010000000016'),
  (900164, 16, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (17, 'SW0017', 'Vijay', 'More', 'Suresh More', 'Male', '1995-07-19', '98100 10017', 'vijay.more@staffsway.in', '789600000017', 'Pune, Maharashtra 411004', 'Maharashtra', '411004', 'Prakash More', '9820002329', 'ICICI Bank', '60010000000017', 'ICIC0001020', 'AABPC0017K', '101000000017', '2024-01-10', 'Housekeeping Staff', 'Housekeeping', 'C', 'Sunil Pawar', 'Previously at Metro Facilities (3 yrs)', 'contract', 'Morning', 4, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (17, 17, '2024-01-10', 7800, 3120, 700, 500, 65, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (17, 1, 1, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900171, 17, 'Aadhaar Card', 'Aadhaar Card', '789600000017'),
  (900172, 17, 'PAN Card', 'PAN Card', 'AABPC0017K'),
  (900173, 17, 'Bank Proof', 'Bank Account Passbook', '60010000000017'),
  (900174, 17, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (18, 'SW0018', 'Sandeep', 'Kulkarni', 'Mahesh Kulkarni', 'Male', '1990-12-03', '98100 10018', 'sandeep.kulkarni@staffsway.in', '789600000018', 'Pune, Maharashtra 411004', 'Maharashtra', '411004', 'Harish Kulkarni', '9820002466', 'Axis Bank', '60010000000018', 'UTIB0000123', 'AABPC0018K', '101000000018', '2023-05-20', 'Security Guard', 'Security', 'C', 'Sunil Pawar', NULL, 'permanent', 'Morning', 4, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (18, 18, '2023-05-20', 8800, 3520, 800, 500, 75, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (18, 1, 1, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900181, 18, 'Aadhaar Card', 'Aadhaar Card', '789600000018'),
  (900182, 18, 'PAN Card', 'PAN Card', 'AABPC0018K'),
  (900183, 18, 'Bank Proof', 'Bank Account Passbook', '60010000000018'),
  (900184, 18, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (19, 'SW0019', 'Mahesh', 'Joshi', 'Dinesh Joshi', 'Male', '1984-04-25', '98100 10019', 'mahesh.joshi@staffsway.in', '789600000019', 'Pune, Maharashtra 411004', 'Maharashtra', '411004', 'Ganesh Joshi', '9820002603', 'Canara Bank', '60010000000019', 'CNRB0001999', 'AABPC0019K', '101000000019', '2024-03-15', 'Gardener', 'Housekeeping', 'C', 'Sunil Pawar', 'Previously at CityWatch Security (5 yrs)', 'contract', 'Morning', 4, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (19, 19, '2024-03-15', 7200, 2880, 600, 400, 60, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (19, 1, 1, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900191, 19, 'Aadhaar Card', 'Aadhaar Card', '789600000019'),
  (900192, 19, 'PAN Card', 'PAN Card', 'AABPC0019K'),
  (900193, 19, 'Bank Proof', 'Bank Account Passbook', '60010000000019'),
  (900194, 19, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (20, 'SW0020', 'Srinivas', 'Rao', 'Rakesh Rao', 'Male', '1991-08-22', '98100 10020', 'srinivas.rao@staffsway.in', '789600000020', 'Hyderabad, Telangana 500034', 'Telangana', '500034', 'Vijay Rao', '9820002740', 'Bank of Baroda', '60010000000020', 'BARB0000112', 'AABPC0020K', '101000000020', '2023-06-01', 'Security Guard', 'Security', 'B', NULL, NULL, 'permanent', 'Rotational', 5, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (20, 20, '2023-06-01', 9000, 3600, 800, 600, 75, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (20, 1, 1, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900201, 20, 'Aadhaar Card', 'Aadhaar Card', '789600000020'),
  (900202, 20, 'PAN Card', 'PAN Card', 'AABPC0020K'),
  (900203, 20, 'Bank Proof', 'Bank Account Passbook', '60010000000020'),
  (900204, 20, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (21, 'SW0021', 'Prasad', 'Naidu', 'Naresh Naidu', 'Male', '1993-10-09', '98100 10021', 'prasad.naidu@staffsway.in', '789600000021', 'Hyderabad, Telangana 500034', 'Telangana', '500034', 'Ajay Naidu', '9820002877', 'Punjab National Bank', '60010000000021', 'PUNB0484600', 'AABPC0021K', '101000000021', '2024-04-18', 'Housekeeping Staff', 'Housekeeping', 'C', NULL, 'Previously at Metro Facilities (2 yrs)', 'contract', 'Evening', 5, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (21, 21, '2024-04-18', 7600, 3040, 700, 500, 65, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (21, 1, 1, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900211, 21, 'Aadhaar Card', 'Aadhaar Card', '789600000021'),
  (900212, 21, 'PAN Card', 'PAN Card', 'AABPC0021K'),
  (900213, 21, 'Bank Proof', 'Bank Account Passbook', '60010000000021'),
  (900214, 21, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (22, 'SW0022', 'Ganesh', 'Patil', 'Mukesh Patil', 'Male', '1989-01-13', '98100 10022', 'ganesh.patil@staffsway.in', '789600000022', 'Hyderabad, Telangana 500034', 'Telangana', '500034', 'Prakash Patil', '9820003014', 'HDFC Bank', '60010000000022', 'HDFC0000401', 'AABPC0022K', '101000000022', '2023-09-01', 'Driver', 'Transport', 'B', NULL, NULL, 'permanent', 'Morning', 5, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (22, 22, '2023-09-01', 9800, 3920, 800, 700, 75, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (22, 1, 1, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900221, 22, 'Aadhaar Card', 'Aadhaar Card', '789600000022'),
  (900222, 22, 'PAN Card', 'PAN Card', 'AABPC0022K'),
  (900223, 22, 'Bank Proof', 'Bank Account Passbook', '60010000000022'),
  (900224, 22, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (23, 'SW0023', 'Harish', 'Kumar', 'Bhaskar Kumar', 'Male', '1992-02-07', '98100 10023', 'harish.kumar@staffsway.in', '789600000023', 'New Delhi, Delhi 110001', 'Delhi', '110001', 'Harish Kumar', '9820003151', 'State Bank of India', '60010000000023', 'SBIN0009988', 'AABPC0023K', '101000000023', '2023-10-02', 'Security Guard', 'Security', 'C', NULL, NULL, 'permanent', 'Rotational', 6, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (23, 23, '2023-10-02', 8800, 3520, 800, 500, 75, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (23, 1, 1, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900231, 23, 'Aadhaar Card', 'Aadhaar Card', '789600000023'),
  (900232, 23, 'PAN Card', 'PAN Card', 'AABPC0023K'),
  (900233, 23, 'Bank Proof', 'Bank Account Passbook', '60010000000023'),
  (900234, 23, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (24, 'SW0024', 'Rohit', 'Arora', 'Ramesh Arora', 'Male', '1988-09-18', '98100 10024', 'rohit.arora@staffsway.in', '789600000024', 'New Delhi, Delhi 110001', 'Delhi', '110001', 'Ganesh Arora', '9820003288', 'ICICI Bank', '60010000000024', 'ICIC0001020', 'AABPC0024K', '101000000024', '2023-11-06', 'Electrician', 'Technical', 'B', NULL, NULL, 'permanent', 'General', 6, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (24, 24, '2023-11-06', 11500, 4600, 800, 800, 90, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (24, 1, 1, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900241, 24, 'Aadhaar Card', 'Aadhaar Card', '789600000024'),
  (900242, 24, 'PAN Card', 'PAN Card', 'AABPC0024K'),
  (900243, 24, 'Bank Proof', 'Bank Account Passbook', '60010000000024'),
  (900244, 24, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (25, 'SW0025', 'Amit', 'Bansal', 'Suresh Bansal', 'Male', '1990-06-29', '98100 10025', 'amit.bansal@staffsway.in', '789600000025', 'New Delhi, Delhi 110001', 'Delhi', '110001', 'Vijay Bansal', '9820003425', 'Axis Bank', '60010000000025', 'UTIB0000123', 'AABPC0025K', '101000000025', '2024-02-01', 'Floor Executive', 'Facilities', 'B', NULL, NULL, 'permanent', 'Rotational', 6, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (25, 25, '2024-02-01', 10800, 4320, 800, 700, 80, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (25, 1, 1, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900251, 25, 'Aadhaar Card', 'Aadhaar Card', '789600000025'),
  (900252, 25, 'PAN Card', 'PAN Card', 'AABPC0025K'),
  (900253, 25, 'Bank Proof', 'Bank Account Passbook', '60010000000025'),
  (900254, 25, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (26, 'SW0026', 'Vikram', 'Singh', 'Mahesh Singh', 'Male', '1986-11-04', '98100 10026', 'vikram.singh@staffsway.in', '789600000026', 'Chennai, Tamil Nadu 600058', 'Tamil Nadu', '600058', 'Ajay Singh', '9820003562', 'Canara Bank', '60010000000026', 'CNRB0001999', 'AABPC0026K', '101000000026', '2023-07-01', 'Security Guard', 'Security', 'C', 'Selvam R', 'Previously at SafeHands Manpower (2 yrs)', 'contract', 'Night', 7, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (26, 26, '2023-07-01', 8800, 3520, 800, 600, 75, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (26, 1, 1, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900261, 26, 'Aadhaar Card', 'Aadhaar Card', '789600000026'),
  (900262, 26, 'PAN Card', 'PAN Card', 'AABPC0026K'),
  (900263, 26, 'Bank Proof', 'Bank Account Passbook', '60010000000026'),
  (900264, 26, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (27, 'SW0027', 'Rajesh', 'Kumar', 'Dinesh Kumar', 'Male', '1991-05-27', '98100 10027', 'rajesh.kumar@staffsway.in', '789600000027', 'Chennai, Tamil Nadu 600058', 'Tamil Nadu', '600058', 'Prakash Kumar', '9820003699', 'Bank of Baroda', '60010000000027', 'BARB0000112', 'AABPC0027K', '101000000027', '2023-08-10', 'Security Guard', 'Security', 'B', 'Selvam R', NULL, 'permanent', 'Night', 7, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (27, 27, '2023-08-10', 9200, 3680, 800, 600, 75, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (27, 1, 1, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900271, 27, 'Aadhaar Card', 'Aadhaar Card', '789600000027'),
  (900272, 27, 'PAN Card', 'PAN Card', 'AABPC0027K'),
  (900273, 27, 'Bank Proof', 'Bank Account Passbook', '60010000000027'),
  (900274, 27, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (28, 'SW0028', 'Murugan', 'K', 'Rakesh K', 'Male', '1994-12-08', '98100 10028', 'murugan.k@staffsway.in', '789600000028', 'Chennai, Tamil Nadu 600058', 'Tamil Nadu', '600058', 'Harish K', '9820003836', 'Punjab National Bank', '60010000000028', 'PUNB0484600', 'AABPC0028K', '101000000028', '2024-06-03', 'Housekeeping Staff', 'Housekeeping', 'C', 'Selvam R', 'Previously at SecureGuard Services (4 yrs)', 'contract', 'Night', 7, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (28, 28, '2024-06-03', 7600, 3040, 700, 500, 65, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (28, 1, 1, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900281, 28, 'Aadhaar Card', 'Aadhaar Card', '789600000028'),
  (900282, 28, 'PAN Card', 'PAN Card', 'AABPC0028K'),
  (900283, 28, 'Bank Proof', 'Bank Account Passbook', '60010000000028'),
  (900284, 28, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (29, 'SW0029', 'Selvam', 'R', 'Naresh R', 'Male', '1986-03-15', '98100 10029', 'selvam.r@staffsway.in', '789600000029', 'Chennai, Tamil Nadu 600058', 'Tamil Nadu', '600058', 'Ganesh R', '9820003973', 'HDFC Bank', '60010000000029', 'HDFC0000401', 'AABPC0029K', '101000000029', '2023-04-22', 'Electrician Supervisor', 'Technical', 'B', NULL, NULL, 'permanent', 'Night', 7, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (29, 29, '2023-04-22', 13500, 5400, 1000, 1100, 100, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (29, 1, 1, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900291, 29, 'Aadhaar Card', 'Aadhaar Card', '789600000029'),
  (900292, 29, 'PAN Card', 'PAN Card', 'AABPC0029K'),
  (900293, 29, 'Bank Proof', 'Bank Account Passbook', '60010000000029'),
  (900294, 29, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (30, 'SW0030', 'Anand', 'Kumar', 'Mukesh Kumar', 'Male', '1985-09-11', '98100 10030', 'anand.kumar@staffsway.in', '789600000030', 'Bengaluru, Karnataka 560066', 'Karnataka', '560066', 'Vijay Kumar', '9820004110', 'State Bank of India', '60010000000030', 'SBIN0009988', 'AABPC0030K', '101000000030', '2022-12-01', 'Site Supervisor', 'Facilities', 'A', NULL, NULL, 'permanent', 'General', 8, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (30, 30, '2022-12-01', 18500, 7400, 1000, 2100, 115, 1, 0, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (30, 1, 0, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900301, 30, 'Aadhaar Card', 'Aadhaar Card', '789600000030'),
  (900302, 30, 'PAN Card', 'PAN Card', 'AABPC0030K'),
  (900303, 30, 'Bank Proof', 'Bank Account Passbook', '60010000000030'),
  (900304, 30, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (31, 'SW0031', 'Kiran', 'P', 'Bhaskar P', 'Male', '1993-06-27', '98100 10031', 'kiran.p@staffsway.in', '789600000031', 'Bengaluru, Karnataka 560066', 'Karnataka', '560066', 'Ajay P', '9820004247', 'ICICI Bank', '60010000000031', 'ICIC0001020', 'AABPC0031K', '101000000031', '2023-10-14', 'Security Guard', 'Security', 'C', 'Anand Kumar', NULL, 'permanent', 'General', 8, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (31, 31, '2023-10-14', 8800, 3520, 800, 500, 75, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (31, 1, 1, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900311, 31, 'Aadhaar Card', 'Aadhaar Card', '789600000031'),
  (900312, 31, 'PAN Card', 'PAN Card', 'AABPC0031K'),
  (900313, 31, 'Bank Proof', 'Bank Account Passbook', '60010000000031'),
  (900314, 31, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (32, 'SW0032', 'Dinesh', 'Babu', 'Ramesh Babu', 'Male', '1989-02-03', '98100 10032', 'dinesh.babu@staffsway.in', '789600000032', 'Bengaluru, Karnataka 560066', 'Karnataka', '560066', 'Prakash Babu', '9820004384', 'Axis Bank', '60010000000032', 'UTIB0000123', 'AABPC0032K', '101000000032', '2023-05-18', 'HVAC Technician', 'Technical', 'B', 'Anand Kumar', NULL, 'permanent', 'General', 8, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (32, 32, '2023-05-18', 13500, 5400, 1000, 1000, 100, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (32, 1, 1, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900321, 32, 'Aadhaar Card', 'Aadhaar Card', '789600000032'),
  (900322, 32, 'PAN Card', 'PAN Card', 'AABPC0032K'),
  (900323, 32, 'Bank Proof', 'Bank Account Passbook', '60010000000032'),
  (900324, 32, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (33, 'SW0033', 'Rakesh', 'Yadav', 'Suresh Yadav', 'Male', '1990-07-20', '98100 10033', 'rakesh.yadav@staffsway.in', '789600000033', 'Mumbai, Maharashtra 400053', 'Maharashtra', '400053', 'Harish Yadav', '9820004521', 'Canara Bank', '60010000000033', 'CNRB0001999', 'AABPC0033K', '101000000033', '2023-09-05', 'Medical Attendant', 'Medical Services', 'C', 'Suresh Menon', NULL, 'permanent', 'Rotational', 9, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (33, 33, '2023-09-05', 8500, 3400, 800, 600, 75, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (33, 1, 1, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900331, 33, 'Aadhaar Card', 'Aadhaar Card', '789600000033'),
  (900332, 33, 'PAN Card', 'PAN Card', 'AABPC0033K'),
  (900333, 33, 'Bank Proof', 'Bank Account Passbook', '60010000000033'),
  (900334, 33, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (34, 'SW0034', 'Neha', 'Gupta', 'Mahesh Gupta', 'Female', '1995-04-09', '98100 10034', 'neha.gupta@staffsway.in', '789600000034', 'Mumbai, Maharashtra 400053', 'Maharashtra', '400053', 'Ganesh Gupta', '9820004658', 'Bank of Baroda', '60010000000034', 'BARB0000112', 'AABPC0034K', '101000000034', '2024-07-12', 'Housekeeping Staff', 'Housekeeping', 'C', 'Suresh Menon', NULL, 'permanent', 'Rotational', 9, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (34, 34, '2024-07-12', 7800, 3120, 700, 500, 65, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (34, 1, 1, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900341, 34, 'Aadhaar Card', 'Aadhaar Card', '789600000034'),
  (900342, 34, 'PAN Card', 'PAN Card', 'AABPC0034K'),
  (900343, 34, 'Bank Proof', 'Bank Account Passbook', '60010000000034'),
  (900344, 34, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (35, 'SW0035', 'Suresh', 'Menon', 'Dinesh Menon', 'Male', '1984-08-30', '98100 10035', 'suresh.menon@staffsway.in', '789600000035', 'Mumbai, Maharashtra 400053', 'Maharashtra', '400053', 'Vijay Menon', '9820004795', 'Punjab National Bank', '60010000000035', 'PUNB0484600', 'AABPC0035K', '101000000035', '2022-11-01', 'Facility Supervisor', 'Facilities', 'A', NULL, NULL, 'permanent', 'General', 9, 'active');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (35, 35, '2022-11-01', 16000, 6400, 1000, 1600, 110, 1, 0, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (35, 1, 0, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900351, 35, 'Aadhaar Card', 'Aadhaar Card', '789600000035'),
  (900352, 35, 'PAN Card', 'PAN Card', 'AABPC0035K'),
  (900353, 35, 'Bank Proof', 'Bank Account Passbook', '60010000000035'),
  (900354, 35, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (36, 'SW0036', 'Prakash', 'Iyer', 'Rakesh Iyer', 'Male', '1987-12-11', '98100 10036', 'prakash.iyer@staffsway.in', '789600000036', 'Pune, Maharashtra 411038', 'Maharashtra', '411038', 'Ajay Iyer', '9820004932', 'HDFC Bank', '60010000000036', 'HDFC0000401', 'AABPC0036K', '101000000036', '2023-06-08', 'Security Guard', 'Security', 'C', NULL, NULL, 'permanent', 'Rotational', 10, 'inactive');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (36, 36, '2023-06-08', 8800, 3520, 800, 500, 75, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (36, 1, 1, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900361, 36, 'Aadhaar Card', 'Aadhaar Card', '789600000036'),
  (900362, 36, 'PAN Card', 'PAN Card', 'AABPC0036K'),
  (900363, 36, 'Bank Proof', 'Bank Account Passbook', '60010000000036'),
  (900364, 36, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (37, 'SW0037', 'Meena', 'Kumari', 'Naresh Kumari', 'Female', '1992-01-17', '98100 10037', 'meena.kumari@staffsway.in', '789600000037', 'Pune, Maharashtra 411038', 'Maharashtra', '411038', 'Prakash Kumari', '9820005069', 'State Bank of India', '60010000000037', 'SBIN0009988', 'AABPC0037K', '101000000037', '2024-03-22', 'Cleaner', 'Housekeeping', 'C', NULL, 'Previously at Metro Facilities (3 yrs)', 'contract', 'Morning', 10, 'inactive');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (37, 37, '2024-03-22', 7200, 2880, 600, 400, 60, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (37, 1, 1, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900371, 37, 'Aadhaar Card', 'Aadhaar Card', '789600000037'),
  (900372, 37, 'PAN Card', 'PAN Card', 'AABPC0037K'),
  (900373, 37, 'Bank Proof', 'Bank Account Passbook', '60010000000037'),
  (900374, 37, 'Joining Form', 'Appointment Letter', NULL);
INSERT OR IGNORE INTO employees (id, employee_code, first_name, last_name, father_name, gender, dob, mobile, email, aadhaar, address, state, pincode, emergency_contact_name, emergency_contact_phone, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, grade, reporting_manager, previous_employment, employee_type, shift_type, site_id, status)
VALUES (38, 'SW0038', 'Babu', 'Lal', 'Mukesh Lal', 'Male', '1985-10-05', '98100 10038', 'babu.lal@staffsway.in', '789600000038', 'Pune, Maharashtra 411038', 'Maharashtra', '411038', 'Harish Lal', '9820005206', 'ICICI Bank', '60010000000038', 'ICIC0001020', 'AABPC0038K', '101000000038', '2023-02-25', 'Driver', 'Transport', 'B', NULL, NULL, 'permanent', 'Morning', 10, 'inactive');
INSERT OR IGNORE INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (38, 38, '2023-02-25', 9800, 3920, 800, 700, 75, 1, 1, 0);
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
VALUES (38, 1, 1, 0, 1, 0);
INSERT OR IGNORE INTO employee_documents (id, employee_id, document_type, document_name, document_number) VALUES
  (900381, 38, 'Aadhaar Card', 'Aadhaar Card', '789600000038'),
  (900382, 38, 'PAN Card', 'PAN Card', 'AABPC0038K'),
  (900383, 38, 'Bank Proof', 'Bank Account Passbook', '60010000000038'),
  (900384, 38, 'Joining Form', 'Appointment Letter', NULL);

INSERT OR IGNORE INTO attendance_monthly (id, employee_id, month, year, present_days, absent_days, paid_leave, unpaid_leave, ot_hours, late_marks, early_departures, remarks, status) VALUES
  (920001, 1, 8, 2026, 24, 5, 1, 0, 12, 3, 0, 'OT for access control upgrade', 'draft'),
  (910001, 1, 7, 2026, 24, 5, 1, 0, 15, 4, 2, 'OT for access control upgrade', 'finalized'),
  (920002, 2, 8, 2026, 25, 4, 0, 1, 8, 6, 0, '', 'draft'),
  (910002, 2, 7, 2026, 26, 3, 0, 1, 9, 0, 2, '', 'finalized'),
  (920003, 3, 8, 2026, 26, 3, 0, 0, 24, 2, 0, 'Night shift OT', 'draft'),
  (910003, 3, 7, 2026, 25, 4, 0, 0, 23, 3, 2, 'Night shift OT', 'finalized'),
  (920004, 4, 8, 2026, 23, 6, 0, 1, 15, 5, 0, 'Emergency electrical work', 'draft'),
  (910004, 4, 7, 2026, 23, 6, 0, 1, 12, 6, 2, 'Emergency electrical work', 'finalized'),
  (920005, 5, 8, 2026, 25, 4, 1, 0, 0, 1, 0, '', 'draft'),
  (910005, 5, 7, 2026, 26, 3, 1, 0, 4, 2, 2, '', 'finalized'),
  (920006, 6, 8, 2026, 24, 5, 0, 0, 6, 4, 0, '', 'draft'),
  (910006, 6, 7, 2026, 23, 6, 0, 0, 8, 5, 2, '', 'finalized'),
  (920007, 7, 8, 2026, 26, 3, 0, 0, 10, 0, 0, '', 'draft'),
  (910007, 7, 7, 2026, 26, 3, 0, 0, 10, 1, 2, '', 'finalized'),
  (920008, 8, 8, 2026, 25, 4, 0, 1, 28, 3, 0, 'Night shift OT', 'draft'),
  (910008, 8, 7, 2026, 26, 3, 0, 1, 26, 4, 2, 'Night shift OT', 'finalized'),
  (920009, 9, 8, 2026, 24, 5, 1, 0, 0, 6, 0, '', 'draft'),
  (910009, 9, 7, 2026, 23, 6, 1, 0, 0, 0, 2, '', 'finalized'),
  (920010, 10, 8, 2026, 22, 7, 0, 1, 9, 2, 0, 'Plumbing maintenance OT', 'draft'),
  (910010, 10, 7, 2026, 22, 7, 0, 1, 12, 3, 2, 'Plumbing maintenance OT', 'finalized'),
  (920011, 11, 8, 2026, 25, 4, 0, 0, 4, 5, 0, '', 'draft'),
  (910011, 11, 7, 2026, 26, 3, 0, 0, 5, 6, 2, '', 'finalized'),
  (920012, 12, 8, 2026, 25, 4, 0, 0, 10, 1, 0, '', 'draft'),
  (910012, 12, 7, 2026, 24, 5, 0, 0, 9, 2, 2, '', 'finalized'),
  (920013, 13, 8, 2026, 26, 3, 0, 0, 6, 4, 0, '', 'draft'),
  (910013, 13, 7, 2026, 26, 3, 0, 0, 3, 5, 2, '', 'finalized'),
  (920014, 14, 8, 2026, 24, 5, 1, 0, 18, 0, 0, 'Preventive maintenance OT', 'draft'),
  (910014, 14, 7, 2026, 25, 4, 1, 0, 22, 1, 2, 'Preventive maintenance OT', 'finalized'),
  (920015, 15, 8, 2026, 25, 4, 1, 0, 0, 3, 0, '', 'draft'),
  (910015, 15, 7, 2026, 24, 5, 1, 0, 2, 4, 2, '', 'finalized'),
  (920016, 16, 8, 2026, 24, 5, 1, 0, 8, 6, 0, '', 'draft'),
  (910016, 16, 7, 2026, 24, 5, 1, 0, 8, 0, 2, '', 'finalized'),
  (920017, 17, 8, 2026, 26, 3, 0, 0, 5, 2, 0, '', 'draft'),
  (910017, 17, 7, 2026, 27, 2, 0, 0, 3, 3, 2, '', 'finalized'),
  (920018, 18, 8, 2026, 25, 4, 0, 0, 7, 5, 0, '', 'draft'),
  (910018, 18, 7, 2026, 24, 5, 0, 0, 3, 6, 2, '', 'finalized'),
  (920019, 19, 8, 2026, 23, 6, 0, 1, 0, 1, 0, '', 'draft'),
  (910019, 19, 7, 2026, 23, 6, 0, 1, 3, 2, 2, '', 'finalized'),
  (920020, 20, 8, 2026, 26, 4, 0, 0, 12, 4, 0, '', 'draft'),
  (910020, 20, 7, 2026, 27, 3, 0, 0, 13, 5, 2, '', 'finalized'),
  (920021, 21, 8, 2026, 25, 5, 0, 0, 6, 0, 0, '', 'draft'),
  (910021, 21, 7, 2026, 24, 6, 0, 0, 5, 1, 2, '', 'finalized'),
  (920022, 22, 8, 2026, 24, 5, 1, 0, 10, 3, 0, 'Transport OT for mall supplies', 'draft'),
  (910022, 22, 7, 2026, 24, 5, 1, 0, 7, 4, 2, 'Transport OT for mall supplies', 'finalized'),
  (920023, 23, 8, 2026, 27, 2, 0, 0, 14, 6, 0, '', 'draft'),
  (910023, 23, 7, 2026, 28, 1, 0, 0, 18, 0, 2, '', 'finalized'),
  (920024, 24, 8, 2026, 23, 6, 0, 1, 20, 2, 0, 'Store lighting project OT', 'draft'),
  (910024, 24, 7, 2026, 22, 7, 0, 1, 22, 3, 2, 'Store lighting project OT', 'finalized'),
  (920025, 25, 8, 2026, 24, 5, 1, 0, 8, 5, 0, '', 'draft'),
  (910025, 25, 7, 2026, 24, 5, 1, 0, 8, 6, 2, '', 'finalized'),
  (920026, 26, 8, 2026, 25, 4, 0, 0, 30, 1, 0, 'Night shift OT', 'draft'),
  (910026, 26, 7, 2026, 26, 3, 0, 0, 28, 2, 2, 'Night shift OT', 'finalized'),
  (920027, 27, 8, 2026, 26, 3, 0, 0, 18, 4, 0, '', 'draft'),
  (910027, 27, 7, 2026, 25, 4, 0, 0, 14, 5, 2, '', 'finalized'),
  (920028, 28, 8, 2026, 25, 4, 0, 1, 26, 0, 0, 'Night shift OT', 'draft'),
  (910028, 28, 7, 2026, 25, 4, 0, 1, 29, 1, 2, 'Night shift OT', 'finalized'),
  (920029, 29, 8, 2026, 24, 5, 1, 0, 22, 3, 0, 'Line maintenance OT', 'draft'),
  (910029, 29, 7, 2026, 25, 4, 1, 0, 23, 4, 2, 'Line maintenance OT', 'finalized'),
  (920030, 30, 8, 2026, 25, 4, 0, 0, 8, 6, 0, '', 'draft'),
  (910030, 30, 7, 2026, 24, 5, 0, 0, 7, 0, 2, '', 'finalized'),
  (920031, 31, 8, 2026, 26, 3, 0, 0, 5, 2, 0, '', 'draft'),
  (910031, 31, 7, 2026, 26, 3, 0, 0, 2, 3, 2, '', 'finalized'),
  (920032, 32, 8, 2026, 23, 6, 1, 0, 16, 5, 0, 'AC overhaul OT', 'draft'),
  (910032, 32, 7, 2026, 24, 5, 1, 0, 20, 6, 2, 'AC overhaul OT', 'finalized'),
  (920033, 33, 8, 2026, 26, 3, 1, 0, 12, 1, 0, 'Ward support OT', 'draft'),
  (910033, 33, 7, 2026, 25, 4, 1, 0, 14, 2, 2, 'Ward support OT', 'finalized'),
  (920034, 34, 8, 2026, 25, 4, 0, 1, 8, 4, 0, '', 'draft'),
  (910034, 34, 7, 2026, 25, 4, 0, 1, 8, 5, 2, '', 'finalized'),
  (920035, 35, 8, 2026, 24, 5, 0, 0, 6, 0, 0, '', 'draft'),
  (910035, 35, 7, 2026, 25, 4, 0, 0, 4, 1, 2, '', 'finalized');

UPDATE attendance_monthly SET status = 'finalized' WHERE month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 3, early_departures = 0 WHERE employee_id = 1 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 4, early_departures = 2 WHERE employee_id = 1 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 6, early_departures = 0 WHERE employee_id = 2 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 0, early_departures = 2 WHERE employee_id = 2 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 2, early_departures = 0 WHERE employee_id = 3 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 3, early_departures = 2 WHERE employee_id = 3 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 5, early_departures = 0 WHERE employee_id = 4 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 6, early_departures = 2 WHERE employee_id = 4 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 1, early_departures = 0 WHERE employee_id = 5 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 2, early_departures = 2 WHERE employee_id = 5 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 4, early_departures = 0 WHERE employee_id = 6 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 5, early_departures = 2 WHERE employee_id = 6 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 0, early_departures = 0 WHERE employee_id = 7 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 1, early_departures = 2 WHERE employee_id = 7 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 3, early_departures = 0 WHERE employee_id = 8 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 4, early_departures = 2 WHERE employee_id = 8 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 6, early_departures = 0 WHERE employee_id = 9 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 0, early_departures = 2 WHERE employee_id = 9 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 2, early_departures = 0 WHERE employee_id = 10 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 3, early_departures = 2 WHERE employee_id = 10 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 5, early_departures = 0 WHERE employee_id = 11 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 6, early_departures = 2 WHERE employee_id = 11 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 1, early_departures = 0 WHERE employee_id = 12 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 2, early_departures = 2 WHERE employee_id = 12 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 4, early_departures = 0 WHERE employee_id = 13 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 5, early_departures = 2 WHERE employee_id = 13 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 0, early_departures = 0 WHERE employee_id = 14 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 1, early_departures = 2 WHERE employee_id = 14 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 3, early_departures = 0 WHERE employee_id = 15 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 4, early_departures = 2 WHERE employee_id = 15 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 6, early_departures = 0 WHERE employee_id = 16 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 0, early_departures = 2 WHERE employee_id = 16 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 2, early_departures = 0 WHERE employee_id = 17 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 3, early_departures = 2 WHERE employee_id = 17 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 5, early_departures = 0 WHERE employee_id = 18 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 6, early_departures = 2 WHERE employee_id = 18 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 1, early_departures = 0 WHERE employee_id = 19 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 2, early_departures = 2 WHERE employee_id = 19 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 4, early_departures = 0 WHERE employee_id = 20 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 5, early_departures = 2 WHERE employee_id = 20 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 0, early_departures = 0 WHERE employee_id = 21 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 1, early_departures = 2 WHERE employee_id = 21 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 3, early_departures = 0 WHERE employee_id = 22 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 4, early_departures = 2 WHERE employee_id = 22 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 6, early_departures = 0 WHERE employee_id = 23 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 0, early_departures = 2 WHERE employee_id = 23 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 2, early_departures = 0 WHERE employee_id = 24 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 3, early_departures = 2 WHERE employee_id = 24 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 5, early_departures = 0 WHERE employee_id = 25 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 6, early_departures = 2 WHERE employee_id = 25 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 1, early_departures = 0 WHERE employee_id = 26 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 2, early_departures = 2 WHERE employee_id = 26 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 4, early_departures = 0 WHERE employee_id = 27 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 5, early_departures = 2 WHERE employee_id = 27 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 0, early_departures = 0 WHERE employee_id = 28 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 1, early_departures = 2 WHERE employee_id = 28 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 3, early_departures = 0 WHERE employee_id = 29 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 4, early_departures = 2 WHERE employee_id = 29 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 6, early_departures = 0 WHERE employee_id = 30 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 0, early_departures = 2 WHERE employee_id = 30 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 2, early_departures = 0 WHERE employee_id = 31 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 3, early_departures = 2 WHERE employee_id = 31 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 5, early_departures = 0 WHERE employee_id = 32 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 6, early_departures = 2 WHERE employee_id = 32 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 1, early_departures = 0 WHERE employee_id = 33 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 2, early_departures = 2 WHERE employee_id = 33 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 4, early_departures = 0 WHERE employee_id = 34 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 5, early_departures = 2 WHERE employee_id = 34 AND month = 7 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 0, early_departures = 0 WHERE employee_id = 35 AND month = 8 AND year = 2026;
UPDATE attendance_monthly SET late_marks = 1, early_departures = 2 WHERE employee_id = 35 AND month = 7 AND year = 2026;

INSERT OR IGNORE INTO advances (id, employee_id, amount, month, year, remarks) VALUES
  (930001, 2, 2000, 8, 2026, 'Salary advance'),
  (930002, 9, 1500, 8, 2026, 'Medical advance'),
  (930003, 26, 2500, 8, 2026, 'Salary advance'),
  (930004, 13, 2000, 7, 2026, 'Salary advance'),
  (930005, 22, 1500, 7, 2026, 'Travel advance');

INSERT OR IGNORE INTO payroll (id, month, year, status, total_employees, gross_total, deduction_total, net_total, created_at, finalized_at, paid_at)
VALUES (1, 7, 2026, 'paid', 35, 487282.1, 46679.6, 440602.5, '2026-07-03 10:00:00', '2026-08-03 11:00:00', '2026-08-05 15:30:00');
INSERT OR IGNORE INTO payroll_items (id, payroll_id, employee_id, attendance_id, present_days, absent_days, paid_leave, unpaid_leave, ot_hours, basic, hra, conveyance, other_allowance, overtime_earnings, attendance_deduction, gross, pf, esic, professional_tax, lwf, tds, advance_deduction, other_deduction, total_deductions, net_salary, status) VALUES
  (1001, 1, 1, NULL, 24, 5, 1, 0, 15, 12500, 5000, 1000, 1500, 1425, 3846.15, 17578.85, 0, 0, 200, 0, 0, 0, 0, 200, 17378.85, 'finalized'),
  (1002, 1, 2, NULL, 26, 3, 0, 1, 9, 9000, 3600, 800, 600, 675, 2153.84, 12521.16, 1512, 93.91, 200, 0, 0, 0, 0, 1805.91, 10715.25, 'finalized'),
  (1003, 1, 3, NULL, 25, 4, 0, 0, 23, 8500, 3400, 800, 600, 1725, 2046.16, 12978.84, 1428, 97.34, 200, 100, 0, 0, 0, 1825.34, 11153.5, 'finalized'),
  (1004, 1, 4, NULL, 23, 6, 0, 1, 12, 11500, 4600, 800, 800, 1080, 4765.39, 14014.61, 0, 105.11, 200, 0, 0, 0, 0, 305.11, 13709.5, 'finalized'),
  (1005, 1, 5, NULL, 26, 3, 1, 0, 4, 7500, 3000, 600, 400, 260, 1326.93, 10433.07, 1260, 78.25, 200, 0, 0, 0, 0, 1538.25, 8894.82, 'finalized'),
  (1006, 1, 6, NULL, 23, 6, 0, 0, 8, 16000, 6400, 1000, 1600, 880, 5769.24, 20110.76, 0, 0, 200, 0, 0, 0, 0, 200, 19910.76, 'finalized'),
  (1007, 1, 7, NULL, 26, 3, 0, 0, 10, 8800, 3520, 800, 500, 750, 1571.55, 12798.45, 1478.4, 95.99, 200, 0, 0, 0, 0, 1774.39, 11024.06, 'finalized'),
  (1008, 1, 8, NULL, 26, 3, 0, 1, 26, 8600, 3440, 800, 600, 1950, 2067.68, 13322.32, 1444.8, 99.92, 200, 0, 0, 0, 0, 1744.72, 11577.6, 'finalized'),
  (1009, 1, 9, NULL, 23, 6, 1, 0, 0, 7200, 2880, 600, 400, 0, 2556.9, 8523.1, 1209.6, 63.92, 0, 0, 0, 0, 0, 1273.52, 7249.58, 'finalized'),
  (1010, 1, 10, NULL, 22, 7, 0, 1, 12, 10500, 4200, 800, 800, 1020, 5015.36, 12304.64, 1764, 92.28, 200, 0, 246.09, 0, 0, 2302.37, 10002.27, 'finalized'),
  (1011, 1, 11, NULL, 26, 3, 0, 0, 5, 7800, 3120, 700, 500, 325, 1398.45, 11046.55, 1310.4, 82.85, 200, 0, 0, 0, 0, 1593.25, 9453.3, 'finalized'),
  (1012, 1, 12, NULL, 24, 5, 0, 0, 9, 12500, 5000, 1000, 1500, 855, 3846.15, 17008.85, 0, 0, 200, 0, 0, 0, 0, 200, 16808.85, 'finalized'),
  (1013, 1, 13, NULL, 26, 3, 0, 0, 3, 9200, 3680, 800, 600, 225, 1647.69, 12857.31, 1545.6, 96.43, 200, 0, 0, 2000, 0, 3842.03, 9015.28, 'finalized'),
  (1014, 1, 14, NULL, 25, 4, 1, 0, 22, 12000, 4800, 800, 1000, 1980, 2861.52, 17718.48, 0, 132.89, 200, 100, 354.37, 0, 0, 787.26, 16931.22, 'finalized'),
  (1015, 1, 15, NULL, 24, 5, 1, 0, 2, 9500, 3800, 800, 600, 140, 2826.9, 12013.1, 1596, 90.1, 200, 0, 0, 0, 0, 1886.1, 10127, 'finalized'),
  (1016, 1, 16, NULL, 24, 5, 1, 0, 8, 11000, 4400, 800, 800, 680, 3269.25, 14410.75, 0, 108.08, 200, 100, 0, 0, 0, 408.08, 14002.67, 'finalized'),
  (1017, 1, 17, NULL, 27, 2, 0, 0, 3, 7800, 3120, 700, 500, 195, 932.3, 11382.7, 1310.4, 85.37, 200, 0, 0, 0, 0, 1595.77, 9786.93, 'finalized'),
  (1018, 1, 18, NULL, 24, 5, 0, 0, 3, 8800, 3520, 800, 500, 225, 2619.25, 11225.75, 1478.4, 84.19, 200, 0, 0, 0, 0, 1762.59, 9463.16, 'finalized'),
  (1019, 1, 19, NULL, 23, 6, 0, 1, 3, 7200, 2880, 600, 400, 180, 2983.05, 8276.95, 1209.6, 62.08, 0, 0, 0, 0, 0, 1271.68, 7005.27, 'finalized'),
  (1020, 1, 20, NULL, 27, 3, 0, 0, 13, 9000, 3600, 800, 600, 975, 1615.38, 13359.62, 1512, 100.2, 200, 0, 0, 0, 0, 1812.2, 11547.42, 'finalized'),
  (1021, 1, 21, NULL, 24, 6, 0, 0, 5, 7600, 3040, 700, 500, 325, 2732.28, 9432.72, 1276.8, 70.75, 0, 0, 0, 0, 0, 1347.55, 8085.17, 'finalized'),
  (1022, 1, 22, NULL, 24, 5, 1, 0, 7, 9800, 3920, 800, 700, 525, 2926.9, 12818.1, 1646.4, 96.14, 200, 0, 0, 1500, 0, 3442.54, 9375.56, 'finalized'),
  (1023, 1, 23, NULL, 28, 1, 0, 0, 18, 8800, 3520, 800, 500, 1350, 523.85, 14446.15, 1478.4, 108.35, 200, 0, 0, 0, 0, 1786.75, 12659.4, 'finalized'),
  (1024, 1, 24, NULL, 22, 7, 0, 1, 22, 11500, 4600, 800, 800, 1980, 5446.16, 14233.84, 0, 106.75, 200, 0, 0, 0, 0, 306.75, 13927.09, 'finalized'),
  (1025, 1, 25, NULL, 24, 5, 1, 0, 8, 10800, 4320, 800, 700, 640, 3196.15, 14063.85, 0, 105.48, 200, 0, 0, 0, 0, 305.48, 13758.37, 'finalized'),
  (1026, 1, 26, NULL, 26, 3, 0, 0, 28, 8800, 3520, 800, 600, 2100, 1583.07, 14236.93, 1478.4, 106.78, 200, 0, 0, 0, 0, 1785.18, 12451.75, 'finalized'),
  (1027, 1, 27, NULL, 25, 4, 0, 0, 14, 9200, 3680, 800, 600, 1050, 2196.92, 13133.08, 1545.6, 98.5, 200, 0, 0, 0, 0, 1844.1, 11288.98, 'finalized'),
  (1028, 1, 28, NULL, 25, 4, 0, 1, 29, 7600, 3040, 700, 500, 1885, 2276.9, 11448.1, 1276.8, 85.86, 200, 0, 0, 0, 0, 1562.66, 9885.44, 'finalized'),
  (1029, 1, 29, NULL, 25, 4, 1, 0, 23, 13500, 5400, 1000, 1100, 2300, 3230.76, 20069.24, 0, 150.52, 200, 0, 0, 0, 0, 350.52, 19718.72, 'finalized'),
  (1030, 1, 30, NULL, 24, 5, 0, 0, 7, 18500, 7400, 1000, 2100, 805, 5576.9, 24228.1, 0, 0, 200, 0, 0, 0, 0, 200, 24028.1, 'finalized'),
  (1031, 1, 31, NULL, 26, 3, 0, 0, 2, 8800, 3520, 800, 500, 150, 1571.55, 12198.45, 1478.4, 91.49, 200, 0, 0, 0, 0, 1769.89, 10428.56, 'finalized'),
  (1032, 1, 32, NULL, 24, 5, 1, 0, 20, 13500, 5400, 1000, 1000, 2000, 4019.25, 18880.75, 0, 141.61, 200, 0, 0, 0, 0, 341.61, 18539.14, 'finalized'),
  (1033, 1, 33, NULL, 25, 4, 1, 0, 14, 8500, 3400, 800, 600, 1050, 2046.16, 12303.84, 1428, 92.28, 200, 0, 0, 0, 0, 1720.28, 10583.56, 'finalized'),
  (1034, 1, 34, NULL, 25, 4, 0, 1, 8, 7800, 3120, 700, 500, 520, 2330.75, 10309.25, 1310.4, 77.32, 200, 0, 0, 0, 0, 1587.72, 8721.53, 'finalized'),
  (1035, 1, 35, NULL, 25, 4, 0, 0, 4, 16000, 6400, 1000, 1600, 440, 3846.16, 21593.84, 0, 0, 200, 0, 0, 0, 0, 200, 21393.84, 'finalized');
INSERT OR IGNORE INTO salary_slips (id, payroll_item_id, employee_id, slip_number, month, year, generated_at) VALUES
  (940001, 1001, 1, 'SL-2026-07-0001', 7, 2026, '2026-08-03 12:00:00'),
  (940002, 1002, 2, 'SL-2026-07-0002', 7, 2026, '2026-08-03 12:00:00'),
  (940003, 1003, 3, 'SL-2026-07-0003', 7, 2026, '2026-08-03 12:00:00'),
  (940004, 1004, 4, 'SL-2026-07-0004', 7, 2026, '2026-08-03 12:00:00'),
  (940005, 1005, 5, 'SL-2026-07-0005', 7, 2026, '2026-08-03 12:00:00'),
  (940006, 1006, 6, 'SL-2026-07-0006', 7, 2026, '2026-08-03 12:00:00'),
  (940007, 1007, 7, 'SL-2026-07-0007', 7, 2026, '2026-08-03 12:00:00'),
  (940008, 1008, 8, 'SL-2026-07-0008', 7, 2026, '2026-08-03 12:00:00'),
  (940009, 1009, 9, 'SL-2026-07-0009', 7, 2026, '2026-08-03 12:00:00'),
  (940010, 1010, 10, 'SL-2026-07-0010', 7, 2026, '2026-08-03 12:00:00'),
  (940011, 1011, 11, 'SL-2026-07-0011', 7, 2026, '2026-08-03 12:00:00'),
  (940012, 1012, 12, 'SL-2026-07-0012', 7, 2026, '2026-08-03 12:00:00'),
  (940013, 1013, 13, 'SL-2026-07-0013', 7, 2026, '2026-08-03 12:00:00'),
  (940014, 1014, 14, 'SL-2026-07-0014', 7, 2026, '2026-08-03 12:00:00'),
  (940015, 1015, 15, 'SL-2026-07-0015', 7, 2026, '2026-08-03 12:00:00'),
  (940016, 1016, 16, 'SL-2026-07-0016', 7, 2026, '2026-08-03 12:00:00'),
  (940017, 1017, 17, 'SL-2026-07-0017', 7, 2026, '2026-08-03 12:00:00'),
  (940018, 1018, 18, 'SL-2026-07-0018', 7, 2026, '2026-08-03 12:00:00'),
  (940019, 1019, 19, 'SL-2026-07-0019', 7, 2026, '2026-08-03 12:00:00'),
  (940020, 1020, 20, 'SL-2026-07-0020', 7, 2026, '2026-08-03 12:00:00'),
  (940021, 1021, 21, 'SL-2026-07-0021', 7, 2026, '2026-08-03 12:00:00'),
  (940022, 1022, 22, 'SL-2026-07-0022', 7, 2026, '2026-08-03 12:00:00'),
  (940023, 1023, 23, 'SL-2026-07-0023', 7, 2026, '2026-08-03 12:00:00'),
  (940024, 1024, 24, 'SL-2026-07-0024', 7, 2026, '2026-08-03 12:00:00'),
  (940025, 1025, 25, 'SL-2026-07-0025', 7, 2026, '2026-08-03 12:00:00'),
  (940026, 1026, 26, 'SL-2026-07-0026', 7, 2026, '2026-08-03 12:00:00'),
  (940027, 1027, 27, 'SL-2026-07-0027', 7, 2026, '2026-08-03 12:00:00'),
  (940028, 1028, 28, 'SL-2026-07-0028', 7, 2026, '2026-08-03 12:00:00'),
  (940029, 1029, 29, 'SL-2026-07-0029', 7, 2026, '2026-08-03 12:00:00'),
  (940030, 1030, 30, 'SL-2026-07-0030', 7, 2026, '2026-08-03 12:00:00'),
  (940031, 1031, 31, 'SL-2026-07-0031', 7, 2026, '2026-08-03 12:00:00'),
  (940032, 1032, 32, 'SL-2026-07-0032', 7, 2026, '2026-08-03 12:00:00'),
  (940033, 1033, 33, 'SL-2026-07-0033', 7, 2026, '2026-08-03 12:00:00'),
  (940034, 1034, 34, 'SL-2026-07-0034', 7, 2026, '2026-08-03 12:00:00'),
  (940035, 1035, 35, 'SL-2026-07-0035', 7, 2026, '2026-08-03 12:00:00');

INSERT OR IGNORE INTO payroll (id, month, year, status, total_employees, gross_total, deduction_total, net_total, created_at, finalized_at, paid_at)
VALUES (2, 8, 2026, 'draft', 35, 486348.64, 48932.41, 437416.23, '2026-08-03 10:00:00', NULL, NULL);
INSERT OR IGNORE INTO payroll_items (id, payroll_id, employee_id, attendance_id, present_days, absent_days, paid_leave, unpaid_leave, ot_hours, basic, hra, conveyance, other_allowance, overtime_earnings, attendance_deduction, gross, pf, esic, professional_tax, lwf, tds, advance_deduction, other_deduction, total_deductions, net_salary, status) VALUES
  (2001, 2, 1, NULL, 24, 5, 1, 0, 12, 12500, 5000, 1000, 1500, 1140, 3846.15, 17293.85, 0, 0, 200, 0, 0, 0, 0, 200, 17093.85, 'draft'),
  (2002, 2, 2, NULL, 25, 4, 0, 1, 8, 9000, 3600, 800, 600, 600, 2692.3, 11907.7, 1512, 89.31, 200, 0, 0, 2000, 0, 3801.31, 8106.39, 'draft'),
  (2003, 2, 3, NULL, 26, 3, 0, 0, 24, 8500, 3400, 800, 600, 1800, 1534.62, 13565.38, 1428, 101.74, 200, 100, 0, 0, 0, 1829.74, 11735.64, 'draft'),
  (2004, 2, 4, NULL, 23, 6, 0, 1, 15, 11500, 4600, 800, 800, 1350, 4765.39, 14284.61, 0, 107.13, 200, 0, 0, 0, 0, 307.13, 13977.48, 'draft'),
  (2005, 2, 5, NULL, 25, 4, 1, 0, 0, 7500, 3000, 600, 400, 0, 1769.24, 9730.76, 1260, 72.98, 0, 0, 0, 0, 0, 1332.98, 8397.78, 'draft'),
  (2006, 2, 6, NULL, 24, 5, 0, 0, 6, 16000, 6400, 1000, 1600, 660, 4807.7, 20852.3, 0, 0, 200, 0, 0, 0, 0, 200, 20652.3, 'draft'),
  (2007, 2, 7, NULL, 26, 3, 0, 0, 10, 8800, 3520, 800, 500, 750, 1571.55, 12798.45, 1478.4, 95.99, 200, 0, 0, 0, 0, 1774.39, 11024.06, 'draft'),
  (2008, 2, 8, NULL, 25, 4, 0, 1, 28, 8600, 3440, 800, 600, 2100, 2584.6, 12955.4, 1444.8, 97.17, 200, 0, 0, 0, 0, 1741.97, 11213.43, 'draft'),
  (2009, 2, 9, NULL, 24, 5, 1, 0, 0, 7200, 2880, 600, 400, 0, 2130.75, 8949.25, 1209.6, 67.12, 0, 0, 0, 1500, 0, 2776.72, 6172.53, 'draft'),
  (2010, 2, 10, NULL, 22, 7, 0, 1, 9, 10500, 4200, 800, 800, 765, 5015.36, 12049.64, 1764, 90.37, 200, 0, 240.99, 0, 0, 2295.36, 9754.28, 'draft'),
  (2011, 2, 11, NULL, 25, 4, 0, 0, 4, 7800, 3120, 700, 500, 260, 1864.6, 10515.4, 1310.4, 78.87, 200, 0, 0, 0, 0, 1589.27, 8926.13, 'draft'),
  (2012, 2, 12, NULL, 25, 4, 0, 0, 10, 12500, 5000, 1000, 1500, 950, 3076.92, 17873.08, 0, 0, 200, 0, 0, 0, 0, 200, 17673.08, 'draft'),
  (2013, 2, 13, NULL, 26, 3, 0, 0, 6, 9200, 3680, 800, 600, 450, 1647.69, 13082.31, 1545.6, 98.12, 200, 0, 0, 0, 0, 1843.72, 11238.59, 'draft'),
  (2014, 2, 14, NULL, 24, 5, 1, 0, 18, 12000, 4800, 800, 1000, 1620, 3576.9, 16643.1, 0, 124.82, 200, 100, 332.86, 0, 0, 757.68, 15885.42, 'draft'),
  (2015, 2, 15, NULL, 25, 4, 1, 0, 0, 9500, 3800, 800, 600, 0, 2261.52, 12438.48, 1596, 93.29, 200, 0, 0, 0, 0, 1889.29, 10549.19, 'draft'),
  (2016, 2, 16, NULL, 24, 5, 1, 0, 8, 11000, 4400, 800, 800, 680, 3269.25, 14410.75, 0, 108.08, 200, 100, 0, 0, 0, 408.08, 14002.67, 'draft'),
  (2017, 2, 17, NULL, 26, 3, 0, 0, 5, 7800, 3120, 700, 500, 325, 1398.45, 11046.55, 1310.4, 82.85, 200, 0, 0, 0, 0, 1593.25, 9453.3, 'draft'),
  (2018, 2, 18, NULL, 25, 4, 0, 0, 7, 8800, 3520, 800, 500, 525, 2095.4, 12049.6, 1478.4, 90.37, 200, 0, 0, 0, 0, 1768.77, 10280.83, 'draft'),
  (2019, 2, 19, NULL, 23, 6, 0, 1, 0, 7200, 2880, 600, 400, 0, 2983.05, 8096.95, 1209.6, 60.73, 0, 0, 0, 0, 0, 1270.33, 6826.62, 'draft'),
  (2020, 2, 20, NULL, 26, 4, 0, 0, 12, 9000, 3600, 800, 600, 900, 2153.84, 12746.16, 1512, 95.6, 200, 0, 0, 0, 0, 1807.6, 10938.56, 'draft'),
  (2021, 2, 21, NULL, 25, 5, 0, 0, 6, 7600, 3040, 700, 500, 390, 2276.9, 9953.1, 1276.8, 74.65, 0, 0, 0, 0, 0, 1351.45, 8601.65, 'draft'),
  (2022, 2, 22, NULL, 24, 5, 1, 0, 10, 9800, 3920, 800, 700, 750, 2926.9, 13043.1, 1646.4, 97.82, 200, 0, 0, 0, 0, 1944.22, 11098.88, 'draft'),
  (2023, 2, 23, NULL, 27, 2, 0, 0, 14, 8800, 3520, 800, 500, 1050, 1047.7, 13622.3, 1478.4, 102.17, 200, 0, 0, 0, 0, 1780.57, 11841.73, 'draft'),
  (2024, 2, 24, NULL, 23, 6, 0, 1, 20, 11500, 4600, 800, 800, 1800, 4765.39, 14734.61, 0, 110.51, 200, 0, 0, 0, 0, 310.51, 14424.1, 'draft'),
  (2025, 2, 25, NULL, 24, 5, 1, 0, 8, 10800, 4320, 800, 700, 640, 3196.15, 14063.85, 0, 105.48, 200, 0, 0, 0, 0, 305.48, 13758.37, 'draft'),
  (2026, 2, 26, NULL, 25, 4, 0, 0, 30, 8800, 3520, 800, 600, 2250, 2110.76, 13859.24, 1478.4, 103.94, 200, 0, 0, 2500, 0, 4282.34, 9576.9, 'draft'),
  (2027, 2, 27, NULL, 26, 3, 0, 0, 18, 9200, 3680, 800, 600, 1350, 1647.69, 13982.31, 1545.6, 104.87, 200, 0, 0, 0, 0, 1850.47, 12131.84, 'draft'),
  (2028, 2, 28, NULL, 25, 4, 0, 1, 26, 7600, 3040, 700, 500, 1690, 2276.9, 11253.1, 1276.8, 84.4, 200, 0, 0, 0, 0, 1561.2, 9691.9, 'draft'),
  (2029, 2, 29, NULL, 24, 5, 1, 0, 22, 13500, 5400, 1000, 1100, 2200, 4038.45, 19161.55, 0, 143.71, 200, 0, 0, 0, 0, 343.71, 18817.84, 'draft'),
  (2030, 2, 30, NULL, 25, 4, 0, 0, 8, 18500, 7400, 1000, 2100, 920, 4461.52, 25458.48, 0, 0, 200, 0, 0, 0, 0, 200, 25258.48, 'draft'),
  (2031, 2, 31, NULL, 26, 3, 0, 0, 5, 8800, 3520, 800, 500, 375, 1571.55, 12423.45, 1478.4, 93.18, 200, 0, 0, 0, 0, 1771.58, 10651.87, 'draft'),
  (2032, 2, 32, NULL, 23, 6, 1, 0, 16, 13500, 5400, 1000, 1000, 1600, 4823.1, 17676.9, 0, 132.58, 200, 0, 0, 0, 0, 332.58, 17344.32, 'draft'),
  (2033, 2, 33, NULL, 26, 3, 1, 0, 12, 8500, 3400, 800, 600, 900, 1534.62, 12665.38, 1428, 94.99, 200, 0, 0, 0, 0, 1722.99, 10942.39, 'draft'),
  (2034, 2, 34, NULL, 25, 4, 0, 1, 8, 7800, 3120, 700, 500, 520, 2330.75, 10309.25, 1310.4, 77.32, 200, 0, 0, 0, 0, 1587.72, 8721.53, 'draft'),
  (2035, 2, 35, NULL, 24, 5, 0, 0, 6, 16000, 6400, 1000, 1600, 660, 4807.7, 20852.3, 0, 0, 200, 0, 0, 0, 0, 200, 20652.3, 'draft');

-- Recruitment: openings, candidates, interviews
INSERT OR IGNORE INTO job_openings (id, code, title, department, site_id, positions_required, status, notes) VALUES
  (950001, 'JOB0001', 'Security Guard', 'Security', 2, 4, 'open', 'Night shift coverage for Highland Towers'),
  (950002, 'JOB0002', 'Housekeeping Staff', 'Housekeeping', 4, 3, 'fulfilled', 'City Centre Mall — mall opening team'),
  (950003, 'JOB0003', 'Electrician (Licensed)', 'Technical', NULL, 1, 'open', 'Internal requirement — Chennai region');
INSERT OR IGNORE INTO candidates (id, full_name, mobile, email, opening_id, source, experience, expected_salary, remarks, status) VALUES
  (960001, 'Prakash Nair', '98100 20001', 'prakash.nair@example.in', 950001, 'walk_in', '3 yrs', 9500.0, 'Ex-serviceman quota preferred', 'selected'),
  (960002, 'Deepa Krishnan', '98100 20002', NULL, 950001, 'job_portal', '1 yr', 8800.0, NULL, 'screening'),
  (960003, 'Imran Shaikh', '98100 20003', 'imran.s@example.in', 950002, 'agency', '4 yrs', 8200.0, 'Via Metro Facilities agency tie-up', 'joined'),
  (960004, 'Latha Rao', '98100 20004', NULL, 950002, 'referral', '2 yrs', 8000.0, NULL, 'rejected'),
  (960005, 'Ganesh Iyer', '98100 20005', 'ganesh.iyer@example.in', 950003, 'referral', '6 yrs', 14000.0, 'KA license + wireman certificate claimed', 'shortlisted');
INSERT OR IGNORE INTO interviews (id, candidate_id, round, scheduled_at, interviewer, mode, outcome, remarks) VALUES
  (970001, 960001, 1, '2026-08-10 10:30', 'Suresh Kumar', 'in_person', 'passed', 'Good discipline record'),
  (970002, 960002, 1, '2026-08-14 14:00', 'Ramesh Kumar', 'video', 'pending', NULL),
  (970003, 960003, 1, '2026-07-28 11:00', 'Sunil Pawar', 'in_person', 'passed', NULL),
  (970004, 960005, 1, '2026-08-18 16:00', 'Anand Kumar', 'phone', 'passed', 'Technical round pending'),
  (970005, 960004, 1, '2026-07-25 12:00', 'Sunil Pawar', 'phone', 'failed', 'Did not meet attendance expectations');
INSERT OR IGNORE INTO employee_loans (id, employee_id, principal, emi_amount, outstanding, start_month, start_year, remarks) VALUES
  (990001, 5, 40000, 4000, 40000, 8, 2026, 'Salary advance loan — 10 month recovery');
INSERT OR IGNORE INTO holidays (date, name) VALUES
  ('2026-01-26', 'Republic Day'),
  ('2026-05-01', 'Labour Day'),
  ('2026-08-15', 'Independence Day'),
  ('2026-10-02', 'Gandhi Jayanti'),
  ('2026-11-08', 'Diwali'),
  ('2026-12-25', 'Christmas');
INSERT OR IGNORE INTO leave_requests (id, employee_id, leave_type_id, start_date, end_date, days, reason, status, manager_status, manager_by, manager_at, hr_status, hr_by, hr_at, created_by) VALUES
  (980001, 2, 1, '2026-08-03', '2026-08-04', 2.0, 'Family function', 'approved', 'approved', 'admin@staffsway.in', '2026-07-30 10:00:00', 'approved', 'admin@staffsway.in', '2026-07-31 09:30:00', 'admin@staffsway.in'),
  (980002, 9, 3, '2026-08-12', '2026-08-12', 1.0, 'Fever', 'pending_hr', 'approved', 'admin@staffsway.in', '2026-08-11 18:00:00', 'pending', NULL, NULL, 'admin@staffsway.in'),
  (980003, 12, 4, '2026-08-20', '2026-08-21', 2.0, 'Personal travel (unpaid)', 'pending_manager', 'pending', NULL, NULL, 'pending', NULL, NULL, 'admin@staffsway.in');
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, status, employee_id)
VALUES (7, 'Amit Verma', 'amit.verma@staffsway.in', 'pbkdf2$100000$3feWcswJ08_aTXhowm5Bdw$kncTUIy8GG5uRfB9ZyW2lSTgXCsuIF856TEHVsuczMg', 'employee', 'active', 2);
INSERT OR IGNORE INTO minimum_wages (state, category, basic_monthly, va_monthly, effective_from) VALUES
  ('Haryana', 'Unskilled', 11000, 500, '2026-01-01'),
  ('Haryana', 'Semi-skilled', 12500, 550, '2026-01-01'),
  ('Haryana', 'Skilled', 14000, 600, '2026-01-01'),
  ('Haryana', 'Highly Skilled', 16000, 700, '2026-01-01');

UPDATE employees SET skill_category = CASE id WHEN 1 THEN 'Unskilled' WHEN 2 THEN 'Unskilled' WHEN 3 THEN 'Unskilled' WHEN 4 THEN 'Unskilled' WHEN 5 THEN 'Unskilled' WHEN 6 THEN 'Skilled' WHEN 7 THEN 'Unskilled' WHEN 8 THEN 'Unskilled' WHEN 9 THEN 'Unskilled' WHEN 10 THEN 'Unskilled' WHEN 11 THEN 'Unskilled' WHEN 12 THEN 'Unskilled' WHEN 13 THEN 'Unskilled' WHEN 14 THEN 'Unskilled' WHEN 15 THEN 'Unskilled' WHEN 16 THEN 'Unskilled' WHEN 17 THEN 'Unskilled' WHEN 18 THEN 'Unskilled' WHEN 19 THEN 'Unskilled' WHEN 20 THEN 'Unskilled' WHEN 21 THEN 'Unskilled' WHEN 22 THEN 'Unskilled' WHEN 23 THEN 'Unskilled' WHEN 24 THEN 'Unskilled' WHEN 25 THEN 'Unskilled' WHEN 26 THEN 'Unskilled' WHEN 27 THEN 'Unskilled' WHEN 28 THEN 'Unskilled' WHEN 29 THEN 'Semi-skilled' WHEN 30 THEN 'Skilled' WHEN 31 THEN 'Unskilled' WHEN 32 THEN 'Semi-skilled' WHEN 33 THEN 'Unskilled' WHEN 34 THEN 'Unskilled' WHEN 35 THEN 'Skilled' ELSE skill_category END WHERE skill_category IS NULL;

INSERT OR IGNORE INTO compliance_records (id, obligation, year, month, due_date, status, remarks, done_by, done_at) VALUES
  (995001, 'PF', 2026, 1, '2026-02-15', 'done', 'Filed on time', 'admin@staffsway.in', '2026-02-15 12:00:00'),
  (995002, 'ESI', 2026, 1, '2026-02-15', 'done', 'Filed on time', 'admin@staffsway.in', '2026-02-15 12:00:00'),
  (995003, 'PT', 2026, 1, '2026-02-15', 'done', 'Filed on time', 'admin@staffsway.in', '2026-02-15 12:00:00'),
  (995004, 'TDS', 2026, 1, '2026-02-07', 'done', 'Filed on time', 'admin@staffsway.in', '2026-02-07 12:00:00'),
  (995005, 'PF', 2026, 2, '2026-03-15', 'done', 'Filed on time', 'admin@staffsway.in', '2026-03-15 12:00:00'),
  (995006, 'ESI', 2026, 2, '2026-03-15', 'done', 'Filed on time', 'admin@staffsway.in', '2026-03-15 12:00:00'),
  (995007, 'PT', 2026, 2, '2026-03-15', 'done', 'Filed on time', 'admin@staffsway.in', '2026-03-15 12:00:00'),
  (995008, 'TDS', 2026, 2, '2026-03-07', 'done', 'Filed on time', 'admin@staffsway.in', '2026-03-07 12:00:00'),
  (995009, 'PF', 2026, 3, '2026-04-15', 'done', 'Filed on time', 'admin@staffsway.in', '2026-04-15 12:00:00'),
  (995010, 'ESI', 2026, 3, '2026-04-15', 'done', 'Filed on time', 'admin@staffsway.in', '2026-04-15 12:00:00'),
  (995011, 'PT', 2026, 3, '2026-04-15', 'done', 'Filed on time', 'admin@staffsway.in', '2026-04-15 12:00:00'),
  (995012, 'TDS', 2026, 3, '2026-04-07', 'done', 'Filed on time', 'admin@staffsway.in', '2026-04-07 12:00:00'),
  (995013, 'PF', 2026, 4, '2026-05-15', 'done', 'Filed on time', 'admin@staffsway.in', '2026-05-15 12:00:00'),
  (995014, 'ESI', 2026, 4, '2026-05-15', 'done', 'Filed on time', 'admin@staffsway.in', '2026-05-15 12:00:00'),
  (995015, 'PT', 2026, 4, '2026-05-15', 'done', 'Filed on time', 'admin@staffsway.in', '2026-05-15 12:00:00'),
  (995016, 'TDS', 2026, 4, '2026-05-07', 'done', 'Filed on time', 'admin@staffsway.in', '2026-05-07 12:00:00'),
  (995017, 'PF', 2026, 5, '2026-06-15', 'done', 'Filed on time', 'admin@staffsway.in', '2026-06-15 12:00:00'),
  (995018, 'ESI', 2026, 5, '2026-06-15', 'done', 'Filed on time', 'admin@staffsway.in', '2026-06-15 12:00:00'),
  (995019, 'PT', 2026, 5, '2026-06-15', 'done', 'Filed on time', 'admin@staffsway.in', '2026-06-15 12:00:00'),
  (995020, 'TDS', 2026, 5, '2026-06-07', 'done', 'Filed on time', 'admin@staffsway.in', '2026-06-07 12:00:00'),
  (995021, 'PF', 2026, 6, '2026-07-15', 'done', 'Filed on time', 'admin@staffsway.in', '2026-07-15 12:00:00'),
  (995022, 'ESI', 2026, 6, '2026-07-15', 'done', 'Filed on time', 'admin@staffsway.in', '2026-07-15 12:00:00'),
  (995023, 'PT', 2026, 6, '2026-07-15', 'done', 'Filed on time', 'admin@staffsway.in', '2026-07-15 12:00:00'),
  (995024, 'TDS', 2026, 6, '2026-07-07', 'done', 'Filed on time', 'admin@staffsway.in', '2026-07-07 12:00:00'),
  (995025, 'PF', 2026, 7, '2026-08-15', 'done', 'Filed on time', 'admin@staffsway.in', '2026-08-15 12:00:00'),
  (995026, 'ESI', 2026, 7, '2026-08-15', 'done', 'Filed on time', 'admin@staffsway.in', '2026-08-15 12:00:00'),
  (995027, 'PT', 2026, 7, '2026-08-15', 'done', 'Filed on time', 'admin@staffsway.in', '2026-08-15 12:00:00'),
  (995028, 'TDS', 2026, 7, '2026-08-07', 'done', 'Filed on time', 'admin@staffsway.in', '2026-08-07 12:00:00'),
  (995029, 'PF', 2026, 8, '2026-09-15', 'pending', NULL, NULL, NULL),
  (995030, 'ESI', 2026, 8, '2026-09-15', 'pending', NULL, NULL, NULL),
  (995031, 'PT', 2026, 8, '2026-09-15', 'pending', NULL, NULL, NULL),
  (995032, 'TDS', 2026, 8, '2026-09-07', 'pending', NULL, NULL, NULL),
  (995033, 'LWF', 2026, 6, '2026-07-31', 'done', 'Half-yearly return filed', 'admin@staffsway.in', '2026-07-28 11:00:00'),
  (995034, 'BONUS', 2026, 3, '2026-11-30', 'pending', NULL, NULL, NULL);

-- Assets: catalog + assignment history
INSERT OR IGNORE INTO assets (id, asset_code, asset_type, brand, model, serial_number, purchase_date, purchase_price, warranty_expiry, condition_notes, status) VALUES
  (200001, 'AST0001', 'Laptop', 'HP', 'EliteBook 840', 'SN-LAP-0001', '2025-01-15', 62000, '2027-01-14', 'Good', 'assigned'),
  (200002, 'AST0002', 'Mobile', 'Samsung', 'Galaxy M14', 'SN-MOB-0002', '2025-03-02', 14500, '2027-03-01', 'Good', 'assigned'),
  (200003, 'AST0003', 'ID Card', NULL, NULL, 'ID-0003', '2025-02-10', 150, NULL, NULL, 'assigned'),
  (200004, 'AST0004', 'Uniform', NULL, 'XL', 'UNI-0004', '2025-01-20', 900, NULL, NULL, 'assigned'),
  (200005, 'AST0005', 'Laptop', 'Dell', 'Latitude 5430', 'SN-LAP-0005', '2024-10-05', 58000, '2026-10-04', 'Good', 'available'),
  (200006, 'AST0006', 'Vehicle', 'TVS', 'Apache RTR', 'MH12-PW-0006', '2024-06-15', 110000, '2027-06-14', 'Good', 'assigned'),
  (200007, 'AST0007', 'Mobile', 'Vivo', 'Y21', 'SN-MOB-0007', '2025-06-01', 12500, '2027-05-31', NULL, 'available'),
  (200008, 'AST0008', 'Tools', 'Bosch', 'Drill Kit', 'TK-0008', '2025-02-25', 8500, NULL, NULL, 'assigned');
INSERT OR IGNORE INTO asset_assignments (id, asset_id, employee_id, action, issue_date, return_date, replacement_id, reason, performed_by, created_at) VALUES
  (201001, 200001, 1, 'issue', '2025-01-20', NULL, NULL, 'Supervisor laptop', 'admin@staffsway.in', '2025-01-20 10:00:00'),
  (201002, 200002, 6, 'issue', '2025-03-10', NULL, NULL, 'Facility supervisor mobile', 'admin@staffsway.in', '2025-03-10 10:00:00'),
  (201003, 200003, 2, 'issue', '2025-02-12', NULL, NULL, 'Site entry ID', 'admin@staffsway.in', '2025-02-12 10:00:00'),
  (201004, 200004, 3, 'issue', '2025-01-25', NULL, NULL, 'Night shift uniform', 'admin@staffsway.in', '2025-01-25 10:00:00'),
  (201005, 200006, 22, 'issue', '2024-06-20', NULL, NULL, 'Transport duty vehicle', 'admin@staffsway.in', '2024-06-20 10:00:00'),
  (201006, 200008, 4, 'issue', '2025-03-01', NULL, NULL, 'Electrical maintenance kit', 'admin@staffsway.in', '2025-03-01 10:00:00');


-- Separations: resignation & termination workflow demo
INSERT OR IGNORE INTO separations (id, employee_id, separation_type, resignation_date, last_working_date, notice_period_days, notice_served_days, notice_buyout, reason, status, approved_by, approved_at, created_at, updated_at) VALUES
  (300001, 36, 'resignation', '2026-08-05', '2026-08-25', 30, 20, 0, 'Personal relocation', 'approved', 'admin@staffsway.in', '2026-08-07 11:00:00', '2026-08-05 09:00:00', '2026-08-07 11:00:00'),
  (300002, 37, 'resignation', '2026-08-12', '2026-08-31', 30, 19, 0, 'Higher studies', 'approved', 'admin@staffsway.in', '2026-08-14 12:00:00', '2026-08-12 09:00:00', '2026-08-14 12:00:00'),
  (300003, 38, 'termination', '2026-08-18', '2026-08-18', 0, 0, 1, 'Policy violation', 'terminated', 'admin@staffsway.in', '2026-08-18 10:00:00', '2026-08-18 09:00:00', '2026-08-18 10:00:00'),
  (300004, 8, 'resignation', '2026-07-10', '2026-07-31', 30, 21, 0, 'Better opportunity', 'approved', 'admin@staffsway.in', '2026-07-12 11:00:00', '2026-07-10 09:00:00', '2026-07-12 11:00:00');
INSERT OR IGNORE INTO exit_interviews (id, separation_id, employee_id, reason_for_leaving, job_satisfaction, work_environment, management_rating, growth_opportunity, would_recommend, feedback_text, conducted_by, conducted_at) VALUES
  (301001, 300001, 36, 'Relocating to another city', 3, 3, 3, 2, 1, 'Good company to work with.', 'admin@staffsway.in', '2026-08-26 10:00:00'),
  (301002, 300004, 8, 'Better pay at competitor', 3, 4, 4, 3, 1, 'Night shift rotation is tough.', 'admin@staffsway.in', '2026-08-01 10:00:00');


-- Performance: reviews demo data
INSERT OR IGNORE INTO performance_reviews (id, employee_id, review_period, review_type, reviewer_id, reviewer_name, overall_rating, strengths, improvements, comments, status, created_by, created_at) VALUES
  (400001, 1, 'Q1 2026', 'quarterly', NULL, 'Admin', 4.5, 'Leadership, discipline', 'Delegate more', 'Strong performer', 'finalized', 'admin@staffsway.in', '2026-04-15 10:00:00'),
  (400002, 6, 'Q1 2026', 'quarterly', NULL, 'Admin', 4.0, 'Site coordination', 'Documentation', 'Reliable', 'finalized', 'admin@staffsway.in', '2026-04-15 10:00:00'),
  (400003, 30, 'Q1 2026', 'quarterly', NULL, 'Admin', 4.2, 'Technical skill', 'Punctuality', NULL, 'finalized', 'admin@staffsway.in', '2026-04-16 10:00:00'),
  (400004, 2, 'Q1 2026', 'quarterly', NULL, 'Admin', 3.5, 'Attendance', 'Skill upgrade', NULL, 'finalized', 'admin@staffsway.in', '2026-04-16 10:00:00'),
  (400005, 12, 'Q2 2026', 'quarterly', NULL, 'Admin', 4.3, 'Team handling', NULL, 'Good', 'finalized', 'admin@staffsway.in', '2026-07-18 10:00:00'),
  (400006, 14, 'Q2 2026', 'quarterly', NULL, 'Admin', 3.8, 'Responsiveness', 'Safety compliance', NULL, 'finalized', 'admin@staffsway.in', '2026-07-18 10:00:00');


-- Expenses: operating / administrative expense register
INSERT OR IGNORE INTO expenses (id, category, description, amount, expense_date, payment_method, vendor, site_id, reference, created_by) VALUES
  (500001, 'Salaries', 'Site payroll disbursement', 184500, '2026-08-05', 'Bank Transfer', 'ABC Facility Services', 1, 'PAY-JUL26', 'admin@staffsway.in'),
  (500002, 'Transport', 'Staff transport for night shift', 42500, '2026-08-12', 'UPI', 'City Cabs', 7, 'TRN-AUG12', 'admin@staffsway.in'),
  (500003, 'Uniforms', 'Uniform procurement Q3', 18000, '2026-08-14', 'Cheque', 'UniWear Traders', NULL, 'UNI-Q3', 'admin@staffsway.in'),
  (500004, 'Training', 'Fire safety training batch', 12000, '2026-07-20', 'Card', 'Safeguard Academy', 2, 'TRN-FIRE', 'admin@staffsway.in'),
  (500005, 'Equipment', 'PPE kits purchase', 24500, '2026-08-08', 'Bank Transfer', 'SafetyPlus Supplies', 8, 'PPE-AUG', 'admin@staffsway.in'),
  (500006, 'Utilities', 'Office electricity', 5600, '2026-08-10', 'Auto Debit', 'MSEDCL', NULL, 'UTL-AUG', 'admin@staffsway.in'),
  (500007, 'Salaries', 'Mid-month advance payout', 22000, '2026-08-18', 'Bank Transfer', 'Staffsway Payroll', 1, 'ADV-MID', 'admin@staffsway.in'),
  (500008, 'Marketing', 'Staffing fair participation', 15000, '2026-07-28', 'Card', 'JobFest Events', NULL, 'MKT-JOBF', 'admin@staffsway.in');

