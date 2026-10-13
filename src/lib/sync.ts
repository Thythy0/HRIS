import { supabase, isSupabaseConfigured } from './supabaseClient';
import { saveDB } from '../data/mock';

const emptyToNull = (v: any) => (v === '' ? null : v);
const num = (v: any, d = 0) => (v === '' || v == null || isNaN(Number(v)) ? d : Number(v));

// ---- snake -> app shape ----
const mapSchedule = (r: any) => ({ id: r.id, name: r.name, days: r.days, from: r.time_from, to: r.time_to, break: r.break_time, type: r.schedule_type, restDay: r.rest_day });
const mapEmployee = (r: any) => ({ id: r.id, code: r.code, name: r.name, dob: r.dob ?? '', gender: r.gender ?? '', civilStatus: r.civil_status ?? '', nationality: r.nationality ?? '', address: r.address ?? '', contact: r.contact ?? '', email: r.email ?? '', personalEmail: r.personal_email ?? '', personalMobile: r.personal_mobile ?? '', emergencyName: r.emergency_name ?? '', emergencyRelation: r.emergency_relation ?? '', emergencyPhone: r.emergency_phone ?? '', dept: r.dept, position: r.position, supervisor: r.supervisor ?? null, workLocation: r.work_location ?? '', type: r.type, status: r.status, hired: r.hired ?? '', regularizationDate: r.regularization_date ?? '', resignationDate: r.resignation_date ?? '', terminationDate: r.termination_date ?? '', salaryType: r.salary_type, payFrequency: r.pay_frequency ?? '', salary: num(r.salary), schedule: r.schedule, allowances: num(r.allowances), benefits: r.benefits ?? '', sss: r.sss ?? '', philhealth: r.philhealth ?? '', pagibig: r.pagibig ?? '', tin: r.tin ?? '', bank: r.bank ?? '', bankAccount: r.bank_account ?? '', bankAccountName: r.bank_account_name ?? '', paymentMethod: r.payment_method ?? '' });
const mapAttendance = (r: any) => ({ id: r.id, empId: r.emp_id, date: r.date, timeIn: r.time_in ?? '—', timeOut: r.time_out ?? '—', hours: num(r.hours), late: num(r.late), overtime: num(r.overtime), status: r.status });
const mapLeave = (r: any) => ({ id: r.id, empId: r.emp_id, typeId: r.type_id, start: r.start, end: r.end, days: num(r.days, 1), reason: r.reason ?? '', status: r.status, doc: r.doc ?? '', stage: r.stage ?? 0, history: r.history ?? [] });
const mapOvertime = (r: any) => ({ id: r.id, empId: r.emp_id, empName: r.emp_name ?? '', date: r.date, start: r.start_time, end: r.end_time, hours: num(r.hours), reason: r.reason ?? '', project: r.project ?? '', status: r.status, stage: r.stage ?? 0, history: r.history ?? [], doc: r.doc ?? '' });
const mapCorrection = (r: any) => ({ id: r.id, empId: r.emp_id, empName: r.emp_name ?? '', date: r.date, field: r.field, originalTime: r.original_time ?? '—', requestedTime: r.requested_time, reason: r.reason ?? '', status: r.status, stage: r.stage ?? 0, history: r.history ?? [], doc: r.doc ?? '' });
const unmapCorrection = (c: any) => ({ id: c.id, emp_id: c.empId, emp_name: c.empName, date: c.date, field: c.field, original_time: c.originalTime, requested_time: c.requestedTime, reason: c.reason, status: c.status, stage: c.stage ?? 0, history: c.history ?? [], doc: c.doc });
const unmapOvertime = (o: any) => ({ id: o.id, emp_id: o.empId, emp_name: o.empName, date: o.date, start_time: o.start, end_time: o.end, hours: o.hours, reason: o.reason, project: o.project, status: o.status, stage: o.stage ?? 0, history: o.history ?? [], doc: o.doc });
const mapPeriod = (r: any) => ({ id: r.id, label: r.label, from: r.date_from, to: r.date_to, status: r.status, stage: r.stage ?? 0, history: r.history ?? [] });
const mapRecord = (r: any) => ({ id: r.id, empId: r.emp_id, periodId: r.period_id, daysWorked: num(r.days_worked), overtimeHrs: String(r.overtime_hrs ?? 0), basic: num(r.basic), overtime: num(r.overtime), holiday: num(r.holiday), nightDiff: num(r.night_diff), allowances: num(r.allowances), bonus: num(r.bonus), gross: num(r.gross), sss: num(r.sss), philhealth: num(r.philhealth), pagibig: num(r.pagibig), tax: num(r.tax), loans: num(r.loans), absences: num(r.absences), lates: num(r.lates), totalDed: num(r.total_ded), net: num(r.net), status: r.status });
const mapCompany = (r: any) => r ? ({ name: r.name, logo: r.logo ?? '', address: r.address, contact: r.contact, email: r.email, payrollFrequency: r.payroll_frequency, payrollDates: r.payroll_dates, gracePeriod: num(r.grace_period, 10), lateRule: r.late_rule, undertimeRule: r.undertime_rule, overtimeRule: r.overtime_rule, deductionRules: r.deduction_rules ?? [], workflows: r.workflows ?? [], payrollConfig: (r as any).payroll_config ?? undefined }) : null;

// ---- app -> snake ----
const unmapEmployee = (e: any) => ({ id: e.id, code: e.code, name: e.name, dob: emptyToNull(e.dob), gender: e.gender || null, civil_status: e.civilStatus || null, nationality: e.nationality || null, address: e.address, contact: e.contact, email: e.email, personal_email: e.personalEmail || null, personal_mobile: e.personalMobile || null, emergency_name: e.emergencyName || null, emergency_relation: e.emergencyRelation || null, emergency_phone: e.emergencyPhone || null, dept: e.dept, position: e.position, supervisor: e.supervisor || null, work_location: e.workLocation || null, type: e.type, status: e.status, hired: emptyToNull(e.hired), regularization_date: emptyToNull(e.regularizationDate), resignation_date: emptyToNull(e.resignationDate), termination_date: emptyToNull(e.terminationDate), salary_type: e.salaryType, pay_frequency: e.payFrequency || null, salary: e.salary, schedule: e.schedule, allowances: e.allowances, benefits: e.benefits || null, sss: e.sss || null, philhealth: e.philhealth || null, pagibig: e.pagibig || null, tin: e.tin || null, bank: e.bank, bank_account: e.bankAccount || null, bank_account_name: e.bankAccountName || null, payment_method: e.paymentMethod || null });
const unmapAttendance = (a: any) => ({ id: a.id, emp_id: a.empId, date: a.date, time_in: a.timeIn, time_out: a.timeOut, hours: a.hours, late: a.late, overtime: a.overtime, status: a.status });
const unmapLeave = (l: any) => ({ id: l.id, emp_id: l.empId, type_id: l.typeId, start: emptyToNull(l.start), end: emptyToNull(l.end), days: l.days, reason: l.reason, status: l.status, doc: l.doc, stage: l.stage ?? 0, history: l.history ?? [] });

export async function pullDatabase() {
  if (!isSupabaseConfigured || !supabase) return null;
  const [dep, pos, sch, hol, lt, usr, emp, att, lv, pp, pr, not, act, comp, doc, sh, eh, ot, cr, jo, ap, iv, of, obT, ob, off, hr, an, ln, ex, go, rv, sk, tr, trr] = await Promise.all([
    supabase.from('departments').select('*').order('id'),
    supabase.from('positions').select('*').order('id'),
    supabase.from('schedules').select('*').order('id'),
    supabase.from('holidays').select('*').order('id'),
    supabase.from('leave_types').select('*').order('id'),
    supabase.from('users').select('*').order('id'),
    supabase.from('employees').select('*').order('id'),
    supabase.from('attendance').select('*').order('date', { ascending: true }).limit(5000),
    supabase.from('leave_requests').select('*').order('id'),
    supabase.from('payroll_periods').select('*').order('id'),
    supabase.from('payroll_records').select('*').order('id'),
    supabase.from('notifications').select('*').order('id'),
    supabase.from('activity').select('*').order('id'),
    supabase.from('company').select('*').eq('id', 1).maybeSingle(),
    supabase.from('employee_documents').select('*').order('id'),
    supabase.from('salary_history').select('*').order('id'),
    supabase.from('employment_history').select('*').order('id'),
    supabase.from('overtime_requests').select('*').order('id'),
    supabase.from('correction_requests').select('*').order('id'),
    supabase.from('job_openings').select('*').order('id'),
    supabase.from('applicants').select('*').order('id'),
    supabase.from('interviews').select('*').order('id'),
    supabase.from('job_offers').select('*').order('id'),
    supabase.from('onboarding_templates').select('*').order('id'),
    supabase.from('onboarding').select('*').order('id'),
    supabase.from('offboarding').select('*').order('id'),
    supabase.from('hr_requests').select('*').order('id'),
    supabase.from('announcements').select('*').order('id'),
    supabase.from('loans').select('*').order('id'),
    supabase.from('expenses').select('*').order('id'),
    supabase.from('goals').select('*').order('id'),
    supabase.from('reviews').select('*').order('id'),
    supabase.from('skills').select('*').order('id'),
    supabase.from('trainings').select('*').order('id'),
    supabase.from('training_records').select('*').order('id'),
  ]);
  const errs = [dep, pos, sch, hol, lt, usr, emp, att, lv, pp, pr, not, act, comp].filter(r => (r as any).error);
  if (errs.length) throw new Error((errs[0] as any).error.message);
  if (!emp.data?.length && !usr.data?.length) return null; // nothing seeded yet
  const db = {
    company: mapCompany((comp as any).data) ?? undefined,
    departments: dep.data ?? [],
    positions: pos.data ?? [],
    schedules: (sch.data ?? []).map(mapSchedule),
    holidays: hol.data ?? [],
    leaveTypes: lt.data ?? [],
    users: (usr.data ?? []).map((u: any) => ({ id: u.id, name: u.name, email: u.email, role: u.role, pass: u.pass ?? '' })),
    employees: (emp.data ?? []).map(mapEmployee),
    attendance: (att.data ?? []).map(mapAttendance),
    leaveRequests: (lv.data ?? []).map(mapLeave),
    payrollPeriods: (pp.data ?? []).map(mapPeriod),
    payrollRecords: (pr.data ?? []).map(mapRecord),
    notifications: not.data ?? [],
    activity: act.data ?? [],
    documents: (doc as any).data ?? [],
    salaryHistory: ((sh as any).data ?? []).map((s: any) => ({ id: s.id, empId: s.emp_id, date: s.date, oldSalary: Number(s.old_salary), newSalary: Number(s.new_salary), reason: s.reason, by: s.changed_by })),
    statusHistory: ((eh as any).data ?? []).map((s: any) => ({ id: s.id, empId: s.emp_id, date: s.date, oldStatus: s.old_status, newStatus: s.new_status, reason: s.reason, by: s.changed_by })),
    overtimeRequests: ((ot as any).data ?? []).map(mapOvertime),
    correctionRequests: ((cr as any).data ?? []).map(mapCorrection),
    jobOpenings: ((jo as any).data ?? []).map((j: any) => ({ id: j.id, title: j.title, dept: j.dept, position: j.position, type: j.type, location: j.location, salaryMin: Number(j.salary_min ?? 0), salaryMax: Number(j.salary_max ?? 0), description: j.description ?? '', requirements: j.requirements ?? '', openings: Number(j.openings ?? 1), status: j.status, created: j.created })),
    applicants: ((ap as any).data ?? []).map((a: any) => ({ id: a.id, name: a.name, email: a.email ?? '', phone: a.phone ?? '', openingId: a.opening_id, source: a.source ?? '', status: a.status, notes: a.notes ?? '', resume: a.resume ?? '', appliedDate: a.applied_date ?? '', history: a.history ?? [], doc: a.doc ?? '' })),
    interviews: ((iv as any).data ?? []).map((v: any) => ({ id: v.id, applicantId: v.applicant_id, interviewer: v.interviewer ?? '', date: v.date ?? '', time: v.time ?? '', type: v.type ?? '', result: v.result ?? 'Pending', notes: v.notes ?? '', rating: Number(v.rating ?? 0) })),
    offers: ((of as any).data ?? []).map((o: any) => ({ id: o.id, applicantId: o.applicant_id, salary: Number(o.salary ?? 0), startDate: o.start_date ?? '', type: o.type ?? '', status: o.status, details: o.details ?? '', stage: o.stage ?? 0, history: o.history ?? [] })),
    onboardingTemplates: ((obT as any).data ?? []).map((t: any) => ({ id: t.id, name: t.name, items: t.items ?? [] })),
    onboarding: ((ob as any).data ?? []).map((o: any) => ({ id: o.id, applicantId: o.applicant_id, empId: o.emp_id, empName: o.emp_name ?? '', template: o.template ?? '', checklist: o.checklist ?? [], status: o.status, started: o.started ?? '', completed: o.completed ?? '' })),
    offboarding: ((off as any).data ?? []).map((o: any) => ({ id: o.id, empId: o.emp_id, empName: o.emp_name ?? '', type: o.type ?? '', lastDay: o.last_day ?? '', clearance: o.clearance ?? [], status: o.status, exitInterview: o.exit_interview ?? '', started: o.started ?? '' })),
    hrRequests: ((hr as any).data ?? []).map((r: any) => ({ id: r.id, empId: r.emp_id, empName: r.emp_name ?? '', type: r.type ?? '', details: r.details ?? '', status: r.status, stage: r.stage ?? 0, history: r.history ?? [], created: r.created ?? '' })),
    announcements: ((an as any).data ?? []),
    loans: ((ln as any).data ?? []).map((l: any) => ({ id: l.id, empId: l.emp_id, empName: l.emp_name ?? '', type: l.type ?? '', amount: Number(l.amount ?? 0), installments: Number(l.installments ?? 1), deductedPerPay: Number(l.deducted_per_pay ?? 0), remaining: Number(l.remaining ?? 0), paid: Number(l.paid ?? 0), startDate: l.start_date ?? '', status: l.status, stage: l.stage ?? 0, history: l.history ?? [], reason: l.reason ?? '' })),
    expenses: ((ex as any).data ?? []).map((e: any) => ({ id: e.id, empId: e.emp_id, empName: e.emp_name ?? '', category: e.category ?? '', amount: Number(e.amount ?? 0), date: e.date ?? '', receipt: e.receipt ?? '', description: e.description ?? '', status: e.status, stage: e.stage ?? 0, history: e.history ?? [] })),
    goals: ((go as any).data ?? []).map((g: any) => ({ id: g.id, empId: g.emp_id, title: g.title ?? '', kpi: g.kpi ?? '', target: g.target ?? '', due: g.due ?? '', weight: Number(g.weight ?? 1), progress: Number(g.progress ?? 0), status: g.status })),
    reviews: ((rv as any).data ?? []).map((r: any) => ({ id: r.id, empId: r.emp_id, cycle: r.cycle ?? '', type: r.type ?? '', rating: Number(r.rating ?? 0), comments: r.comments ?? '', status: r.status, reviewer: r.reviewer ?? '', history: r.history ?? [] })),
    skills: ((sk as any).data ?? []).map((s: any) => ({ id: s.id, empId: s.emp_id, skill: s.skill ?? '', level: s.level ?? '', certified: !!s.certified })),
    trainings: ((tr as any).data ?? []).map((t: any) => ({ id: t.id, title: t.title ?? '', trainer: t.trainer ?? '', dates: t.dates ?? '', participants: t.participants ?? [], status: t.status })),
    trainingRecords: ((trr as any).data ?? []).map((r: any) => ({ id: r.id, programId: r.program_id, empId: r.emp_id, attended: !!r.attended, certificate: r.certificate ?? '', date: r.date ?? '' })),
  };
  saveDB(db as any);
  return db;
}

async function upsert(table: string, rows: any[]) {
  if (!rows.length) return;
  const { error } = await supabase!.from(table).upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`${table}: ${error.message}`);
}

/** Push local mock seed to empty Supabase (idempotent upserts). */
export async function seedDatabase(seed: any) {
  if (!isSupabaseConfigured || !supabase) return;
  await upsert('departments', (seed.departments ?? []).map((d: any) => ({ id: d.id, name: d.name })));
  await upsert('positions', (seed.positions ?? []).map((p: any) => ({ id: p.id, name: p.name, dept: p.dept })));
  await upsert('schedules', (seed.schedules ?? []).map((s: any) => ({ id: s.id, name: s.name, days: s.days, time_from: s.from, time_to: s.to, break_time: s.break, schedule_type: s.type, rest_day: s.restDay })));
  await upsert('holidays', (seed.holidays ?? []).map((h: any) => ({ id: h.id, name: h.name, date: h.date, type: h.type })));
  await upsert('leave_types', (seed.leaveTypes ?? []).map((t: any) => ({ id: t.id, name: t.name, credits: t.credits })));
  await upsert('users', (seed.users ?? []).map((u: any) => ({ id: u.id, name: u.name, email: u.email, role: u.role, pass: u.pass })));
  await upsert('employees', (seed.employees ?? []).map(unmapEmployee));
  await upsert('payroll_periods', (seed.payrollPeriods ?? []).map((p: any) => ({ id: p.id, label: p.label, date_from: p.from, date_to: p.to, status: p.status, stage: p.stage ?? 0, history: p.history ?? [] })));
  if (seed.company) {
    const c = seed.company;
    await upsert('company', [{ id: 1, name: c.name, logo: c.logo, address: c.address, contact: c.contact, email: c.email, payroll_frequency: c.payrollFrequency, payroll_dates: c.payrollDates, grace_period: c.gracePeriod, late_rule: c.lateRule, undertime_rule: c.undertimeRule, overtime_rule: c.overtimeRule, deduction_rules: c.deductionRules, workflows: c.workflows ?? [], payroll_config: (c as any).payrollConfig ?? null }]);
  }
  await upsert('attendance', (seed.attendance ?? []).map(unmapAttendance));
  await upsert('leave_requests', (seed.leaveRequests ?? []).map(unmapLeave));
  await upsert('payroll_records', (seed.payrollRecords ?? []).map((r: any) => ({ id: r.id, emp_id: r.empId, period_id: r.periodId, days_worked: r.daysWorked, overtime_hrs: r.overtimeHrs, basic: r.basic, overtime: r.overtime, holiday: r.holiday, night_diff: r.nightDiff, allowances: r.allowances, bonus: r.bonus, gross: r.gross, sss: r.sss, philhealth: r.philhealth, pagibig: r.pagibig, tax: r.tax, loans: r.loans, absences: r.absences, lates: r.lates, total_ded: r.totalDed, net: r.net, status: r.status })));
  await upsert('notifications', seed.notifications ?? []);
  await upsert('activity', (seed.activity ?? []).map((a: any, i: number) => ({ id: i + 1, ...a })));
  await upsert('employee_documents', (seed.documents ?? []).map((d: any) => ({ id: d.id, emp_id: d.empId, name: d.name, category: d.category, file: d.file, expiry: d.expiry || null, status: d.status })));
  await upsert('salary_history', (seed.salaryHistory ?? []).map((s: any) => ({ id: s.id, emp_id: s.empId, date: s.date, old_salary: s.oldSalary, new_salary: s.newSalary, reason: s.reason, changed_by: s.by })));
  await upsert('employment_history', (seed.statusHistory ?? []).map((s: any) => ({ id: s.id, emp_id: s.empId, date: s.date, old_status: s.oldStatus, new_status: s.newStatus, reason: s.reason, changed_by: s.by })));
  await upsert('overtime_requests', (seed.overtimeRequests ?? []).map(unmapOvertime));
  await upsert('correction_requests', (seed.correctionRequests ?? []).map(unmapCorrection));
  await upsert('job_openings', (seed.jobOpenings ?? []).map((j: any) => ({ id: j.id, title: j.title, dept: j.dept, position: j.position, type: j.type, location: j.location, salary_min: j.salaryMin, salary_max: j.salaryMax, description: j.description, requirements: j.requirements, openings: j.openings, status: j.status, created: j.created })));
  await upsert('applicants', (seed.applicants ?? []).map((a: any) => ({ id: a.id, name: a.name, email: a.email, phone: a.phone, opening_id: a.openingId, source: a.source, status: a.status, notes: a.notes, resume: a.resume, applied_date: a.appliedDate, history: a.history ?? [], doc: a.doc })));
  await upsert('interviews', (seed.interviews ?? []).map((v: any) => ({ id: v.id, applicant_id: v.applicantId, interviewer: v.interviewer, date: v.date, time: v.time, type: v.type, result: v.result, notes: v.notes, rating: v.rating })));
  await upsert('job_offers', (seed.offers ?? []).map((o: any) => ({ id: o.id, applicant_id: o.applicantId, salary: o.salary, start_date: o.startDate, type: o.type, status: o.status, details: o.details, stage: o.stage ?? 0, history: o.history ?? [] })));
  await upsert('onboarding_templates', (seed.onboardingTemplates ?? []).map((t: any) => ({ id: t.id, name: t.name, items: t.items })));
  await upsert('onboarding', (seed.onboarding ?? []).map((o: any) => ({ id: o.id, applicant_id: o.applicantId, emp_id: o.empId, emp_name: o.empName, template: o.template, checklist: o.checklist, status: o.status, started: o.started, completed: o.completed })));
  await upsert('offboarding', (seed.offboarding ?? []).map((o: any) => ({ id: o.id, emp_id: o.empId, emp_name: o.empName, type: o.type, last_day: o.lastDay, clearance: o.clearance, status: o.status, exit_interview: o.exitInterview, started: o.started })));
  await upsert('hr_requests', (seed.hrRequests ?? []).map((r: any) => ({ id: r.id, emp_id: r.empId, emp_name: r.empName, type: r.type, details: r.details, status: r.status, stage: r.stage ?? 0, history: r.history ?? [], created: r.created })));
  await upsert('announcements', seed.announcements ?? []);
  await upsert('loans', (seed.loans ?? []).map((l: any) => ({ id: l.id, emp_id: l.empId, emp_name: l.empName, type: l.type, amount: l.amount, installments: l.installments, deducted_per_pay: l.deductedPerPay, remaining: l.remaining, paid: l.paid ?? 0, start_date: l.startDate, status: l.status, stage: l.stage ?? 0, history: l.history ?? [], reason: l.reason })));
  await upsert('expenses', (seed.expenses ?? []).map((e: any) => ({ id: e.id, emp_id: e.empId, emp_name: e.empName, category: e.category, amount: e.amount, date: e.date, receipt: e.receipt, description: e.description, status: e.status, stage: e.stage ?? 0, history: e.history ?? [] })));
  await upsert('goals', (seed.goals ?? []).map((g: any) => ({ id: g.id, emp_id: g.empId, title: g.title, kpi: g.kpi, target: g.target, due: g.due, weight: g.weight, progress: g.progress, status: g.status })));
  await upsert('reviews', (seed.reviews ?? []).map((r: any) => ({ id: r.id, emp_id: r.empId, cycle: r.cycle, type: r.type, rating: r.rating, comments: r.comments, status: r.status, reviewer: r.reviewer, history: r.history ?? [] })));
  await upsert('skills', (seed.skills ?? []).map((s: any) => ({ id: s.id, emp_id: s.empId, skill: s.skill, level: s.level, certified: s.certified })));
  await upsert('trainings', (seed.trainings ?? []).map((t: any) => ({ id: t.id, title: t.title, trainer: t.trainer, dates: t.dates, participants: t.participants ?? [], status: t.status })));
  await upsert('training_records', (seed.trainingRecords ?? []).map((r: any) => ({ id: r.id, program_id: r.programId, emp_id: r.empId, attended: r.attended, certificate: r.certificate, date: r.date })));
}

/** Fire-and-forget write-through for offline-first pages. */
export function pushRow(table: 'employees' | 'attendance' | 'leave_requests' | 'overtime_requests' | 'correction_requests' | 'payroll_periods' | 'payroll_records' | 'company' | 'job_openings' | 'applicants' | 'interviews' | 'job_offers' | 'onboarding_templates' | 'onboarding' | 'offboarding' | 'hr_requests' | 'announcements' | 'loans' | 'expenses' | 'employee_documents' | 'goals' | 'reviews' | 'skills' | 'trainings' | 'training_records', row: any) {
  if (!isSupabaseConfigured || !supabase) return;
  const payload = table === 'employees' ? unmapEmployee(row)
    : table === 'attendance' ? unmapAttendance(row)
    : table === 'overtime_requests' ? unmapOvertime(row)
    : table === 'correction_requests' ? unmapCorrection(row)
    : table === 'payroll_periods' ? ({ id: row.id, label: row.label, date_from: row.from, date_to: row.to, status: row.status, stage: row.stage ?? 0, history: row.history ?? [] })
    : table === 'payroll_records' ? ({ id: row.id, emp_id: row.empId, period_id: row.periodId, days_worked: row.daysWorked, overtime_hrs: row.overtimeHrs, basic: row.basic, overtime: row.overtime, holiday: row.holiday, night_diff: row.nightDiff, allowances: row.allowances, bonus: row.bonus, gross: row.gross, sss: row.sss, philhealth: row.philhealth, pagibig: row.pagibig, tax: row.tax, loans: row.loans, absences: row.absences, lates: row.lates, total_ded: row.totalDed, net: row.net, status: row.status })
    : table === 'company' ? ({ id: 1, payroll_config: (row as any).payrollConfig ?? null })
    : table === 'job_openings' ? ({ id: row.id, title: row.title, dept: row.dept, position: row.position, type: row.type, location: row.location, salary_min: row.salaryMin, salary_max: row.salaryMax, description: row.description, requirements: row.requirements, openings: row.openings, status: row.status, created: row.created })
    : table === 'applicants' ? ({ id: row.id, name: row.name, email: row.email, phone: row.phone, opening_id: row.openingId, source: row.source, status: row.status, notes: row.notes, resume: row.resume, applied_date: row.appliedDate, history: row.history ?? [], doc: row.doc })
    : table === 'interviews' ? ({ id: row.id, applicant_id: row.applicantId, interviewer: row.interviewer, date: row.date, time: row.time, type: row.type, result: row.result, notes: row.notes, rating: row.rating })
    : table === 'job_offers' ? ({ id: row.id, applicant_id: row.applicantId, salary: row.salary, start_date: row.startDate, type: row.type, status: row.status, details: row.details, stage: row.stage ?? 0, history: row.history ?? [] })
    : table === 'onboarding_templates' ? ({ id: row.id, name: row.name, items: row.items })
    : table === 'onboarding' ? ({ id: row.id, applicant_id: row.applicantId, emp_id: row.empId, emp_name: row.empName, template: row.template, checklist: row.checklist, status: row.status, started: row.started, completed: row.completed })
    : table === 'offboarding' ? ({ id: row.id, emp_id: row.empId, emp_name: row.empName, type: row.type, last_day: row.lastDay, clearance: row.clearance, status: row.status, exit_interview: row.exitInterview, started: row.started })
    : table === 'hr_requests' ? ({ id: row.id, emp_id: row.empId, emp_name: row.empName, type: row.type, details: row.details, status: row.status, stage: row.stage ?? 0, history: row.history ?? [], created: row.created })
    : table === 'announcements' ? ({ ...row })
    : table === 'loans' ? ({ id: row.id, emp_id: row.empId, emp_name: row.empName, type: row.type, amount: row.amount, installments: row.installments, deducted_per_pay: row.deductedPerPay, remaining: row.remaining, paid: row.paid ?? 0, start_date: row.startDate, status: row.status, stage: row.stage ?? 0, history: row.history ?? [], reason: row.reason })
    : table === 'expenses' ? ({ id: row.id, emp_id: row.empId, emp_name: row.empName, category: row.category, amount: row.amount, date: row.date, receipt: row.receipt, description: row.description, status: row.status, stage: row.stage ?? 0, history: row.history ?? [] })
    : table === 'employee_documents' ? ({ id: row.id, emp_id: row.empId, name: row.name, category: row.category, file: row.file, expiry: row.expiry || null, status: row.status })
    : table === 'goals' ? ({ id: row.id, emp_id: row.empId, title: row.title, kpi: row.kpi, target: row.target, due: row.due, weight: row.weight, progress: row.progress, status: row.status })
    : table === 'reviews' ? ({ id: row.id, emp_id: row.empId, cycle: row.cycle, type: row.type, rating: row.rating, comments: row.comments, status: row.status, reviewer: row.reviewer, history: row.history ?? [] })
    : table === 'skills' ? ({ id: row.id, emp_id: row.empId, skill: row.skill, level: row.level, certified: row.certified })
    : table === 'trainings' ? ({ id: row.id, title: row.title, trainer: row.trainer, dates: row.dates, participants: row.participants ?? [], status: row.status })
    : table === 'training_records' ? ({ id: row.id, program_id: row.programId, emp_id: row.empId, attended: row.attended, certificate: row.certificate, date: row.date })
    : unmapLeave(row);
  (supabase as any).from(table).upsert(payload, { onConflict: 'id' }).then(({ error }: any) => {
    if (error) console.warn('[supabase push]', table, error.message);
  });
}
