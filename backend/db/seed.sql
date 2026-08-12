DELETE FROM salary_slips;
DELETE FROM payroll_items;
DELETE FROM payroll;
DELETE FROM advances;
DELETE FROM attendance_monthly;
DELETE FROM salary_structures;
DELETE FROM employee_documents;
DELETE FROM employees;
DELETE FROM sites;
DELETE FROM clients;
DELETE FROM leave_types;
DELETE FROM shift_types;
DELETE FROM settings;
DELETE FROM users;

DELETE FROM sqlite_sequence WHERE name IN ('salary_slips','payroll_items','payroll','advances','attendance_monthly','salary_structures','employee_documents','employees','sites','clients','leave_types','shift_types','settings','users');

INSERT INTO users (id, name, email, password_hash, role, status) VALUES (1, 'System Administrator', 'admin@staffsway.in', 'pwsdemo-salt$72de2b21c4fbdd684791cc22e7a532605afdeaeebf9c89ce1bd6beef113fd8fd', 'admin', 'active');

INSERT INTO settings (id, company_name, company_tagline, address, city, state, pincode, phone, email, website, gstin, pan, cin, currency, financial_year_start, salary_basis_days, pf_rate, pf_cap, pf_eligibility, esic_rate, esic_eligibility, professional_tax_amount, professional_tax_min_gross, default_ot_rate, attendance_lock_enabled)
VALUES (1, 'Staffsway', 'Manpower Staffing & HRMS', '501 Corporate Tower, Andheri East', 'Mumbai', 'Maharashtra', '400069', '+91 22 4890 2200', 'info@staffsway.in', 'https://staffsway.in', '27AABCP8892Q1Z5', 'AABCP8892Q', 'U74900MH2014PTC284110', 'INR', 4, 26, 12, 1800, 15000, 0.75, 21000, 200, 10000, 80, 1);

INSERT INTO leave_types (id, name, code, paid_default, max_days) VALUES
  (1, 'Casual Leave', 'CL', 1, 10),
  (2, 'Earned Leave', 'EL', 1, 15),
  (3, 'Sick Leave', 'SL', 1, 7),
  (4, 'Unpaid Leave', 'UL', 0, NULL),
  (5, 'Festival Leave', 'FL', 1, 3);

INSERT INTO shift_types (id, name, start_time, end_time) VALUES
  (1, 'General', '09:00', '18:00'),
  (2, 'Morning', '06:00', '14:00'),
  (3, 'Evening', '14:00', '22:00'),
  (4, 'Night', '22:00', '06:00'),
  (5, 'Rotational', NULL, NULL),
  (6, 'Split', '10:00', '14:00');

INSERT INTO clients (id, name, contact_person, phone, email, address, contract_start, contract_end, status) VALUES
  (1, 'ABC Facility Services', 'Anil Kapoor', '98220 11001', 'accounts@abcfacilities.in', '210 Trade Centre, Andheri East, Mumbai, Maharashtra 400069', '2025-01-01', '2027-12-31', 'active'),
  (2, 'Metro Mall Management', 'Priya Nair', '98330 22002', 'ops@metromalls.in', '4-1-20 Metro House, Banjara Hills, Hyderabad, Telangana 500034', '2025-04-01', '2026-12-31', 'active'),
  (3, 'SecureTech Industries', 'Rajesh Menon', '98440 33003', 'hr@securetech.in', 'Plot 12, Industrial Estate, Ambattur, Chennai, Tamil Nadu 600058', '2025-02-15', '2027-02-14', 'active'),
  (4, 'Greenfield Hospital', 'Dr. Sunita Rao', '98550 44004', 'admin@greenfieldhosp.in', '5 Andheri West, Mumbai, Maharashtra 400053', '2024-11-01', '2026-10-31', 'active');

INSERT INTO sites (id, client_id, name, location, supervisor_name, shift_type, status) VALUES
  (1, 1, 'Corporate Park Chennai', '1 Highfield Road, Chennai, Tamil Nadu 600028', 'R. Subramaniam', 'General', 'active'),
  (2, 1, 'Highland Towers Mumbai', '22 Marine Drive, Mumbai, Maharashtra 400002', 'V. Kulkarni', 'Rotational', 'active'),
  (3, 1, 'Riverside Tech Hub Bengaluru', '88 Koramangala, Bengaluru, Karnataka 560095', 'M. Narayan', 'General', 'active'),
  (4, 2, 'City Centre Mall Pune', '45 FC Road, Pune, Maharashtra 411004', 'A. Deshpande', 'Morning', 'active'),
  (5, 2, 'Grand Galleria Mall Hyderabad', '7 Banjara Hills, Hyderabad, Telangana 500034', 'P. Varma', 'Rotational', 'active'),
  (6, 2, 'Urban Square Mall Delhi', '101 Connaught Place, New Delhi, Delhi 110001', 'S. Khanna', 'Rotational', 'active'),
  (7, 3, 'Alpha Industrial Estate Chennai', '33 Ambattur Industrial Estate, Chennai, Tamil Nadu 600058', 'R. Venkatesan', 'Night', 'active'),
  (8, 3, 'Sigma Electronics Park Bengaluru', '12 Whitefield, Bengaluru, Karnataka 560066', 'T. Prabhakar', 'General', 'active'),
  (9, 4, 'Greenfield Main Hospital Mumbai', '5 Andheri West, Mumbai, Maharashtra 400053', 'Dr. K. Shah', 'Rotational', 'active'),
  (10, 4, 'Greenfield Annex Clinic Pune', '118 Kothrud, Pune, Maharashtra 411038', 'Dr. A. Joshi', 'General', 'active');

INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (1, 'PWS0001', 'Rahul', 'Sharma', 'Male', '1988-04-12', '98100 10001', 'rahul.sharma@pws.in', 'Chennai, Tamil Nadu 600028', 'Chennai', 'Tamil Nadu', '600028', 'HDFC Bank', '60010000000001', 'HDFC0000401', 'AABPC0001K', '101000000001', '2023-01-10', 'Security Supervisor', 'Security', 'permanent', 'General', 1, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (1, 1, '2023-01-10', 12500, 5000, 1000, 1500, 95, 1, 0, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (1, 'Aadhaar Card', 'Aadhaar Card', '789600000001'),
  (1, 'PAN Card', 'PAN Card', 'AABPC0001K'),
  (1, 'Bank Proof', 'Bank Account Passbook', '60010000000001'),
  (1, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (2, 'PWS0002', 'Amit', 'Verma', 'Male', '1992-07-23', '98100 10002', 'amit.verma@pws.in', 'Chennai, Tamil Nadu 600028', 'Chennai', 'Tamil Nadu', '600028', 'State Bank of India', '60010000000002', 'SBIN0009988', 'AABPC0002K', '101000000002', '2023-02-14', 'Security Guard', 'Security', 'permanent', 'General', 1, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (2, 2, '2023-02-14', 9000, 3600, 800, 600, 75, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (2, 'Aadhaar Card', 'Aadhaar Card', '789600000002'),
  (2, 'PAN Card', 'PAN Card', 'AABPC0002K'),
  (2, 'Bank Proof', 'Bank Account Passbook', '60010000000002'),
  (2, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (3, 'PWS0003', 'Sanjay', 'Gupta', 'Male', '1990-11-05', '98100 10003', 'sanjay.gupta@pws.in', 'Chennai, Tamil Nadu 600028', 'Chennai', 'Tamil Nadu', '600028', 'ICICI Bank', '60010000000003', 'ICIC0001020', 'AABPC0003K', '101000000003', '2023-03-01', 'Security Guard', 'Security', 'contract', 'Night', 1, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (3, 3, '2023-03-01', 8500, 3400, 800, 600, 75, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (3, 'Aadhaar Card', 'Aadhaar Card', '789600000003'),
  (3, 'PAN Card', 'PAN Card', 'AABPC0003K'),
  (3, 'Bank Proof', 'Bank Account Passbook', '60010000000003'),
  (3, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (4, 'PWS0004', 'Vikas', 'Yadav', 'Male', '1987-02-17', '98100 10004', 'vikas.yadav@pws.in', 'Chennai, Tamil Nadu 600028', 'Chennai', 'Tamil Nadu', '600028', 'Axis Bank', '60010000000004', 'UTIB0000123', 'AABPC0004K', '101000000004', '2023-01-20', 'Electrician', 'Technical', 'permanent', 'General', 1, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (4, 4, '2023-01-20', 11500, 4600, 800, 800, 90, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (4, 'Aadhaar Card', 'Aadhaar Card', '789600000004'),
  (4, 'PAN Card', 'PAN Card', 'AABPC0004K'),
  (4, 'Bank Proof', 'Bank Account Passbook', '60010000000004'),
  (4, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (5, 'PWS0005', 'Mohan', 'Das', 'Male', '1995-09-30', '98100 10005', 'mohan.das@pws.in', 'Chennai, Tamil Nadu 600028', 'Chennai', 'Tamil Nadu', '600028', 'Canara Bank', '60010000000005', 'CNRB0001999', 'AABPC0005K', '101000000005', '2024-04-05', 'Office Boy', 'Administration', 'permanent', 'General', 1, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (5, 5, '2024-04-05', 7500, 3000, 600, 400, 65, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (5, 'Aadhaar Card', 'Aadhaar Card', '789600000005'),
  (5, 'PAN Card', 'PAN Card', 'AABPC0005K'),
  (5, 'Bank Proof', 'Bank Account Passbook', '60010000000005'),
  (5, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (6, 'PWS0006', 'Suresh', 'Kumar', 'Male', '1985-05-08', '98100 10006', 'suresh.kumar@pws.in', 'Chennai, Tamil Nadu 600028', 'Chennai', 'Tamil Nadu', '600028', 'Bank of Baroda', '60010000000006', 'BARB0000112', 'AABPC0006K', '101000000006', '2022-08-01', 'Facility Supervisor', 'Facilities', 'permanent', 'General', 1, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (6, 6, '2022-08-01', 16000, 6400, 1000, 1600, 110, 1, 0, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (6, 'Aadhaar Card', 'Aadhaar Card', '789600000006'),
  (6, 'PAN Card', 'PAN Card', 'AABPC0006K'),
  (6, 'Bank Proof', 'Bank Account Passbook', '60010000000006'),
  (6, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (7, 'PWS0007', 'Ramesh', 'Kumar', 'Male', '1991-12-19', '98100 10007', 'ramesh.kumar@pws.in', 'Mumbai, Maharashtra 400002', 'Mumbai', 'Maharashtra', '400002', 'Punjab National Bank', '60010000000007', 'PUNB0484600', 'AABPC0007K', '101000000007', '2023-05-02', 'Security Guard', 'Security', 'permanent', 'Rotational', 2, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (7, 7, '2023-05-02', 8800, 3520, 800, 500, 75, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (7, 'Aadhaar Card', 'Aadhaar Card', '789600000007'),
  (7, 'PAN Card', 'PAN Card', 'AABPC0007K'),
  (7, 'Bank Proof', 'Bank Account Passbook', '60010000000007'),
  (7, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (8, 'PWS0008', 'Deepak', 'Singh', 'Male', '1993-03-25', '98100 10008', 'deepak.singh@pws.in', 'Mumbai, Maharashtra 400002', 'Mumbai', 'Maharashtra', '400002', 'HDFC Bank', '60010000000008', 'HDFC0000401', 'AABPC0008K', '101000000008', '2023-06-12', 'Security Guard', 'Security', 'contract', 'Night', 2, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (8, 8, '2023-06-12', 8600, 3440, 800, 600, 75, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (8, 'Aadhaar Card', 'Aadhaar Card', '789600000008'),
  (8, 'PAN Card', 'PAN Card', 'AABPC0008K'),
  (8, 'Bank Proof', 'Bank Account Passbook', '60010000000008'),
  (8, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (9, 'PWS0009', 'Manoj', 'Tiwari', 'Male', '1996-08-14', '98100 10009', 'manoj.tiwari@pws.in', 'Mumbai, Maharashtra 400002', 'Mumbai', 'Maharashtra', '400002', 'State Bank of India', '60010000000009', 'SBIN0009988', 'AABPC0009K', '101000000009', '2024-02-20', 'Cleaner', 'Housekeeping', 'permanent', 'Morning', 2, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (9, 9, '2024-02-20', 7200, 2880, 600, 400, 60, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (9, 'Aadhaar Card', 'Aadhaar Card', '789600000009'),
  (9, 'PAN Card', 'PAN Card', 'AABPC0009K'),
  (9, 'Bank Proof', 'Bank Account Passbook', '60010000000009'),
  (9, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (10, 'PWS0010', 'Raju', 'Patel', 'Male', '1986-10-02', '98100 10010', 'raju.patel@pws.in', 'Mumbai, Maharashtra 400002', 'Mumbai', 'Maharashtra', '400002', 'ICICI Bank', '60010000000010', 'ICIC0001020', 'AABPC0010K', '101000000010', '2023-07-17', 'Plumber', 'Technical', 'contract', 'General', 2, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (10, 10, '2023-07-17', 10500, 4200, 800, 800, 85, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (10, 'Aadhaar Card', 'Aadhaar Card', '789600000010'),
  (10, 'PAN Card', 'PAN Card', 'AABPC0010K'),
  (10, 'Bank Proof', 'Bank Account Passbook', '60010000000010'),
  (10, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (11, 'PWS0011', 'Anil', 'Chauhan', 'Male', '1994-01-28', '98100 10011', 'anil.chauhan@pws.in', 'Mumbai, Maharashtra 400002', 'Mumbai', 'Maharashtra', '400002', 'Axis Bank', '60010000000011', 'UTIB0000123', 'AABPC0011K', '101000000011', '2024-05-09', 'Housekeeping Staff', 'Housekeeping', 'permanent', 'Morning', 2, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (11, 11, '2024-05-09', 7800, 3120, 700, 500, 65, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (11, 'Aadhaar Card', 'Aadhaar Card', '789600000011'),
  (11, 'PAN Card', 'PAN Card', 'AABPC0011K'),
  (11, 'Bank Proof', 'Bank Account Passbook', '60010000000011'),
  (11, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (12, 'PWS0012', 'Nitin', 'Shetty', 'Male', '1989-06-21', '98100 10012', 'nitin.shetty@pws.in', 'Bengaluru, Karnataka 560095', 'Bengaluru', 'Karnataka', '560095', 'Canara Bank', '60010000000012', 'CNRB0001999', 'AABPC0012K', '101000000012', '2023-03-18', 'Security Supervisor', 'Security', 'permanent', 'General', 3, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (12, 12, '2023-03-18', 12500, 5000, 1000, 1500, 95, 1, 0, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (12, 'Aadhaar Card', 'Aadhaar Card', '789600000012'),
  (12, 'PAN Card', 'PAN Card', 'AABPC0012K'),
  (12, 'Bank Proof', 'Bank Account Passbook', '60010000000012'),
  (12, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (13, 'PWS0013', 'Karan', 'Malhotra', 'Male', '1992-09-11', '98100 10013', 'karan.malhotra@pws.in', 'Bengaluru, Karnataka 560095', 'Bengaluru', 'Karnataka', '560095', 'Bank of Baroda', '60010000000013', 'BARB0000112', 'AABPC0013K', '101000000013', '2023-04-02', 'Security Guard', 'Security', 'permanent', 'General', 3, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (13, 13, '2023-04-02', 9200, 3680, 800, 600, 75, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (13, 'Aadhaar Card', 'Aadhaar Card', '789600000013'),
  (13, 'PAN Card', 'PAN Card', 'AABPC0013K'),
  (13, 'Bank Proof', 'Bank Account Passbook', '60010000000013'),
  (13, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (14, 'PWS0014', 'Arjun', 'Reddy', 'Male', '1988-11-27', '98100 10014', 'arjun.reddy@pws.in', 'Bengaluru, Karnataka 560095', 'Bengaluru', 'Karnataka', '560095', 'Punjab National Bank', '60010000000014', 'PUNB0484600', 'AABPC0014K', '101000000014', '2023-01-15', 'Maintenance Technician', 'Technical', 'permanent', 'General', 3, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (14, 14, '2023-01-15', 12000, 4800, 800, 1000, 90, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (14, 'Aadhaar Card', 'Aadhaar Card', '789600000014'),
  (14, 'PAN Card', 'PAN Card', 'AABPC0014K'),
  (14, 'Bank Proof', 'Bank Account Passbook', '60010000000014'),
  (14, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (15, 'PWS0015', 'Pooja', 'Sharma', 'Female', '1996-05-16', '98100 10015', 'pooja.sharma@pws.in', 'Bengaluru, Karnataka 560095', 'Bengaluru', 'Karnataka', '560095', 'HDFC Bank', '60010000000015', 'HDFC0000401', 'AABPC0015K', '101000000015', '2024-08-01', 'Receptionist', 'Administration', 'permanent', 'General', 3, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (15, 15, '2024-08-01', 9500, 3800, 800, 600, 70, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (15, 'Aadhaar Card', 'Aadhaar Card', '789600000015'),
  (15, 'PAN Card', 'PAN Card', 'AABPC0015K'),
  (15, 'Bank Proof', 'Bank Account Passbook', '60010000000015'),
  (15, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (16, 'PWS0016', 'Sunil', 'Pawar', 'Male', '1987-03-06', '98100 10016', 'sunil.pawar@pws.in', 'Pune, Maharashtra 411004', 'Pune', 'Maharashtra', '411004', 'State Bank of India', '60010000000016', 'SBIN0009988', 'AABPC0016K', '101000000016', '2023-02-01', 'Housekeeping Supervisor', 'Housekeeping', 'permanent', 'Morning', 4, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (16, 16, '2023-02-01', 11000, 4400, 800, 800, 85, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (16, 'Aadhaar Card', 'Aadhaar Card', '789600000016'),
  (16, 'PAN Card', 'PAN Card', 'AABPC0016K'),
  (16, 'Bank Proof', 'Bank Account Passbook', '60010000000016'),
  (16, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (17, 'PWS0017', 'Vijay', 'More', 'Male', '1995-07-19', '98100 10017', 'vijay.more@pws.in', 'Pune, Maharashtra 411004', 'Pune', 'Maharashtra', '411004', 'ICICI Bank', '60010000000017', 'ICIC0001020', 'AABPC0017K', '101000000017', '2024-01-10', 'Housekeeping Staff', 'Housekeeping', 'contract', 'Morning', 4, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (17, 17, '2024-01-10', 7800, 3120, 700, 500, 65, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (17, 'Aadhaar Card', 'Aadhaar Card', '789600000017'),
  (17, 'PAN Card', 'PAN Card', 'AABPC0017K'),
  (17, 'Bank Proof', 'Bank Account Passbook', '60010000000017'),
  (17, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (18, 'PWS0018', 'Sandeep', 'Kulkarni', 'Male', '1990-12-03', '98100 10018', 'sandeep.kulkarni@pws.in', 'Pune, Maharashtra 411004', 'Pune', 'Maharashtra', '411004', 'Axis Bank', '60010000000018', 'UTIB0000123', 'AABPC0018K', '101000000018', '2023-05-20', 'Security Guard', 'Security', 'permanent', 'Morning', 4, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (18, 18, '2023-05-20', 8800, 3520, 800, 500, 75, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (18, 'Aadhaar Card', 'Aadhaar Card', '789600000018'),
  (18, 'PAN Card', 'PAN Card', 'AABPC0018K'),
  (18, 'Bank Proof', 'Bank Account Passbook', '60010000000018'),
  (18, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (19, 'PWS0019', 'Mahesh', 'Joshi', 'Male', '1984-04-25', '98100 10019', 'mahesh.joshi@pws.in', 'Pune, Maharashtra 411004', 'Pune', 'Maharashtra', '411004', 'Canara Bank', '60010000000019', 'CNRB0001999', 'AABPC0019K', '101000000019', '2024-03-15', 'Gardener', 'Housekeeping', 'contract', 'Morning', 4, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (19, 19, '2024-03-15', 7200, 2880, 600, 400, 60, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (19, 'Aadhaar Card', 'Aadhaar Card', '789600000019'),
  (19, 'PAN Card', 'PAN Card', 'AABPC0019K'),
  (19, 'Bank Proof', 'Bank Account Passbook', '60010000000019'),
  (19, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (20, 'PWS0020', 'Srinivas', 'Rao', 'Male', '1991-08-22', '98100 10020', 'srinivas.rao@pws.in', 'Hyderabad, Telangana 500034', 'Hyderabad', 'Telangana', '500034', 'Bank of Baroda', '60010000000020', 'BARB0000112', 'AABPC0020K', '101000000020', '2023-06-01', 'Security Guard', 'Security', 'permanent', 'Rotational', 5, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (20, 20, '2023-06-01', 9000, 3600, 800, 600, 75, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (20, 'Aadhaar Card', 'Aadhaar Card', '789600000020'),
  (20, 'PAN Card', 'PAN Card', 'AABPC0020K'),
  (20, 'Bank Proof', 'Bank Account Passbook', '60010000000020'),
  (20, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (21, 'PWS0021', 'Prasad', 'Naidu', 'Male', '1993-10-09', '98100 10021', 'prasad.naidu@pws.in', 'Hyderabad, Telangana 500034', 'Hyderabad', 'Telangana', '500034', 'Punjab National Bank', '60010000000021', 'PUNB0484600', 'AABPC0021K', '101000000021', '2024-04-18', 'Housekeeping Staff', 'Housekeeping', 'contract', 'Evening', 5, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (21, 21, '2024-04-18', 7600, 3040, 700, 500, 65, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (21, 'Aadhaar Card', 'Aadhaar Card', '789600000021'),
  (21, 'PAN Card', 'PAN Card', 'AABPC0021K'),
  (21, 'Bank Proof', 'Bank Account Passbook', '60010000000021'),
  (21, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (22, 'PWS0022', 'Ganesh', 'Patil', 'Male', '1989-01-13', '98100 10022', 'ganesh.patil@pws.in', 'Hyderabad, Telangana 500034', 'Hyderabad', 'Telangana', '500034', 'HDFC Bank', '60010000000022', 'HDFC0000401', 'AABPC0022K', '101000000022', '2023-09-01', 'Driver', 'Transport', 'permanent', 'Morning', 5, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (22, 22, '2023-09-01', 9800, 3920, 800, 700, 75, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (22, 'Aadhaar Card', 'Aadhaar Card', '789600000022'),
  (22, 'PAN Card', 'PAN Card', 'AABPC0022K'),
  (22, 'Bank Proof', 'Bank Account Passbook', '60010000000022'),
  (22, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (23, 'PWS0023', 'Harish', 'Kumar', 'Male', '1992-02-07', '98100 10023', 'harish.kumar@pws.in', 'New Delhi, Delhi 110001', 'New Delhi', 'Delhi', '110001', 'State Bank of India', '60010000000023', 'SBIN0009988', 'AABPC0023K', '101000000023', '2023-10-02', 'Security Guard', 'Security', 'permanent', 'Rotational', 6, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (23, 23, '2023-10-02', 8800, 3520, 800, 500, 75, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (23, 'Aadhaar Card', 'Aadhaar Card', '789600000023'),
  (23, 'PAN Card', 'PAN Card', 'AABPC0023K'),
  (23, 'Bank Proof', 'Bank Account Passbook', '60010000000023'),
  (23, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (24, 'PWS0024', 'Rohit', 'Arora', 'Male', '1988-09-18', '98100 10024', 'rohit.arora@pws.in', 'New Delhi, Delhi 110001', 'New Delhi', 'Delhi', '110001', 'ICICI Bank', '60010000000024', 'ICIC0001020', 'AABPC0024K', '101000000024', '2023-11-06', 'Electrician', 'Technical', 'permanent', 'General', 6, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (24, 24, '2023-11-06', 11500, 4600, 800, 800, 90, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (24, 'Aadhaar Card', 'Aadhaar Card', '789600000024'),
  (24, 'PAN Card', 'PAN Card', 'AABPC0024K'),
  (24, 'Bank Proof', 'Bank Account Passbook', '60010000000024'),
  (24, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (25, 'PWS0025', 'Amit', 'Bansal', 'Male', '1990-06-29', '98100 10025', 'amit.bansal@pws.in', 'New Delhi, Delhi 110001', 'New Delhi', 'Delhi', '110001', 'Axis Bank', '60010000000025', 'UTIB0000123', 'AABPC0025K', '101000000025', '2024-02-01', 'Floor Executive', 'Facilities', 'permanent', 'Rotational', 6, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (25, 25, '2024-02-01', 10800, 4320, 800, 700, 80, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (25, 'Aadhaar Card', 'Aadhaar Card', '789600000025'),
  (25, 'PAN Card', 'PAN Card', 'AABPC0025K'),
  (25, 'Bank Proof', 'Bank Account Passbook', '60010000000025'),
  (25, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (26, 'PWS0026', 'Vikram', 'Singh', 'Male', '1986-11-04', '98100 10026', 'vikram.singh@pws.in', 'Chennai, Tamil Nadu 600058', 'Chennai', 'Tamil Nadu', '600058', 'Canara Bank', '60010000000026', 'CNRB0001999', 'AABPC0026K', '101000000026', '2023-07-01', 'Security Guard', 'Security', 'contract', 'Night', 7, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (26, 26, '2023-07-01', 8800, 3520, 800, 600, 75, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (26, 'Aadhaar Card', 'Aadhaar Card', '789600000026'),
  (26, 'PAN Card', 'PAN Card', 'AABPC0026K'),
  (26, 'Bank Proof', 'Bank Account Passbook', '60010000000026'),
  (26, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (27, 'PWS0027', 'Rajesh', 'Kumar', 'Male', '1991-05-27', '98100 10027', 'rajesh.kumar@pws.in', 'Chennai, Tamil Nadu 600058', 'Chennai', 'Tamil Nadu', '600058', 'Bank of Baroda', '60010000000027', 'BARB0000112', 'AABPC0027K', '101000000027', '2023-08-10', 'Security Guard', 'Security', 'permanent', 'Night', 7, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (27, 27, '2023-08-10', 9200, 3680, 800, 600, 75, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (27, 'Aadhaar Card', 'Aadhaar Card', '789600000027'),
  (27, 'PAN Card', 'PAN Card', 'AABPC0027K'),
  (27, 'Bank Proof', 'Bank Account Passbook', '60010000000027'),
  (27, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (28, 'PWS0028', 'Murugan', 'K', 'Male', '1994-12-08', '98100 10028', 'murugan.k@pws.in', 'Chennai, Tamil Nadu 600058', 'Chennai', 'Tamil Nadu', '600058', 'Punjab National Bank', '60010000000028', 'PUNB0484600', 'AABPC0028K', '101000000028', '2024-06-03', 'Housekeeping Staff', 'Housekeeping', 'contract', 'Night', 7, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (28, 28, '2024-06-03', 7600, 3040, 700, 500, 65, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (28, 'Aadhaar Card', 'Aadhaar Card', '789600000028'),
  (28, 'PAN Card', 'PAN Card', 'AABPC0028K'),
  (28, 'Bank Proof', 'Bank Account Passbook', '60010000000028'),
  (28, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (29, 'PWS0029', 'Selvam', 'R', 'Male', '1986-03-15', '98100 10029', 'selvam.r@pws.in', 'Chennai, Tamil Nadu 600058', 'Chennai', 'Tamil Nadu', '600058', 'HDFC Bank', '60010000000029', 'HDFC0000401', 'AABPC0029K', '101000000029', '2023-04-22', 'Electrician Supervisor', 'Technical', 'permanent', 'Night', 7, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (29, 29, '2023-04-22', 13500, 5400, 1000, 1100, 100, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (29, 'Aadhaar Card', 'Aadhaar Card', '789600000029'),
  (29, 'PAN Card', 'PAN Card', 'AABPC0029K'),
  (29, 'Bank Proof', 'Bank Account Passbook', '60010000000029'),
  (29, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (30, 'PWS0030', 'Anand', 'Kumar', 'Male', '1985-09-11', '98100 10030', 'anand.kumar@pws.in', 'Bengaluru, Karnataka 560066', 'Bengaluru', 'Karnataka', '560066', 'State Bank of India', '60010000000030', 'SBIN0009988', 'AABPC0030K', '101000000030', '2022-12-01', 'Site Supervisor', 'Facilities', 'permanent', 'General', 8, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (30, 30, '2022-12-01', 18500, 7400, 1000, 2100, 115, 1, 0, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (30, 'Aadhaar Card', 'Aadhaar Card', '789600000030'),
  (30, 'PAN Card', 'PAN Card', 'AABPC0030K'),
  (30, 'Bank Proof', 'Bank Account Passbook', '60010000000030'),
  (30, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (31, 'PWS0031', 'Kiran', 'P', 'Male', '1993-06-27', '98100 10031', 'kiran.p@pws.in', 'Bengaluru, Karnataka 560066', 'Bengaluru', 'Karnataka', '560066', 'ICICI Bank', '60010000000031', 'ICIC0001020', 'AABPC0031K', '101000000031', '2023-10-14', 'Security Guard', 'Security', 'permanent', 'General', 8, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (31, 31, '2023-10-14', 8800, 3520, 800, 500, 75, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (31, 'Aadhaar Card', 'Aadhaar Card', '789600000031'),
  (31, 'PAN Card', 'PAN Card', 'AABPC0031K'),
  (31, 'Bank Proof', 'Bank Account Passbook', '60010000000031'),
  (31, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (32, 'PWS0032', 'Dinesh', 'Babu', 'Male', '1989-02-03', '98100 10032', 'dinesh.babu@pws.in', 'Bengaluru, Karnataka 560066', 'Bengaluru', 'Karnataka', '560066', 'Axis Bank', '60010000000032', 'UTIB0000123', 'AABPC0032K', '101000000032', '2023-05-18', 'HVAC Technician', 'Technical', 'permanent', 'General', 8, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (32, 32, '2023-05-18', 13500, 5400, 1000, 1000, 100, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (32, 'Aadhaar Card', 'Aadhaar Card', '789600000032'),
  (32, 'PAN Card', 'PAN Card', 'AABPC0032K'),
  (32, 'Bank Proof', 'Bank Account Passbook', '60010000000032'),
  (32, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (33, 'PWS0033', 'Rakesh', 'Yadav', 'Male', '1990-07-20', '98100 10033', 'rakesh.yadav@pws.in', 'Mumbai, Maharashtra 400053', 'Mumbai', 'Maharashtra', '400053', 'Canara Bank', '60010000000033', 'CNRB0001999', 'AABPC0033K', '101000000033', '2023-09-05', 'Medical Attendant', 'Medical Services', 'permanent', 'Rotational', 9, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (33, 33, '2023-09-05', 8500, 3400, 800, 600, 75, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (33, 'Aadhaar Card', 'Aadhaar Card', '789600000033'),
  (33, 'PAN Card', 'PAN Card', 'AABPC0033K'),
  (33, 'Bank Proof', 'Bank Account Passbook', '60010000000033'),
  (33, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (34, 'PWS0034', 'Neha', 'Gupta', 'Female', '1995-04-09', '98100 10034', 'neha.gupta@pws.in', 'Mumbai, Maharashtra 400053', 'Mumbai', 'Maharashtra', '400053', 'Bank of Baroda', '60010000000034', 'BARB0000112', 'AABPC0034K', '101000000034', '2024-07-12', 'Housekeeping Staff', 'Housekeeping', 'permanent', 'Rotational', 9, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (34, 34, '2024-07-12', 7800, 3120, 700, 500, 65, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (34, 'Aadhaar Card', 'Aadhaar Card', '789600000034'),
  (34, 'PAN Card', 'PAN Card', 'AABPC0034K'),
  (34, 'Bank Proof', 'Bank Account Passbook', '60010000000034'),
  (34, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (35, 'PWS0035', 'Suresh', 'Menon', 'Male', '1984-08-30', '98100 10035', 'suresh.menon@pws.in', 'Mumbai, Maharashtra 400053', 'Mumbai', 'Maharashtra', '400053', 'Punjab National Bank', '60010000000035', 'PUNB0484600', 'AABPC0035K', '101000000035', '2022-11-01', 'Facility Supervisor', 'Facilities', 'permanent', 'General', 9, 'active');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (35, 35, '2022-11-01', 16000, 6400, 1000, 1600, 110, 1, 0, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (35, 'Aadhaar Card', 'Aadhaar Card', '789600000035'),
  (35, 'PAN Card', 'PAN Card', 'AABPC0035K'),
  (35, 'Bank Proof', 'Bank Account Passbook', '60010000000035'),
  (35, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (36, 'PWS0036', 'Prakash', 'Iyer', 'Male', '1987-12-11', '98100 10036', 'prakash.iyer@pws.in', 'Pune, Maharashtra 411038', 'Pune', 'Maharashtra', '411038', 'HDFC Bank', '60010000000036', 'HDFC0000401', 'AABPC0036K', '101000000036', '2023-06-08', 'Security Guard', 'Security', 'permanent', 'Rotational', 10, 'inactive');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (36, 36, '2023-06-08', 8800, 3520, 800, 500, 75, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (36, 'Aadhaar Card', 'Aadhaar Card', '789600000036'),
  (36, 'PAN Card', 'PAN Card', 'AABPC0036K'),
  (36, 'Bank Proof', 'Bank Account Passbook', '60010000000036'),
  (36, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (37, 'PWS0037', 'Meena', 'Kumari', 'Female', '1992-01-17', '98100 10037', 'meena.kumari@pws.in', 'Pune, Maharashtra 411038', 'Pune', 'Maharashtra', '411038', 'State Bank of India', '60010000000037', 'SBIN0009988', 'AABPC0037K', '101000000037', '2024-03-22', 'Cleaner', 'Housekeeping', 'contract', 'Morning', 10, 'inactive');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (37, 37, '2024-03-22', 7200, 2880, 600, 400, 60, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (37, 'Aadhaar Card', 'Aadhaar Card', '789600000037'),
  (37, 'PAN Card', 'PAN Card', 'AABPC0037K'),
  (37, 'Bank Proof', 'Bank Account Passbook', '60010000000037'),
  (37, 'Joining Form', 'Appointment Letter', NULL);
INSERT INTO employees (id, employee_code, first_name, last_name, gender, dob, mobile, email, address, city, state, pincode, bank_name, bank_account, bank_ifsc, pan, uan, joining_date, designation, department, employee_type, shift_type, site_id, status)
VALUES (38, 'PWS0038', 'Babu', 'Lal', 'Male', '1985-10-05', '98100 10038', 'babu.lal@pws.in', 'Pune, Maharashtra 411038', 'Pune', 'Maharashtra', '411038', 'ICICI Bank', '60010000000038', 'ICIC0001020', 'AABPC0038K', '101000000038', '2023-02-25', 'Driver', 'Transport', 'permanent', 'Morning', 10, 'inactive');
INSERT INTO salary_structures (id, employee_id, effective_from, basic, hra, conveyance, other_allowance, overtime_rate, pf_applicable, esic_applicable, other_deduction)
VALUES (38, 38, '2023-02-25', 9800, 3920, 800, 700, 75, 1, 1, 0);
INSERT INTO employee_documents (employee_id, document_type, document_name, document_number) VALUES
  (38, 'Aadhaar Card', 'Aadhaar Card', '789600000038'),
  (38, 'PAN Card', 'PAN Card', 'AABPC0038K'),
  (38, 'Bank Proof', 'Bank Account Passbook', '60010000000038'),
  (38, 'Joining Form', 'Appointment Letter', NULL);

INSERT INTO attendance_monthly (employee_id, month, year, present_days, absent_days, paid_leave, unpaid_leave, ot_hours, remarks, status) VALUES
  (1, 8, 2026, 24, 5, 1, 0, 12, 'OT for access control upgrade', 'draft'),
  (1, 7, 2026, 24, 5, 1, 0, 15, 'OT for access control upgrade', 'finalized'),
  (2, 8, 2026, 25, 4, 0, 1, 8, '', 'draft'),
  (2, 7, 2026, 26, 3, 0, 1, 9, '', 'finalized'),
  (3, 8, 2026, 26, 3, 0, 0, 24, 'Night shift OT', 'draft'),
  (3, 7, 2026, 25, 4, 0, 0, 23, 'Night shift OT', 'finalized'),
  (4, 8, 2026, 23, 6, 0, 1, 15, 'Emergency electrical work', 'draft'),
  (4, 7, 2026, 23, 6, 0, 1, 12, 'Emergency electrical work', 'finalized'),
  (5, 8, 2026, 25, 4, 1, 0, 0, '', 'draft'),
  (5, 7, 2026, 26, 3, 1, 0, 4, '', 'finalized'),
  (6, 8, 2026, 24, 5, 0, 0, 6, '', 'draft'),
  (6, 7, 2026, 23, 6, 0, 0, 8, '', 'finalized'),
  (7, 8, 2026, 26, 3, 0, 0, 10, '', 'draft'),
  (7, 7, 2026, 26, 3, 0, 0, 10, '', 'finalized'),
  (8, 8, 2026, 25, 4, 0, 1, 28, 'Night shift OT', 'draft'),
  (8, 7, 2026, 26, 3, 0, 1, 26, 'Night shift OT', 'finalized'),
  (9, 8, 2026, 24, 5, 1, 0, 0, '', 'draft'),
  (9, 7, 2026, 23, 6, 1, 0, 0, '', 'finalized'),
  (10, 8, 2026, 22, 7, 0, 1, 9, 'Plumbing maintenance OT', 'draft'),
  (10, 7, 2026, 22, 7, 0, 1, 12, 'Plumbing maintenance OT', 'finalized'),
  (11, 8, 2026, 25, 4, 0, 0, 4, '', 'draft'),
  (11, 7, 2026, 26, 3, 0, 0, 5, '', 'finalized'),
  (12, 8, 2026, 25, 4, 0, 0, 10, '', 'draft'),
  (12, 7, 2026, 24, 5, 0, 0, 9, '', 'finalized'),
  (13, 8, 2026, 26, 3, 0, 0, 6, '', 'draft'),
  (13, 7, 2026, 26, 3, 0, 0, 3, '', 'finalized'),
  (14, 8, 2026, 24, 5, 1, 0, 18, 'Preventive maintenance OT', 'draft'),
  (14, 7, 2026, 25, 4, 1, 0, 22, 'Preventive maintenance OT', 'finalized'),
  (15, 8, 2026, 25, 4, 1, 0, 0, '', 'draft'),
  (15, 7, 2026, 24, 5, 1, 0, 2, '', 'finalized'),
  (16, 8, 2026, 24, 5, 1, 0, 8, '', 'draft'),
  (16, 7, 2026, 24, 5, 1, 0, 8, '', 'finalized'),
  (17, 8, 2026, 26, 3, 0, 0, 5, '', 'draft'),
  (17, 7, 2026, 27, 2, 0, 0, 3, '', 'finalized'),
  (18, 8, 2026, 25, 4, 0, 0, 7, '', 'draft'),
  (18, 7, 2026, 24, 5, 0, 0, 3, '', 'finalized'),
  (19, 8, 2026, 23, 6, 0, 1, 0, '', 'draft'),
  (19, 7, 2026, 23, 6, 0, 1, 3, '', 'finalized'),
  (20, 8, 2026, 26, 4, 0, 0, 12, '', 'draft'),
  (20, 7, 2026, 27, 3, 0, 0, 13, '', 'finalized'),
  (21, 8, 2026, 25, 5, 0, 0, 6, '', 'draft'),
  (21, 7, 2026, 24, 6, 0, 0, 5, '', 'finalized'),
  (22, 8, 2026, 24, 5, 1, 0, 10, 'Transport OT for mall supplies', 'draft'),
  (22, 7, 2026, 24, 5, 1, 0, 7, 'Transport OT for mall supplies', 'finalized'),
  (23, 8, 2026, 27, 2, 0, 0, 14, '', 'draft'),
  (23, 7, 2026, 28, 1, 0, 0, 18, '', 'finalized'),
  (24, 8, 2026, 23, 6, 0, 1, 20, 'Store lighting project OT', 'draft'),
  (24, 7, 2026, 22, 7, 0, 1, 22, 'Store lighting project OT', 'finalized'),
  (25, 8, 2026, 24, 5, 1, 0, 8, '', 'draft'),
  (25, 7, 2026, 24, 5, 1, 0, 8, '', 'finalized'),
  (26, 8, 2026, 25, 4, 0, 0, 30, 'Night shift OT', 'draft'),
  (26, 7, 2026, 26, 3, 0, 0, 28, 'Night shift OT', 'finalized'),
  (27, 8, 2026, 26, 3, 0, 0, 18, '', 'draft'),
  (27, 7, 2026, 25, 4, 0, 0, 14, '', 'finalized'),
  (28, 8, 2026, 25, 4, 0, 1, 26, 'Night shift OT', 'draft'),
  (28, 7, 2026, 25, 4, 0, 1, 29, 'Night shift OT', 'finalized'),
  (29, 8, 2026, 24, 5, 1, 0, 22, 'Line maintenance OT', 'draft'),
  (29, 7, 2026, 25, 4, 1, 0, 23, 'Line maintenance OT', 'finalized'),
  (30, 8, 2026, 25, 4, 0, 0, 8, '', 'draft'),
  (30, 7, 2026, 24, 5, 0, 0, 7, '', 'finalized'),
  (31, 8, 2026, 26, 3, 0, 0, 5, '', 'draft'),
  (31, 7, 2026, 26, 3, 0, 0, 2, '', 'finalized'),
  (32, 8, 2026, 23, 6, 1, 0, 16, 'AC overhaul OT', 'draft'),
  (32, 7, 2026, 24, 5, 1, 0, 20, 'AC overhaul OT', 'finalized'),
  (33, 8, 2026, 26, 3, 1, 0, 12, 'Ward support OT', 'draft'),
  (33, 7, 2026, 25, 4, 1, 0, 14, 'Ward support OT', 'finalized'),
  (34, 8, 2026, 25, 4, 0, 1, 8, '', 'draft'),
  (34, 7, 2026, 25, 4, 0, 1, 8, '', 'finalized'),
  (35, 8, 2026, 24, 5, 0, 0, 6, '', 'draft'),
  (35, 7, 2026, 25, 4, 0, 0, 4, '', 'finalized');

UPDATE attendance_monthly SET status = 'finalized' WHERE month = 7 AND year = 2026;

INSERT INTO advances (employee_id, amount, month, year, remarks) VALUES
  (2, 2000, 8, 2026, 'Salary advance'),
  (9, 1500, 8, 2026, 'Medical advance'),
  (26, 2500, 8, 2026, 'Salary advance'),
  (13, 2000, 7, 2026, 'Salary advance'),
  (22, 1500, 7, 2026, 'Travel advance');

INSERT INTO payroll (id, month, year, status, total_employees, gross_total, deduction_total, net_total, created_at, finalized_at, paid_at)
VALUES (1, 7, 2026, 'paid', 35, 487282.1, 45779.14, 441502.96, '2026-07-03 10:00:00', '2026-08-03 11:00:00', '2026-08-05 15:30:00');
INSERT INTO payroll_items (id, payroll_id, employee_id, attendance_id, present_days, absent_days, paid_leave, unpaid_leave, ot_hours, basic, hra, conveyance, other_allowance, overtime_earnings, attendance_deduction, gross, pf, esic, professional_tax, advance_deduction, other_deduction, total_deductions, net_salary, status) VALUES
  (1001, 1, 1, NULL, 24, 5, 1, 0, 15, 12500, 5000, 1000, 1500, 1425, 3846.15, 17578.85, 0, 0, 200, 0, 0, 200, 17378.85, 'finalized'),
  (1002, 1, 2, NULL, 26, 3, 0, 1, 9, 9000, 3600, 800, 600, 675, 2153.84, 12521.16, 1512, 93.91, 200, 0, 0, 1805.91, 10715.25, 'finalized'),
  (1003, 1, 3, NULL, 25, 4, 0, 0, 23, 8500, 3400, 800, 600, 1725, 2046.16, 12978.84, 1428, 97.34, 200, 0, 0, 1725.34, 11253.5, 'finalized'),
  (1004, 1, 4, NULL, 23, 6, 0, 1, 12, 11500, 4600, 800, 800, 1080, 4765.39, 14014.61, 0, 105.11, 200, 0, 0, 305.11, 13709.5, 'finalized'),
  (1005, 1, 5, NULL, 26, 3, 1, 0, 4, 7500, 3000, 600, 400, 260, 1326.93, 10433.07, 1260, 78.25, 200, 0, 0, 1538.25, 8894.82, 'finalized'),
  (1006, 1, 6, NULL, 23, 6, 0, 0, 8, 16000, 6400, 1000, 1600, 880, 5769.24, 20110.76, 0, 0, 200, 0, 0, 200, 19910.76, 'finalized'),
  (1007, 1, 7, NULL, 26, 3, 0, 0, 10, 8800, 3520, 800, 500, 750, 1571.55, 12798.45, 1478.4, 95.99, 200, 0, 0, 1774.39, 11024.06, 'finalized'),
  (1008, 1, 8, NULL, 26, 3, 0, 1, 26, 8600, 3440, 800, 600, 1950, 2067.68, 13322.32, 1444.8, 99.92, 200, 0, 0, 1744.72, 11577.6, 'finalized'),
  (1009, 1, 9, NULL, 23, 6, 1, 0, 0, 7200, 2880, 600, 400, 0, 2556.9, 8523.1, 1209.6, 63.92, 0, 0, 0, 1273.52, 7249.58, 'finalized'),
  (1010, 1, 10, NULL, 22, 7, 0, 1, 12, 10500, 4200, 800, 800, 1020, 5015.36, 12304.64, 1764, 92.28, 200, 0, 0, 2056.28, 10248.36, 'finalized'),
  (1011, 1, 11, NULL, 26, 3, 0, 0, 5, 7800, 3120, 700, 500, 325, 1398.45, 11046.55, 1310.4, 82.85, 200, 0, 0, 1593.25, 9453.3, 'finalized'),
  (1012, 1, 12, NULL, 24, 5, 0, 0, 9, 12500, 5000, 1000, 1500, 855, 3846.15, 17008.85, 0, 0, 200, 0, 0, 200, 16808.85, 'finalized'),
  (1013, 1, 13, NULL, 26, 3, 0, 0, 3, 9200, 3680, 800, 600, 225, 1647.69, 12857.31, 1545.6, 96.43, 200, 2000, 0, 3842.03, 9015.28, 'finalized'),
  (1014, 1, 14, NULL, 25, 4, 1, 0, 22, 12000, 4800, 800, 1000, 1980, 2861.52, 17718.48, 0, 132.89, 200, 0, 0, 332.89, 17385.59, 'finalized'),
  (1015, 1, 15, NULL, 24, 5, 1, 0, 2, 9500, 3800, 800, 600, 140, 2826.9, 12013.1, 1596, 90.1, 200, 0, 0, 1886.1, 10127, 'finalized'),
  (1016, 1, 16, NULL, 24, 5, 1, 0, 8, 11000, 4400, 800, 800, 680, 3269.25, 14410.75, 0, 108.08, 200, 0, 0, 308.08, 14102.67, 'finalized'),
  (1017, 1, 17, NULL, 27, 2, 0, 0, 3, 7800, 3120, 700, 500, 195, 932.3, 11382.7, 1310.4, 85.37, 200, 0, 0, 1595.77, 9786.93, 'finalized'),
  (1018, 1, 18, NULL, 24, 5, 0, 0, 3, 8800, 3520, 800, 500, 225, 2619.25, 11225.75, 1478.4, 84.19, 200, 0, 0, 1762.59, 9463.16, 'finalized'),
  (1019, 1, 19, NULL, 23, 6, 0, 1, 3, 7200, 2880, 600, 400, 180, 2983.05, 8276.95, 1209.6, 62.08, 0, 0, 0, 1271.68, 7005.27, 'finalized'),
  (1020, 1, 20, NULL, 27, 3, 0, 0, 13, 9000, 3600, 800, 600, 975, 1615.38, 13359.62, 1512, 100.2, 200, 0, 0, 1812.2, 11547.42, 'finalized'),
  (1021, 1, 21, NULL, 24, 6, 0, 0, 5, 7600, 3040, 700, 500, 325, 2732.28, 9432.72, 1276.8, 70.75, 0, 0, 0, 1347.55, 8085.17, 'finalized'),
  (1022, 1, 22, NULL, 24, 5, 1, 0, 7, 9800, 3920, 800, 700, 525, 2926.9, 12818.1, 1646.4, 96.14, 200, 1500, 0, 3442.54, 9375.56, 'finalized'),
  (1023, 1, 23, NULL, 28, 1, 0, 0, 18, 8800, 3520, 800, 500, 1350, 523.85, 14446.15, 1478.4, 108.35, 200, 0, 0, 1786.75, 12659.4, 'finalized'),
  (1024, 1, 24, NULL, 22, 7, 0, 1, 22, 11500, 4600, 800, 800, 1980, 5446.16, 14233.84, 0, 106.75, 200, 0, 0, 306.75, 13927.09, 'finalized'),
  (1025, 1, 25, NULL, 24, 5, 1, 0, 8, 10800, 4320, 800, 700, 640, 3196.15, 14063.85, 0, 105.48, 200, 0, 0, 305.48, 13758.37, 'finalized'),
  (1026, 1, 26, NULL, 26, 3, 0, 0, 28, 8800, 3520, 800, 600, 2100, 1583.07, 14236.93, 1478.4, 106.78, 200, 0, 0, 1785.18, 12451.75, 'finalized'),
  (1027, 1, 27, NULL, 25, 4, 0, 0, 14, 9200, 3680, 800, 600, 1050, 2196.92, 13133.08, 1545.6, 98.5, 200, 0, 0, 1844.1, 11288.98, 'finalized'),
  (1028, 1, 28, NULL, 25, 4, 0, 1, 29, 7600, 3040, 700, 500, 1885, 2276.9, 11448.1, 1276.8, 85.86, 200, 0, 0, 1562.66, 9885.44, 'finalized'),
  (1029, 1, 29, NULL, 25, 4, 1, 0, 23, 13500, 5400, 1000, 1100, 2300, 3230.76, 20069.24, 0, 150.52, 200, 0, 0, 350.52, 19718.72, 'finalized'),
  (1030, 1, 30, NULL, 24, 5, 0, 0, 7, 18500, 7400, 1000, 2100, 805, 5576.9, 24228.1, 0, 0, 200, 0, 0, 200, 24028.1, 'finalized'),
  (1031, 1, 31, NULL, 26, 3, 0, 0, 2, 8800, 3520, 800, 500, 150, 1571.55, 12198.45, 1478.4, 91.49, 200, 0, 0, 1769.89, 10428.56, 'finalized'),
  (1032, 1, 32, NULL, 24, 5, 1, 0, 20, 13500, 5400, 1000, 1000, 2000, 4019.25, 18880.75, 0, 141.61, 200, 0, 0, 341.61, 18539.14, 'finalized'),
  (1033, 1, 33, NULL, 25, 4, 1, 0, 14, 8500, 3400, 800, 600, 1050, 2046.16, 12303.84, 1428, 92.28, 200, 0, 0, 1720.28, 10583.56, 'finalized'),
  (1034, 1, 34, NULL, 25, 4, 0, 1, 8, 7800, 3120, 700, 500, 520, 2330.75, 10309.25, 1310.4, 77.32, 200, 0, 0, 1587.72, 8721.53, 'finalized'),
  (1035, 1, 35, NULL, 25, 4, 0, 0, 4, 16000, 6400, 1000, 1600, 440, 3846.16, 21593.84, 0, 0, 200, 0, 0, 200, 21393.84, 'finalized');
INSERT INTO salary_slips (payroll_item_id, employee_id, slip_number, month, year, generated_at) VALUES
  (1001, 1, 'SL-2026-07-0001', 7, 2026, '2026-08-03 12:00:00'),
  (1002, 2, 'SL-2026-07-0002', 7, 2026, '2026-08-03 12:00:00'),
  (1003, 3, 'SL-2026-07-0003', 7, 2026, '2026-08-03 12:00:00'),
  (1004, 4, 'SL-2026-07-0004', 7, 2026, '2026-08-03 12:00:00'),
  (1005, 5, 'SL-2026-07-0005', 7, 2026, '2026-08-03 12:00:00'),
  (1006, 6, 'SL-2026-07-0006', 7, 2026, '2026-08-03 12:00:00'),
  (1007, 7, 'SL-2026-07-0007', 7, 2026, '2026-08-03 12:00:00'),
  (1008, 8, 'SL-2026-07-0008', 7, 2026, '2026-08-03 12:00:00'),
  (1009, 9, 'SL-2026-07-0009', 7, 2026, '2026-08-03 12:00:00'),
  (1010, 10, 'SL-2026-07-0010', 7, 2026, '2026-08-03 12:00:00'),
  (1011, 11, 'SL-2026-07-0011', 7, 2026, '2026-08-03 12:00:00'),
  (1012, 12, 'SL-2026-07-0012', 7, 2026, '2026-08-03 12:00:00'),
  (1013, 13, 'SL-2026-07-0013', 7, 2026, '2026-08-03 12:00:00'),
  (1014, 14, 'SL-2026-07-0014', 7, 2026, '2026-08-03 12:00:00'),
  (1015, 15, 'SL-2026-07-0015', 7, 2026, '2026-08-03 12:00:00'),
  (1016, 16, 'SL-2026-07-0016', 7, 2026, '2026-08-03 12:00:00'),
  (1017, 17, 'SL-2026-07-0017', 7, 2026, '2026-08-03 12:00:00'),
  (1018, 18, 'SL-2026-07-0018', 7, 2026, '2026-08-03 12:00:00'),
  (1019, 19, 'SL-2026-07-0019', 7, 2026, '2026-08-03 12:00:00'),
  (1020, 20, 'SL-2026-07-0020', 7, 2026, '2026-08-03 12:00:00'),
  (1021, 21, 'SL-2026-07-0021', 7, 2026, '2026-08-03 12:00:00'),
  (1022, 22, 'SL-2026-07-0022', 7, 2026, '2026-08-03 12:00:00'),
  (1023, 23, 'SL-2026-07-0023', 7, 2026, '2026-08-03 12:00:00'),
  (1024, 24, 'SL-2026-07-0024', 7, 2026, '2026-08-03 12:00:00'),
  (1025, 25, 'SL-2026-07-0025', 7, 2026, '2026-08-03 12:00:00'),
  (1026, 26, 'SL-2026-07-0026', 7, 2026, '2026-08-03 12:00:00'),
  (1027, 27, 'SL-2026-07-0027', 7, 2026, '2026-08-03 12:00:00'),
  (1028, 28, 'SL-2026-07-0028', 7, 2026, '2026-08-03 12:00:00'),
  (1029, 29, 'SL-2026-07-0029', 7, 2026, '2026-08-03 12:00:00'),
  (1030, 30, 'SL-2026-07-0030', 7, 2026, '2026-08-03 12:00:00'),
  (1031, 31, 'SL-2026-07-0031', 7, 2026, '2026-08-03 12:00:00'),
  (1032, 32, 'SL-2026-07-0032', 7, 2026, '2026-08-03 12:00:00'),
  (1033, 33, 'SL-2026-07-0033', 7, 2026, '2026-08-03 12:00:00'),
  (1034, 34, 'SL-2026-07-0034', 7, 2026, '2026-08-03 12:00:00'),
  (1035, 35, 'SL-2026-07-0035', 7, 2026, '2026-08-03 12:00:00');

INSERT INTO payroll (id, month, year, status, total_employees, gross_total, deduction_total, net_total, created_at, finalized_at, paid_at)
VALUES (2, 8, 2026, 'draft', 35, 486348.64, 48058.56, 438290.08, '2026-08-03 10:00:00', NULL, NULL);
INSERT INTO payroll_items (id, payroll_id, employee_id, attendance_id, present_days, absent_days, paid_leave, unpaid_leave, ot_hours, basic, hra, conveyance, other_allowance, overtime_earnings, attendance_deduction, gross, pf, esic, professional_tax, advance_deduction, other_deduction, total_deductions, net_salary, status) VALUES
  (2001, 2, 1, NULL, 24, 5, 1, 0, 12, 12500, 5000, 1000, 1500, 1140, 3846.15, 17293.85, 0, 0, 200, 0, 0, 200, 17093.85, 'draft'),
  (2002, 2, 2, NULL, 25, 4, 0, 1, 8, 9000, 3600, 800, 600, 600, 2692.3, 11907.7, 1512, 89.31, 200, 2000, 0, 3801.31, 8106.39, 'draft'),
  (2003, 2, 3, NULL, 26, 3, 0, 0, 24, 8500, 3400, 800, 600, 1800, 1534.62, 13565.38, 1428, 101.74, 200, 0, 0, 1729.74, 11835.64, 'draft'),
  (2004, 2, 4, NULL, 23, 6, 0, 1, 15, 11500, 4600, 800, 800, 1350, 4765.39, 14284.61, 0, 107.13, 200, 0, 0, 307.13, 13977.48, 'draft'),
  (2005, 2, 5, NULL, 25, 4, 1, 0, 0, 7500, 3000, 600, 400, 0, 1769.24, 9730.76, 1260, 72.98, 0, 0, 0, 1332.98, 8397.78, 'draft'),
  (2006, 2, 6, NULL, 24, 5, 0, 0, 6, 16000, 6400, 1000, 1600, 660, 4807.7, 20852.3, 0, 0, 200, 0, 0, 200, 20652.3, 'draft'),
  (2007, 2, 7, NULL, 26, 3, 0, 0, 10, 8800, 3520, 800, 500, 750, 1571.55, 12798.45, 1478.4, 95.99, 200, 0, 0, 1774.39, 11024.06, 'draft'),
  (2008, 2, 8, NULL, 25, 4, 0, 1, 28, 8600, 3440, 800, 600, 2100, 2584.6, 12955.4, 1444.8, 97.17, 200, 0, 0, 1741.97, 11213.43, 'draft'),
  (2009, 2, 9, NULL, 24, 5, 1, 0, 0, 7200, 2880, 600, 400, 0, 2130.75, 8949.25, 1209.6, 67.12, 0, 1500, 0, 2776.72, 6172.53, 'draft'),
  (2010, 2, 10, NULL, 22, 7, 0, 1, 9, 10500, 4200, 800, 800, 765, 5015.36, 12049.64, 1764, 90.37, 200, 0, 0, 2054.37, 9995.27, 'draft'),
  (2011, 2, 11, NULL, 25, 4, 0, 0, 4, 7800, 3120, 700, 500, 260, 1864.6, 10515.4, 1310.4, 78.87, 200, 0, 0, 1589.27, 8926.13, 'draft'),
  (2012, 2, 12, NULL, 25, 4, 0, 0, 10, 12500, 5000, 1000, 1500, 950, 3076.92, 17873.08, 0, 0, 200, 0, 0, 200, 17673.08, 'draft'),
  (2013, 2, 13, NULL, 26, 3, 0, 0, 6, 9200, 3680, 800, 600, 450, 1647.69, 13082.31, 1545.6, 98.12, 200, 0, 0, 1843.72, 11238.59, 'draft'),
  (2014, 2, 14, NULL, 24, 5, 1, 0, 18, 12000, 4800, 800, 1000, 1620, 3576.9, 16643.1, 0, 124.82, 200, 0, 0, 324.82, 16318.28, 'draft'),
  (2015, 2, 15, NULL, 25, 4, 1, 0, 0, 9500, 3800, 800, 600, 0, 2261.52, 12438.48, 1596, 93.29, 200, 0, 0, 1889.29, 10549.19, 'draft'),
  (2016, 2, 16, NULL, 24, 5, 1, 0, 8, 11000, 4400, 800, 800, 680, 3269.25, 14410.75, 0, 108.08, 200, 0, 0, 308.08, 14102.67, 'draft'),
  (2017, 2, 17, NULL, 26, 3, 0, 0, 5, 7800, 3120, 700, 500, 325, 1398.45, 11046.55, 1310.4, 82.85, 200, 0, 0, 1593.25, 9453.3, 'draft'),
  (2018, 2, 18, NULL, 25, 4, 0, 0, 7, 8800, 3520, 800, 500, 525, 2095.4, 12049.6, 1478.4, 90.37, 200, 0, 0, 1768.77, 10280.83, 'draft'),
  (2019, 2, 19, NULL, 23, 6, 0, 1, 0, 7200, 2880, 600, 400, 0, 2983.05, 8096.95, 1209.6, 60.73, 0, 0, 0, 1270.33, 6826.62, 'draft'),
  (2020, 2, 20, NULL, 26, 4, 0, 0, 12, 9000, 3600, 800, 600, 900, 2153.84, 12746.16, 1512, 95.6, 200, 0, 0, 1807.6, 10938.56, 'draft'),
  (2021, 2, 21, NULL, 25, 5, 0, 0, 6, 7600, 3040, 700, 500, 390, 2276.9, 9953.1, 1276.8, 74.65, 0, 0, 0, 1351.45, 8601.65, 'draft'),
  (2022, 2, 22, NULL, 24, 5, 1, 0, 10, 9800, 3920, 800, 700, 750, 2926.9, 13043.1, 1646.4, 97.82, 200, 0, 0, 1944.22, 11098.88, 'draft'),
  (2023, 2, 23, NULL, 27, 2, 0, 0, 14, 8800, 3520, 800, 500, 1050, 1047.7, 13622.3, 1478.4, 102.17, 200, 0, 0, 1780.57, 11841.73, 'draft'),
  (2024, 2, 24, NULL, 23, 6, 0, 1, 20, 11500, 4600, 800, 800, 1800, 4765.39, 14734.61, 0, 110.51, 200, 0, 0, 310.51, 14424.1, 'draft'),
  (2025, 2, 25, NULL, 24, 5, 1, 0, 8, 10800, 4320, 800, 700, 640, 3196.15, 14063.85, 0, 105.48, 200, 0, 0, 305.48, 13758.37, 'draft'),
  (2026, 2, 26, NULL, 25, 4, 0, 0, 30, 8800, 3520, 800, 600, 2250, 2110.76, 13859.24, 1478.4, 103.94, 200, 2500, 0, 4282.34, 9576.9, 'draft'),
  (2027, 2, 27, NULL, 26, 3, 0, 0, 18, 9200, 3680, 800, 600, 1350, 1647.69, 13982.31, 1545.6, 104.87, 200, 0, 0, 1850.47, 12131.84, 'draft'),
  (2028, 2, 28, NULL, 25, 4, 0, 1, 26, 7600, 3040, 700, 500, 1690, 2276.9, 11253.1, 1276.8, 84.4, 200, 0, 0, 1561.2, 9691.9, 'draft'),
  (2029, 2, 29, NULL, 24, 5, 1, 0, 22, 13500, 5400, 1000, 1100, 2200, 4038.45, 19161.55, 0, 143.71, 200, 0, 0, 343.71, 18817.84, 'draft'),
  (2030, 2, 30, NULL, 25, 4, 0, 0, 8, 18500, 7400, 1000, 2100, 920, 4461.52, 25458.48, 0, 0, 200, 0, 0, 200, 25258.48, 'draft'),
  (2031, 2, 31, NULL, 26, 3, 0, 0, 5, 8800, 3520, 800, 500, 375, 1571.55, 12423.45, 1478.4, 93.18, 200, 0, 0, 1771.58, 10651.87, 'draft'),
  (2032, 2, 32, NULL, 23, 6, 1, 0, 16, 13500, 5400, 1000, 1000, 1600, 4823.1, 17676.9, 0, 132.58, 200, 0, 0, 332.58, 17344.32, 'draft'),
  (2033, 2, 33, NULL, 26, 3, 1, 0, 12, 8500, 3400, 800, 600, 900, 1534.62, 12665.38, 1428, 94.99, 200, 0, 0, 1722.99, 10942.39, 'draft'),
  (2034, 2, 34, NULL, 25, 4, 0, 1, 8, 7800, 3120, 700, 500, 520, 2330.75, 10309.25, 1310.4, 77.32, 200, 0, 0, 1587.72, 8721.53, 'draft'),
  (2035, 2, 35, NULL, 24, 5, 0, 0, 6, 16000, 6400, 1000, 1600, 660, 4807.7, 20852.3, 0, 0, 200, 0, 0, 200, 20652.3, 'draft');
