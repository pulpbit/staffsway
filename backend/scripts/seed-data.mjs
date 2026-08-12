// Demo seed data for Staffsway HRMS
export const ADMIN_PASSWORD = 'Demo@123'
export const SALT = 'pwsdemo-salt'

export const SETTINGS = {
  company_name: 'Staffsway',
  company_tagline: 'Manpower Staffing & HRMS',
  address: '501 Corporate Tower, Andheri East',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400069',
  phone: '+91 22 4890 2200',
  email: 'info@staffsway.in',
  website: 'https://staffsway.in',
  gstin: '27AABCP8892Q1Z5',
  pan: 'AABCP8892Q',
  cin: 'U74900MH2014PTC284110',
  currency: 'INR',
  financial_year_start: 4,
  salary_basis_days: 26,
  pf_rate: 12,
  pf_cap: 1800,
  pf_eligibility: 15000,
  esic_rate: 0.75,
  esic_eligibility: 21000,
  professional_tax_amount: 200,
  professional_tax_min_gross: 10000,
  default_ot_rate: 80,
}

export const CLIENTS = [
  { id: 1, name: 'ABC Facility Services', contact: 'Anil Kapoor', phone: '98220 11001', email: 'accounts@abcfacilities.in', address: '210 Trade Centre, Andheri East, Mumbai, Maharashtra 400069', start: '2025-01-01', end: '2027-12-31', status: 'active' },
  { id: 2, name: 'Metro Mall Management', contact: 'Priya Nair', phone: '98330 22002', email: 'ops@metromalls.in', address: '4-1-20 Metro House, Banjara Hills, Hyderabad, Telangana 500034', start: '2025-04-01', end: '2026-12-31', status: 'active' },
  { id: 3, name: 'SecureTech Industries', contact: 'Rajesh Menon', phone: '98440 33003', email: 'hr@securetech.in', address: 'Plot 12, Industrial Estate, Ambattur, Chennai, Tamil Nadu 600058', start: '2025-02-15', end: '2027-02-14', status: 'active' },
  { id: 4, name: 'Greenfield Hospital', contact: 'Dr. Sunita Rao', phone: '98550 44004', email: 'admin@greenfieldhosp.in', address: '5 Andheri West, Mumbai, Maharashtra 400053', start: '2024-11-01', end: '2026-10-31', status: 'active' },
]

export const SITES = [
  { id: 1, clientId: 1, name: 'Corporate Park Chennai', location: '1 Highfield Road, Chennai, Tamil Nadu 600028', supervisor: 'R. Subramaniam', shift: 'General', status: 'active' },
  { id: 2, clientId: 1, name: 'Highland Towers Mumbai', location: '22 Marine Drive, Mumbai, Maharashtra 400002', supervisor: 'V. Kulkarni', shift: 'Rotational', status: 'active' },
  { id: 3, clientId: 1, name: 'Riverside Tech Hub Bengaluru', location: '88 Koramangala, Bengaluru, Karnataka 560095', supervisor: 'M. Narayan', shift: 'General', status: 'active' },
  { id: 4, clientId: 2, name: 'City Centre Mall Pune', location: '45 FC Road, Pune, Maharashtra 411004', supervisor: 'A. Deshpande', shift: 'Morning', status: 'active' },
  { id: 5, clientId: 2, name: 'Grand Galleria Mall Hyderabad', location: '7 Banjara Hills, Hyderabad, Telangana 500034', supervisor: 'P. Varma', shift: 'Rotational', status: 'active' },
  { id: 6, clientId: 2, name: 'Urban Square Mall Delhi', location: '101 Connaught Place, New Delhi, Delhi 110001', supervisor: 'S. Khanna', shift: 'Rotational', status: 'active' },
  { id: 7, clientId: 3, name: 'Alpha Industrial Estate Chennai', location: '33 Ambattur Industrial Estate, Chennai, Tamil Nadu 600058', supervisor: 'R. Venkatesan', shift: 'Night', status: 'active' },
  { id: 8, clientId: 3, name: 'Sigma Electronics Park Bengaluru', location: '12 Whitefield, Bengaluru, Karnataka 560066', supervisor: 'T. Prabhakar', shift: 'General', status: 'active' },
  { id: 9, clientId: 4, name: 'Greenfield Main Hospital Mumbai', location: '5 Andheri West, Mumbai, Maharashtra 400053', supervisor: 'Dr. K. Shah', shift: 'Rotational', status: 'active' },
  { id: 10, clientId: 4, name: 'Greenfield Annex Clinic Pune', location: '118 Kothrud, Pune, Maharashtra 411038', supervisor: 'Dr. A. Joshi', shift: 'General', status: 'active' },
]

const pad = (n, w) => String(n).padStart(w, '0')
const pan = (id) => `AABPC${pad(id, 4)}K`
const uan = (id) => `1010${pad(id, 8)}`
const aadhaar = (id) => `7896${pad(id, 8)}`
const account = (id) => `6001${pad(id, 10)}`

const BANKS = ['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Canara Bank', 'Bank of Baroda', 'Punjab National Bank']
const IFSC = { 'HDFC Bank': 'HDFC0000401', 'State Bank of India': 'SBIN0009988', 'ICICI Bank': 'ICIC0001020', 'Axis Bank': 'UTIB0000123', 'Canara Bank': 'CNRB0001999', 'Bank of Baroda': 'BARB0000112', 'Punjab National Bank': 'PUNB0484600' }

// attendance helper: [present, absent, paidLeave, unpaidLeave, otHours, remarks]
const A = (p, ab, paid, unpaid, ot, remarks = '') => ({ p, ab, paid, unpaid, ot, remarks })
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))
const july = (a, i) => ({
  p: clamp(a.p + ((i % 3) - 1), 18, 28),
  ab: clamp(a.ab - ((i % 3) - 1), 0, 12),
  paid: a.paid,
  unpaid: a.unpaid,
  ot: Math.max(0, a.ot + ((i * 7) % 9) - 4),
  remarks: a.remarks,
})

// salary helper: basic, hra, conveyance, otherAllowance, otRate, pf, esic, otherDed
const S = (b, h, c, o, ot, pf, esic, od = 0) => ({ b, h, c, o, ot, pf, esic, od })

const BASE = (id, first, last, gender, dob, mobile, city, state, pincode, joining, designation, department, empType, shift, siteId, status, bankIdx, sal, att) => {
  const bank = BANKS[bankIdx]
  return {
    id, first, last, gender, dob, mobile, city, state, pincode, joining, designation, department,
    empType, shift, siteId, status, bank, ifsc: IFSC[bank], account: account(id), pan: pan(id), uan: uan(id),
    aadhaar: aadhaar(id), sal, attendanceAug: att, attendanceJul: july(att, id),
  }
}

export const EMPLOYEES = [
  // ---- ABC Facility Services — Corporate Park Chennai ----
  BASE(1, 'Rahul', 'Sharma', 'Male', '1988-04-12', '98100 10001', 'Chennai', 'Tamil Nadu', '600028', '2023-01-10', 'Security Supervisor', 'Security', 'permanent', 'General', 1, 'active', 0, S(12500, 5000, 1000, 1500, 95, 1, 0), A(24, 5, 1, 0, 12, 'OT for access control upgrade')),
  BASE(2, 'Amit', 'Verma', 'Male', '1992-07-23', '98100 10002', 'Chennai', 'Tamil Nadu', '600028', '2023-02-14', 'Security Guard', 'Security', 'permanent', 'General', 1, 'active', 1, S(9000, 3600, 800, 600, 75, 1, 1), A(25, 4, 0, 1, 8, '')),
  BASE(3, 'Sanjay', 'Gupta', 'Male', '1990-11-05', '98100 10003', 'Chennai', 'Tamil Nadu', '600028', '2023-03-01', 'Security Guard', 'Security', 'contract', 'Night', 1, 'active', 2, S(8500, 3400, 800, 600, 75, 1, 1), A(26, 3, 0, 0, 24, 'Night shift OT')),
  BASE(4, 'Vikas', 'Yadav', 'Male', '1987-02-17', '98100 10004', 'Chennai', 'Tamil Nadu', '600028', '2023-01-20', 'Electrician', 'Technical', 'permanent', 'General', 1, 'active', 3, S(11500, 4600, 800, 800, 90, 1, 1), A(23, 6, 0, 1, 15, 'Emergency electrical work')),
  BASE(5, 'Mohan', 'Das', 'Male', '1995-09-30', '98100 10005', 'Chennai', 'Tamil Nadu', '600028', '2024-04-05', 'Office Boy', 'Administration', 'permanent', 'General', 1, 'active', 4, S(7500, 3000, 600, 400, 65, 1, 1), A(25, 4, 1, 0, 0, '')),
  BASE(6, 'Suresh', 'Kumar', 'Male', '1985-05-08', '98100 10006', 'Chennai', 'Tamil Nadu', '600028', '2022-08-01', 'Facility Supervisor', 'Facilities', 'permanent', 'General', 1, 'active', 5, S(16000, 6400, 1000, 1600, 110, 1, 0), A(24, 5, 0, 0, 6, '')),

  // ---- ABC Facility Services — Highland Towers Mumbai ----
  BASE(7, 'Ramesh', 'Kumar', 'Male', '1991-12-19', '98100 10007', 'Mumbai', 'Maharashtra', '400002', '2023-05-02', 'Security Guard', 'Security', 'permanent', 'Rotational', 2, 'active', 6, S(8800, 3520, 800, 500, 75, 1, 1), A(26, 3, 0, 0, 10, '')),
  BASE(8, 'Deepak', 'Singh', 'Male', '1993-03-25', '98100 10008', 'Mumbai', 'Maharashtra', '400002', '2023-06-12', 'Security Guard', 'Security', 'contract', 'Night', 2, 'active', 0, S(8600, 3440, 800, 600, 75, 1, 1), A(25, 4, 0, 1, 28, 'Night shift OT')),
  BASE(9, 'Manoj', 'Tiwari', 'Male', '1996-08-14', '98100 10009', 'Mumbai', 'Maharashtra', '400002', '2024-02-20', 'Cleaner', 'Housekeeping', 'permanent', 'Morning', 2, 'active', 1, S(7200, 2880, 600, 400, 60, 1, 1), A(24, 5, 1, 0, 0, '')),
  BASE(10, 'Raju', 'Patel', 'Male', '1986-10-02', '98100 10010', 'Mumbai', 'Maharashtra', '400002', '2023-07-17', 'Plumber', 'Technical', 'contract', 'General', 2, 'active', 2, S(10500, 4200, 800, 800, 85, 1, 1), A(22, 7, 0, 1, 9, 'Plumbing maintenance OT')),
  BASE(11, 'Anil', 'Chauhan', 'Male', '1994-01-28', '98100 10011', 'Mumbai', 'Maharashtra', '400002', '2024-05-09', 'Housekeeping Staff', 'Housekeeping', 'permanent', 'Morning', 2, 'active', 3, S(7800, 3120, 700, 500, 65, 1, 1), A(25, 4, 0, 0, 4, '')),

  // ---- ABC Facility Services — Riverside Tech Hub Bengaluru ----
  BASE(12, 'Nitin', 'Shetty', 'Male', '1989-06-21', '98100 10012', 'Bengaluru', 'Karnataka', '560095', '2023-03-18', 'Security Supervisor', 'Security', 'permanent', 'General', 3, 'active', 4, S(12500, 5000, 1000, 1500, 95, 1, 0), A(25, 4, 0, 0, 10, '')),
  BASE(13, 'Karan', 'Malhotra', 'Male', '1992-09-11', '98100 10013', 'Bengaluru', 'Karnataka', '560095', '2023-04-02', 'Security Guard', 'Security', 'permanent', 'General', 3, 'active', 5, S(9200, 3680, 800, 600, 75, 1, 1), A(26, 3, 0, 0, 6, '')),
  BASE(14, 'Arjun', 'Reddy', 'Male', '1988-11-27', '98100 10014', 'Bengaluru', 'Karnataka', '560095', '2023-01-15', 'Maintenance Technician', 'Technical', 'permanent', 'General', 3, 'active', 6, S(12000, 4800, 800, 1000, 90, 1, 1), A(24, 5, 1, 0, 18, 'Preventive maintenance OT')),
  BASE(15, 'Pooja', 'Sharma', 'Female', '1996-05-16', '98100 10015', 'Bengaluru', 'Karnataka', '560095', '2024-08-01', 'Receptionist', 'Administration', 'permanent', 'General', 3, 'active', 0, S(9500, 3800, 800, 600, 70, 1, 1), A(25, 4, 1, 0, 0, '')),

  // ---- Metro Mall Management — City Centre Mall Pune ----
  BASE(16, 'Sunil', 'Pawar', 'Male', '1987-03-06', '98100 10016', 'Pune', 'Maharashtra', '411004', '2023-02-01', 'Housekeeping Supervisor', 'Housekeeping', 'permanent', 'Morning', 4, 'active', 1, S(11000, 4400, 800, 800, 85, 1, 1), A(24, 5, 1, 0, 8, '')),
  BASE(17, 'Vijay', 'More', 'Male', '1995-07-19', '98100 10017', 'Pune', 'Maharashtra', '411004', '2024-01-10', 'Housekeeping Staff', 'Housekeeping', 'contract', 'Morning', 4, 'active', 2, S(7800, 3120, 700, 500, 65, 1, 1), A(26, 3, 0, 0, 5, '')),
  BASE(18, 'Sandeep', 'Kulkarni', 'Male', '1990-12-03', '98100 10018', 'Pune', 'Maharashtra', '411004', '2023-05-20', 'Security Guard', 'Security', 'permanent', 'Morning', 4, 'active', 3, S(8800, 3520, 800, 500, 75, 1, 1), A(25, 4, 0, 0, 7, '')),
  BASE(19, 'Mahesh', 'Joshi', 'Male', '1984-04-25', '98100 10019', 'Pune', 'Maharashtra', '411004', '2024-03-15', 'Gardener', 'Housekeeping', 'contract', 'Morning', 4, 'active', 4, S(7200, 2880, 600, 400, 60, 1, 1), A(23, 6, 0, 1, 0, '')),

  // ---- Metro Mall Management — Grand Galleria Mall Hyderabad ----
  BASE(20, 'Srinivas', 'Rao', 'Male', '1991-08-22', '98100 10020', 'Hyderabad', 'Telangana', '500034', '2023-06-01', 'Security Guard', 'Security', 'permanent', 'Rotational', 5, 'active', 5, S(9000, 3600, 800, 600, 75, 1, 1), A(26, 4, 0, 0, 12, '')),
  BASE(21, 'Prasad', 'Naidu', 'Male', '1993-10-09', '98100 10021', 'Hyderabad', 'Telangana', '500034', '2024-04-18', 'Housekeeping Staff', 'Housekeeping', 'contract', 'Evening', 5, 'active', 6, S(7600, 3040, 700, 500, 65, 1, 1), A(25, 5, 0, 0, 6, '')),
  BASE(22, 'Ganesh', 'Patil', 'Male', '1989-01-13', '98100 10022', 'Hyderabad', 'Telangana', '500034', '2023-09-01', 'Driver', 'Transport', 'permanent', 'Morning', 5, 'active', 0, S(9800, 3920, 800, 700, 75, 1, 1), A(24, 5, 1, 0, 10, 'Transport OT for mall supplies')),

  // ---- Metro Mall Management — Urban Square Mall Delhi ----
  BASE(23, 'Harish', 'Kumar', 'Male', '1992-02-07', '98100 10023', 'New Delhi', 'Delhi', '110001', '2023-10-02', 'Security Guard', 'Security', 'permanent', 'Rotational', 6, 'active', 1, S(8800, 3520, 800, 500, 75, 1, 1), A(27, 2, 0, 0, 14, '')),
  BASE(24, 'Rohit', 'Arora', 'Male', '1988-09-18', '98100 10024', 'New Delhi', 'Delhi', '110001', '2023-11-06', 'Electrician', 'Technical', 'permanent', 'General', 6, 'active', 2, S(11500, 4600, 800, 800, 90, 1, 1), A(23, 6, 0, 1, 20, 'Store lighting project OT')),
  BASE(25, 'Amit', 'Bansal', 'Male', '1990-06-29', '98100 10025', 'New Delhi', 'Delhi', '110001', '2024-02-01', 'Floor Executive', 'Facilities', 'permanent', 'Rotational', 6, 'active', 3, S(10800, 4320, 800, 700, 80, 1, 1), A(24, 5, 1, 0, 8, '')),

  // ---- SecureTech Industries — Alpha Industrial Estate Chennai ----
  BASE(26, 'Vikram', 'Singh', 'Male', '1986-11-04', '98100 10026', 'Chennai', 'Tamil Nadu', '600058', '2023-07-01', 'Security Guard', 'Security', 'contract', 'Night', 7, 'active', 4, S(8800, 3520, 800, 600, 75, 1, 1), A(25, 4, 0, 0, 30, 'Night shift OT')),
  BASE(27, 'Rajesh', 'Kumar', 'Male', '1991-05-27', '98100 10027', 'Chennai', 'Tamil Nadu', '600058', '2023-08-10', 'Security Guard', 'Security', 'permanent', 'Night', 7, 'active', 5, S(9200, 3680, 800, 600, 75, 1, 1), A(26, 3, 0, 0, 18, '')),
  BASE(28, 'Murugan', 'K', 'Male', '1994-12-08', '98100 10028', 'Chennai', 'Tamil Nadu', '600058', '2024-06-03', 'Housekeeping Staff', 'Housekeeping', 'contract', 'Night', 7, 'active', 6, S(7600, 3040, 700, 500, 65, 1, 1), A(25, 4, 0, 1, 26, 'Night shift OT')),
  BASE(29, 'Selvam', 'R', 'Male', '1986-03-15', '98100 10029', 'Chennai', 'Tamil Nadu', '600058', '2023-04-22', 'Electrician Supervisor', 'Technical', 'permanent', 'Night', 7, 'active', 0, S(13500, 5400, 1000, 1100, 100, 1, 1), A(24, 5, 1, 0, 22, 'Line maintenance OT')),

  // ---- SecureTech Industries — Sigma Electronics Park Bengaluru ----
  BASE(30, 'Anand', 'Kumar', 'Male', '1985-09-11', '98100 10030', 'Bengaluru', 'Karnataka', '560066', '2022-12-01', 'Site Supervisor', 'Facilities', 'permanent', 'General', 8, 'active', 1, S(18500, 7400, 1000, 2100, 115, 1, 0), A(25, 4, 0, 0, 8, '')),
  BASE(31, 'Kiran', 'P', 'Male', '1993-06-27', '98100 10031', 'Bengaluru', 'Karnataka', '560066', '2023-10-14', 'Security Guard', 'Security', 'permanent', 'General', 8, 'active', 2, S(8800, 3520, 800, 500, 75, 1, 1), A(26, 3, 0, 0, 5, '')),
  BASE(32, 'Dinesh', 'Babu', 'Male', '1989-02-03', '98100 10032', 'Bengaluru', 'Karnataka', '560066', '2023-05-18', 'HVAC Technician', 'Technical', 'permanent', 'General', 8, 'active', 3, S(13500, 5400, 1000, 1000, 100, 1, 1), A(23, 6, 1, 0, 16, 'AC overhaul OT')),

  // ---- Greenfield Hospital — Main Hospital ----
  BASE(33, 'Rakesh', 'Yadav', 'Male', '1990-07-20', '98100 10033', 'Mumbai', 'Maharashtra', '400053', '2023-09-05', 'Medical Attendant', 'Medical Services', 'permanent', 'Rotational', 9, 'active', 4, S(8500, 3400, 800, 600, 75, 1, 1), A(26, 3, 1, 0, 12, 'Ward support OT')),
  BASE(34, 'Neha', 'Gupta', 'Female', '1995-04-09', '98100 10034', 'Mumbai', 'Maharashtra', '400053', '2024-07-12', 'Housekeeping Staff', 'Housekeeping', 'permanent', 'Rotational', 9, 'active', 5, S(7800, 3120, 700, 500, 65, 1, 1), A(25, 4, 0, 1, 8, '')),
  BASE(35, 'Suresh', 'Menon', 'Male', '1984-08-30', '98100 10035', 'Mumbai', 'Maharashtra', '400053', '2022-11-01', 'Facility Supervisor', 'Facilities', 'permanent', 'General', 9, 'active', 6, S(16000, 6400, 1000, 1600, 110, 1, 0), A(24, 5, 0, 0, 6, '')),

  // ---- Greenfield Hospital — Annex Clinic (inactive) ----
  BASE(36, 'Prakash', 'Iyer', 'Male', '1987-12-11', '98100 10036', 'Pune', 'Maharashtra', '411038', '2023-06-08', 'Security Guard', 'Security', 'permanent', 'Rotational', 10, 'inactive', 0, S(8800, 3520, 800, 500, 75, 1, 1), A(0, 0, 0, 0, 0, '')),
  BASE(37, 'Meena', 'Kumari', 'Female', '1992-01-17', '98100 10037', 'Pune', 'Maharashtra', '411038', '2024-03-22', 'Cleaner', 'Housekeeping', 'contract', 'Morning', 10, 'inactive', 1, S(7200, 2880, 600, 400, 60, 1, 1), A(0, 0, 0, 0, 0, '')),
  BASE(38, 'Babu', 'Lal', 'Male', '1985-10-05', '98100 10038', 'Pune', 'Maharashtra', '411038', '2023-02-25', 'Driver', 'Transport', 'permanent', 'Morning', 10, 'inactive', 2, S(9800, 3920, 800, 700, 75, 1, 1), A(0, 0, 0, 0, 0, '')),
]

export const ADVANCES = [
  { employee_id: 2, amount: 2000, month: 8, year: 2026, remarks: 'Salary advance' },
  { employee_id: 9, amount: 1500, month: 8, year: 2026, remarks: 'Medical advance' },
  { employee_id: 26, amount: 2500, month: 8, year: 2026, remarks: 'Salary advance' },
  { employee_id: 13, amount: 2000, month: 7, year: 2026, remarks: 'Salary advance' },
  { employee_id: 22, amount: 1500, month: 7, year: 2026, remarks: 'Travel advance' },
]
