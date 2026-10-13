// Mock data layer — modeled after a relational schema, persisted to localStorage.
const DB_KEY = 'hrsuite_db_v2';

const SEED = {
  company: {
    name: 'Sunrise Digital Solutions Inc.',
    logo: '',
    address: '4F Pinnacle Tower, BGC, Taguig City',
    contact: '+63 2 8888 1234',
    email: 'hr@sunrisedigital.ph',
    payrollFrequency: 'Semi-monthly',
    payrollDates: '15th and 30th',
    gracePeriod: 10,
    lateRule: 'After grace period',
    undertimeRule: 'Before 5:00 PM cut-off',
    overtimeRule: 'Beyond 8 hours, approved',
    deductionRules: [
      { id: 1, name: 'SSS', type: 'Government', basis: 'Fixed contribution table', enabled: true },
      { id: 2, name: 'PhilHealth', type: 'Government', basis: '2% of basic, max ₱100k MSC', enabled: true },
      { id: 3, name: 'Pag-IBIG', type: 'Government', basis: '2% of basic, max ₱5k MSC', enabled: true },
      { id: 4, name: 'Withholding Tax', type: 'Government', basis: 'BIR TRAIN Law table', enabled: true },
      { id: 5, name: 'Loans', type: 'Company', basis: 'Fixed monthly amortization', enabled: true },
      { id: 6, name: 'Absences', type: 'Attendance', basis: 'Daily rate × days absent', enabled: true },
      { id: 7, name: 'Lates', type: 'Attendance', basis: 'Pro-rated per minute', enabled: true },
    ],
    workflows: [
      { type: 'leave', steps: [{ role: 'Manager', label: 'Supervisor review' }, { role: 'HR/Admin', label: 'HR approval' }] },
      { type: 'overtime', steps: [{ role: 'Manager', label: 'Supervisor review' }, { role: 'HR/Admin', label: 'HR approval' }] },
      { type: 'attendance_correction', steps: [{ role: 'Manager', label: 'Supervisor review' }, { role: 'HR/Admin', label: 'HR approval' }] },
      { type: 'payroll', steps: [{ role: 'Payroll Officer', label: 'Prepared' }, { role: 'HR/Admin', label: 'HR review' }, { role: 'Super Admin', label: 'Final approval' }] },
      { type: 'recruitment', steps: [{ role: 'HR/Admin', label: 'HR screening' }, { role: 'Manager', label: 'Hiring manager' }] },
      { type: 'expense', steps: [{ role: 'Manager', label: 'Supervisor review' }, { role: 'Finance', label: 'Finance approval' }] },
    ],
  },
  departments: [
    { id: 1, name: 'Administration' }, { id: 2, name: 'Finance' }, { id: 3, name: 'HR' },
    { id: 4, name: 'Sales' }, { id: 5, name: 'Marketing' }, { id: 6, name: 'Operations' }, { id: 7, name: 'IT' },
  ],
  positions: [
    { id: 1, name: 'Software Engineer', dept: 7 }, { id: 2, name: 'HR Officer', dept: 3 },
    { id: 3, name: 'Accountant', dept: 2 }, { id: 4, name: 'Sales Executive', dept: 4 },
    { id: 5, name: 'Marketing Specialist', dept: 5 }, { id: 6, name: 'Operations Lead', dept: 6 },
    { id: 7, name: 'Admin Assistant', dept: 1 }, { id: 8, name: 'IT Support', dept: 7 },
  ],
  schedules: [
    { id: 1, name: 'Day Shift', days: 'Mon–Fri', from: '08:00', to: '17:00', break: '12:00–13:00', type: 'Fixed', restDay: 'Sat, Sun' },
    { id: 2, name: 'Flexi Shift', days: 'Mon–Fri', from: '09:00', to: '18:00', break: '12:00–13:00', type: 'Flexible', restDay: 'Sat, Sun' },
    { id: 3, name: 'Graveyard Shift', days: 'Sun–Thu', from: '22:00', to: '06:00', break: '02:00–03:00', type: 'Shifting', restDay: 'Fri, Sat' },
  ],
  holidays: [
    { id: 1, name: 'Rizal Day', date: '2026-12-30', type: 'Regular' },
    { id: 2, name: 'National Heroes Day', date: '2026-08-31', type: 'Regular' },
    { id: 3, name: 'Bonifacio Day', date: '2026-11-30', type: 'Regular' },
  ],
  leaveTypes: [
    { id: 1, name: 'Vacation Leave', credits: 15 }, { id: 2, name: 'Sick Leave', credits: 15 },
    { id: 3, name: 'Emergency Leave', credits: 5 }, { id: 4, name: 'Maternity Leave', credits: 105 },
    { id: 5, name: 'Paternity Leave', credits: 7 }, { id: 6, name: 'Bereavement Leave', credits: 5 },
    { id: 7, name: 'Other Leave', credits: 0 },
  ],
  users: [
    { id: 1, name: 'Maria Santos', email: 'admin@sunrisedigital.ph', role: 'Super Admin', pass: 'admin123' },
    { id: 2, name: 'HR Team', email: 'hr@sunrisedigital.ph', role: 'HR/Admin', pass: 'hr123' },
    { id: 3, name: 'John Reyes', email: 'manager@sunrisedigital.ph', role: 'Manager', pass: 'manager123' },
    { id: 4, name: 'Ana Cruz', email: 'employee@sunrisedigital.ph', role: 'Employee', pass: 'emp123' },
  ],
  employees: [
    { id: 1, code: 'EMP-001', name: 'Maria Santos', dob: '1988-04-12', gender: 'Female', civilStatus: 'Married', nationality: 'Filipino', address: 'Taguig City', contact: '0917-111-0001', email: 'maria.santos@sunrisedigital.ph', personalEmail: 'maria.santos88@gmail.com', personalMobile: '0917-111-0001', emergencyName: 'Jose Santos', emergencyRelation: 'Spouse', emergencyPhone: '0917-111-0009', dept: 1, position: 2, supervisor: null, workLocation: 'BGC, Taguig', type: 'Regular', status: 'Active', hired: '2019-03-11', regularizationDate: '2019-09-11', resignationDate: '', terminationDate: '', salaryType: 'Monthly', payFrequency: 'Semi-monthly', salary: 95000, schedule: 1, allowances: 8000, benefits: 'HMO, 13th month', sss: '34-1234567-8', philhealth: '01-234567890-1', pagibig: '1234-5678-9012', tin: '123-456-789-000', bank: 'BPI', bankAccount: '8891-0001-22', bankAccountName: 'Maria Santos', paymentMethod: 'Bank transfer' },
    { id: 2, code: 'EMP-002', name: 'John Reyes', dob: '1990-11-02', gender: 'Male', civilStatus: 'Single', nationality: 'Filipino', address: 'Pasig City', contact: '0918-222-0002', email: 'john.reyes@sunrisedigital.ph', personalEmail: 'john.reyes90@gmail.com', personalMobile: '0918-222-0002', emergencyName: 'Liza Reyes', emergencyRelation: 'Mother', emergencyPhone: '0918-222-0009', dept: 4, position: 4, supervisor: 1, workLocation: 'BGC, Taguig', type: 'Regular', status: 'Active', hired: '2020-06-15', regularizationDate: '2020-12-15', resignationDate: '', terminationDate: '', salaryType: 'Monthly', payFrequency: 'Semi-monthly', salary: 42000, schedule: 1, allowances: 3000, benefits: 'HMO, 13th month', sss: '34-2345678-9', philhealth: '01-345678901-2', pagibig: '2345-6789-0123', tin: '234-567-890-000', bank: 'BDO', bankAccount: '4421-0002-33', bankAccountName: 'John Reyes', paymentMethod: 'Bank transfer' },
    { id: 3, code: 'EMP-003', name: 'Ana Cruz', dob: '1995-01-25', gender: 'Female', civilStatus: 'Single', nationality: 'Filipino', address: 'Quezon City', contact: '0919-333-0003', email: 'ana.cruz@sunrisedigital.ph', personalEmail: 'ana.cruz95@gmail.com', personalMobile: '0919-333-0003', emergencyName: 'Rosa Cruz', emergencyRelation: 'Mother', emergencyPhone: '0919-333-0009', dept: 7, position: 1, supervisor: 1, workLocation: 'BGC, Taguig', type: 'Regular', status: 'Active', hired: '2021-08-02', regularizationDate: '2022-02-02', resignationDate: '', terminationDate: '', salaryType: 'Monthly', payFrequency: 'Semi-monthly', salary: 65000, schedule: 2, allowances: 5000, benefits: 'HMO, 13th month', sss: '34-3456789-0', philhealth: '01-456789012-3', pagibig: '3456-7890-1234', tin: '345-678-901-000', bank: 'UnionBank', bankAccount: '1123-0003-44', bankAccountName: 'Ana Cruz', paymentMethod: 'Bank transfer' },
    { id: 4, code: 'EMP-004', name: 'Mark Dela Cruz', dob: '1987-07-19', gender: 'Male', civilStatus: 'Married', nationality: 'Filipino', address: 'Mandaluyong City', contact: '0920-444-0004', email: 'mark.delacruz@sunrisedigital.ph', personalEmail: 'mark.dc87@gmail.com', personalMobile: '0920-444-0004', emergencyName: 'Jenny Dela Cruz', emergencyRelation: 'Spouse', emergencyPhone: '0920-444-0009', dept: 2, position: 3, supervisor: 1, workLocation: 'BGC, Taguig', type: 'Regular', status: 'Active', hired: '2018-01-22', regularizationDate: '2018-07-22', resignationDate: '', terminationDate: '', salaryType: 'Monthly', payFrequency: 'Semi-monthly', salary: 55000, schedule: 1, allowances: 4500, benefits: 'HMO, 13th month', sss: '34-4567890-1', philhealth: '01-567890123-4', pagibig: '4567-8901-2345', tin: '456-789-012-000', bank: 'Landbank', bankAccount: '9034-0004-55', bankAccountName: 'Mark Dela Cruz', paymentMethod: 'Bank transfer' },
    { id: 5, code: 'EMP-005', name: 'Jessica Tan', dob: '1993-09-08', gender: 'Female', civilStatus: 'Single', nationality: 'Filipino', address: 'Makati City', contact: '0921-555-0005', email: 'jessica.tan@sunrisedigital.ph', personalEmail: 'jessica.tan93@gmail.com', personalMobile: '0921-555-0005', emergencyName: 'Peter Tan', emergencyRelation: 'Father', emergencyPhone: '0921-555-0009', dept: 5, position: 5, supervisor: 2, workLocation: 'Makati', type: 'Fixed-term', status: 'Active', hired: '2024-02-10', regularizationDate: '', resignationDate: '', terminationDate: '', salaryType: 'Monthly', payFrequency: 'Semi-monthly', salary: 38000, schedule: 2, allowances: 2500, benefits: '13th month', sss: '34-5678901-2', philhealth: '01-678901234-5', pagibig: '5678-9012-3456', tin: '567-890-123-000', bank: 'Metrobank', bankAccount: '7788-0005-66', bankAccountName: 'Jessica Tan', paymentMethod: 'Bank transfer' },
    { id: 6, code: 'EMP-006', name: 'Paolo Garcia', dob: '1992-12-30', gender: 'Male', civilStatus: 'Single', nationality: 'Filipino', address: 'Parañaque City', contact: '0922-666-0006', email: 'paolo.garcia@sunrisedigital.ph', personalEmail: 'paolo.g92@gmail.com', personalMobile: '0922-666-0006', emergencyName: 'Marta Garcia', emergencyRelation: 'Mother', emergencyPhone: '0922-666-0009', dept: 6, position: 6, supervisor: 1, workLocation: 'BGC, Taguig', type: 'Regular', status: 'Active', hired: '2022-04-18', regularizationDate: '2022-10-18', resignationDate: '', terminationDate: '', salaryType: 'Monthly', payFrequency: 'Semi-monthly', salary: 60000, schedule: 1, allowances: 6000, benefits: 'HMO, 13th month', sss: '34-6789012-3', philhealth: '01-789012345-6', pagibig: '6789-0123-4567', tin: '678-901-234-000', bank: 'Chinabank', bankAccount: '5512-0006-77', bankAccountName: 'Paolo Garcia', paymentMethod: 'Bank transfer' },
    { id: 7, code: 'EMP-007', name: 'Karen Villanueva', dob: '1996-05-14', gender: 'Female', civilStatus: 'Single', nationality: 'Filipino', address: 'Pasig City', contact: '0923-777-0007', email: 'karen.villanueva@sunrisedigital.ph', personalEmail: 'karen.v96@gmail.com', personalMobile: '0923-777-0007', emergencyName: 'Rico Villanueva', emergencyRelation: 'Brother', emergencyPhone: '0923-777-0009', dept: 1, position: 7, supervisor: 1, workLocation: 'BGC, Taguig', type: 'Probationary', status: 'Active', hired: '2026-07-01', regularizationDate: '', resignationDate: '', terminationDate: '', salaryType: 'Monthly', payFrequency: 'Semi-monthly', salary: 25000, schedule: 1, allowances: 2000, benefits: '13th month', sss: '34-7890123-4', philhealth: '01-890123456-7', pagibig: '7890-1234-5678', tin: '789-012-345-000', bank: 'BPI', bankAccount: '6644-0007-88', bankAccountName: 'Karen Villanueva', paymentMethod: 'Bank transfer' },
    { id: 8, code: 'EMP-008', name: 'Ramon Aquino', dob: '1985-03-03', gender: 'Male', civilStatus: 'Married', nationality: 'Filipino', address: 'Marikina City', contact: '0924-888-0008', email: 'ramon.aquino@sunrisedigital.ph', personalEmail: 'ramon.a85@gmail.com', personalMobile: '0924-888-0008', emergencyName: 'Nadia Aquino', emergencyRelation: 'Spouse', emergencyPhone: '0924-888-0009', dept: 7, position: 8, supervisor: 1, workLocation: 'BGC, Taguig', type: 'Regular', status: 'Archived', hired: '2017-05-20', regularizationDate: '2017-11-20', resignationDate: '2026-05-30', terminationDate: '', salaryType: 'Monthly', payFrequency: 'Semi-monthly', salary: 30000, schedule: 3, allowances: 1500, benefits: 'HMO, 13th month', sss: '34-8901234-5', philhealth: '01-901234567-8', pagibig: '8901-2345-6789', tin: '890-123-456-000', bank: 'BDO', bankAccount: '2209-0008-99', bankAccountName: 'Ramon Aquino', paymentMethod: 'Bank transfer' },
  ],
  attendance: [],
  leaveRequests: [],
  payrollPeriods: [],
  payrollRecords: [],
  notifications: [],
  activity: [],
  documents: [
    { id: 1, empId: 3, name: 'Employment contract', category: 'Contracts', file: 'ana-cruz-contract.pdf', expiry: '', status: 'Active' },
    { id: 2, empId: 3, name: 'College diploma', category: 'Certificates', file: 'ana-cruz-diploma.pdf', expiry: '', status: 'Active' },
    { id: 3, empId: 2, name: 'Employment contract', category: 'Contracts', file: 'john-reyes-contract.pdf', expiry: '', status: 'Active' },
  ],
  overtimeRequests: [
    { id: 1, empId: 3, empName: 'Ana Cruz', date: '2026-10-06', start: '18:00', end: '20:00', hours: 2, reason: 'Month-end closing support', project: 'Finance close', status: 'Pending', stage: 0, history: [], doc: '' },
    { id: 2, empId: 6, empName: 'Paolo Garcia', date: '2026-10-03', start: '17:00', end: '19:30', hours: 2.5, reason: 'Deployment support', project: 'IT rollout', status: 'Approved', stage: 2, history: [{ by: 'John Reyes', role: 'Manager', decision: 'approve', comment: '', date: '2026-10-04', step: 0 }, { by: 'HR Team', role: 'HR/Admin', decision: 'approve', comment: 'Verified', date: '2026-10-04', step: 1 }], doc: '' },
    { id: 3, empId: 5, empName: 'Jessica Tan', date: '2026-10-02', start: '18:00', end: '21:00', hours: 3, reason: 'Campaign launch', project: 'Marketing', status: 'Pending', stage: 1, history: [{ by: 'John Reyes', role: 'Manager', decision: 'approve', comment: 'OK', date: '2026-10-03', step: 0 }], doc: '' },
  ],
  correctionRequests: [
    { id: 1, empId: 3, empName: 'Ana Cruz', date: '2026-10-05', field: 'timeOut', originalTime: '—', requestedTime: '05:12 PM', reason: 'Forgot to clock out', status: 'Pending', stage: 0, history: [], doc: '' },
  ],
  jobOpenings: [
    { id: 1, title: 'Software Engineer', dept: 7, position: 1, type: 'Regular', location: 'BGC, Taguig', salaryMin: 60000, salaryMax: 80000, description: 'Build HRIS features in React + Supabase.', requirements: 'React, TypeScript, REST', openings: 2, status: 'Open', created: '2026-09-20' },
    { id: 2, title: 'HR Officer', dept: 3, position: 2, type: 'Regular', location: 'BGC, Taguig', salaryMin: 30000, salaryMax: 38000, description: 'Own onboarding and records.', requirements: 'HR experience, PH labor basics', openings: 1, status: 'Open', created: '2026-09-28' },
  ],
  applicants: [
    { id: 1, name: 'Liza Mendoza', email: 'liza.m@example.com', phone: '0917-000-0001', openingId: 1, source: 'Referral', status: 'Interview', notes: 'Strong React portfolio', resume: '', appliedDate: '2026-10-01', history: [], doc: '' },
    { id: 2, name: 'Kevin Ramos', email: 'kevin.r@example.com', phone: '0917-000-0002', openingId: 1, source: 'Job portal', status: 'Screening', notes: '', resume: '', appliedDate: '2026-10-04', history: [], doc: '' },
  ],
  interviews: [],
  offers: [],
  onboardingTemplates: [
    { id: 1, name: 'Standard employee', items: ['Employment contract', 'Government IDs', 'Bank information', 'Company orientation', 'Policy acknowledgment', 'Equipment assignment', 'Email/account creation', 'Department orientation'] },
  ],
  onboarding: [],
  offboarding: [],
  hrRequests: [],
  announcements: [
    { id: 1, title: 'Payroll cut-off Oct 15', body: 'Submit overtime and corrections before Oct 14, 5PM for the Oct 1–15 payroll.', audience: 'All', dept: null, published: '2026-10-06', expires: '2026-10-16', by: 'HR Team' },
  ],
  loans: [],
  expenses: [],
  goals: [],
  reviews: [],
  skills: [],
  trainings: [],
  trainingRecords: [],
  salaryHistory: [
    { id: 1, empId: 3, date: '2023-08-02', oldSalary: 58000, newSalary: 65000, reason: 'Annual increase', by: 'HR Team' },
    { id: 2, empId: 2, date: '2024-06-15', oldSalary: 38000, newSalary: 42000, reason: 'Promotion to Sales Executive', by: 'Maria Santos' },
  ],
  statusHistory: [
    { id: 1, empId: 7, date: '2026-07-01', oldStatus: '', newStatus: 'Active', reason: 'Hired (probationary)', by: 'HR Team' },
    { id: 2, empId: 8, date: '2026-05-30', oldStatus: 'Active', newStatus: 'Archived', reason: 'Resigned', by: 'HR Team' },
  ],
};

// Generate 30 days of attendance + leave + payroll for demo realism.
(function seed() {
  const statuses = ['Present','Present','Present','Late','Present','Absent','Present','Present','Half Day','On Leave'];
  const today = new Date();
  const empIds = SEED.employees.map(e => e.id);
  for (let d = 29; d >= 0; d--) {
    const dt = new Date(today); dt.setDate(today.getDate() - d);
    const dow = dt.getDay();
    empIds.forEach((id, idx) => {
      if (dow === 0 || dow === 6) return; // weekends
      if (id === 3 && d <= 1) return; // demo: current employee clocks fresh today
      const s = SEED.employees.find(e => e.id === id).status === 'Archived' ? null : statuses[(d + idx) % statuses.length];
      if (!s) return;
      const late = s === 'Late' ? Math.floor(Math.random() * 45) + 5 : 0;
      const ot = s === 'Present' && Math.random() > 0.6 ? (Math.random() * 2).toFixed(1) : 0;
      SEED.attendance.push({
        id: SEED.attendance.length + 1, empId: id,
        date: dt.toISOString().slice(0, 10),
        timeIn: s === 'Absent' || s === 'On Leave' ? '—' : (s === 'Late' ? `08:${String(late).padStart(2,'0')} AM` : `08:0${Math.floor(Math.random()*9)} AM`),
        timeOut: s === 'Absent' || s === 'On Leave' ? '—' : '05:' + String(Math.floor(Math.random() * 30) + 15).padStart(2,'0') + ' PM',
        hours: s === 'Absent' || s === 'On Leave' ? 0 : (s === 'Half Day' ? 4 : 8 + (ot ? +ot : 0)),
        late, overtime: +ot, status: s,
      });
    });
  }
  SEED.leaveRequests = [
    { id: 1, empId: 3, typeId: 1, start: '2026-10-12', end: '2026-10-14', days: 3, reason: 'Family trip to Baguio', status: 'Pending', doc: 'itinerary.pdf' },
    { id: 2, empId: 2, typeId: 2, start: '2026-09-22', end: '2026-09-22', days: 1, reason: 'Fever and flu', status: 'Approved', doc: 'medcert.pdf' },
    { id: 3, empId: 5, typeId: 3, start: '2026-09-05', end: '2026-09-05', days: 1, reason: 'House flooding', status: 'Rejected', doc: '' },
    { id: 4, empId: 6, typeId: 6, start: '2026-10-20', end: '2026-10-22', days: 3, reason: 'Grandparent passing', status: 'Approved', doc: '' },
    { id: 5, empId: 7, typeId: 1, start: '2026-11-02', end: '2026-11-04', days: 3, reason: 'Vacation', status: 'Pending', doc: '' },
  ];
  SEED.payrollPeriods = [
    { id: 1, label: 'Sep 1–15, 2026', from: '2026-09-01', to: '2026-09-15', status: 'Processed' },
    { id: 2, label: 'Sep 16–30, 2026', from: '2026-09-16', to: '2026-09-30', status: 'Processed' },
    { id: 3, label: 'Oct 1–15, 2026', from: '2026-10-01', to: '2026-10-15', status: 'Draft' },
  ];
  SEED.payrollRecords = SEED.employees.filter(e => e.status === 'Active').map(e => {
    const basic = e.salary / 2, ot = Math.round(Math.random() * 4000), hol = 0, nd = 0;
    const allow = e.allowances / 2, bonus = e.id === 3 ? 5000 : 0;
    const gross = basic + ot + hol + nd + allow + bonus;
    const sss = 1350 / 2, ph = gross * 0.01, hdm = Math.min(gross, 50000) * 0.02, tax = Math.max(0, (gross - sss - ph - hdm) * 0.1);
    const loans = e.id === 4 ? 2500 : 0, abs = 0, lates = 0;
    const totalDed = sss + ph + hdm + tax + loans + abs + lates;
    return { id: e.id, empId: e.id, periodId: 2, daysWorked: 11, overtimeHrs: (ot / 260).toFixed(1), basic, overtime: ot, holiday: hol, nightDiff: nd, allowances: allow, bonus, gross, sss, philhealth: ph, pagibig: hdm, tax, loans, absences: abs, lates, totalDed, net: gross - totalDed, status: 'Processed' };
  });
  SEED.notifications = [
    { id: 1, text: 'Leave request submitted by Ana Cruz', time: '5 min ago', unread: true },
    { id: 2, text: 'Payroll processed for Sep 16–30', time: '1 hr ago', unread: true },
    { id: 3, text: 'Mark Dela Cruz was late today', time: '2 hrs ago', unread: true },
    { id: 4, text: 'Jessica Tan has a missing time-out', time: 'Yesterday', unread: false },
    { id: 5, text: 'Payslips are now available', time: 'Yesterday', unread: false },
  ];
  SEED.activity = [
    { text: 'Ana Cruz clocked in', time: '8:03 AM', type: 'in' },
    { text: 'John Reyes submitted a leave request', time: '8:15 AM', type: 'leave' },
    { text: 'Payroll processed for Sep 16–30', time: '9:00 AM', type: 'payroll' },
    { text: 'Karen Villanueva was added', time: 'Yesterday', type: 'user' },
    { text: 'HR approved leave for Paolo Garcia', time: 'Yesterday', type: 'leave' },
    { text: 'Jessica Tan clocked out', time: '5:12 PM', type: 'out' },
  ];
})();

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) { const c = structuredClone(SEED); saveDB(c); return c; }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') { const c = structuredClone(SEED); saveDB(c); return c; }
    return parsed;
  } catch { const c = structuredClone(SEED); try { saveDB(c); } catch {} return c; }
}
function saveDB(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
function getDB() {
  const db = loadDB();
  const needsSeed = !db.company || !Array.isArray(db.employees) || !Array.isArray(db.attendance) || !Array.isArray(db.leaveRequests) || !Array.isArray(db.payrollRecords) || !Array.isArray(db.notifications) || !Array.isArray(db.activity) || !Array.isArray(db.payrollPeriods);
  if (needsSeed) { const c = structuredClone(SEED); saveDB(c); return c; }
  // Migrate older saved DBs: backfill 360° fields + collections without wiping data.
  let dirty = false;
  for (const k of ['documents', 'salaryHistory', 'statusHistory', 'overtimeRequests', 'correctionRequests', 'jobOpenings', 'applicants', 'interviews', 'offers', 'onboardingTemplates', 'onboarding', 'offboarding', 'hrRequests', 'announcements', 'loans', 'expenses', 'goals', 'reviews', 'skills', 'trainings', 'trainingRecords']) {
    if (!Array.isArray(db[k])) { db[k] = structuredClone(SEED[k] ?? []); dirty = true; }
  }
  if (!Array.isArray(db.company?.workflows)) { db.company.workflows = structuredClone(SEED.company.workflows); dirty = true; }
  // Backfill workflow stage/history on older leave requests
  db.leaveRequests.forEach((l) => {
    if (l.status === 'Pending' && typeof l.stage !== 'number') { l.stage = 0; dirty = true; }
    if (!Array.isArray(l.history)) { l.history = []; dirty = true; }
  });
  const seedById = new Map(SEED.employees.map(e => [e.id, e]));
  db.employees.forEach(e => {
    const s = seedById.get(e.id);
    for (const k of ['gender','civilStatus','nationality','personalEmail','personalMobile','emergencyName','emergencyRelation','emergencyPhone','regularizationDate','supervisor','workLocation','resignationDate','terminationDate','payFrequency','benefits','sss','philhealth','pagibig','tin','bankAccount','bankAccountName','paymentMethod']) {
      if (e[k] === undefined) { e[k] = s ? s[k] : ''; dirty = true; }
    }
  });
  if (dirty) saveDB(db);
  return db;
}
const peso = n => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(Number(n) || 0);
const fmtDate = d => { if (!d) return '—'; const dt = new Date(d); if (isNaN(+dt)) return '—'; return dt.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }); };
const deptName = (db, id) => (db.departments.find(d => d.id === id) || {}).name || '—';
const posName = (db, id) => (db.positions.find(p => p.id === id) || {}).name || '—';
const empName = (db, id) => (db.employees.find(e => e.id === id) || {}).name || '—';

export { SEED, getDB, saveDB, loadDB, peso, fmtDate, deptName, posName, empName, DB_KEY };

