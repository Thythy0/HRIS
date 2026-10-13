import { getDB, saveDB } from '../data/mock';
import { pushRow } from './sync';
import { logAudit } from './audit';

/** Phase 3 — Recruitment → Onboarding → Offboarding. Offline-first collections in localStorage, mirrored to Supabase. */

export const APPLICANT_STAGES = ['Applied', 'Screening', 'Interview', 'Assessment', 'Final Interview', 'Offer', 'Hired', 'Rejected'] as const;

export const DEFAULT_ONBOARDING_ITEMS = [
  'Employment contract', 'Government IDs', 'Bank information', 'Employee profile',
  'Company orientation', 'Policy acknowledgment', 'Equipment assignment',
  'Email/account creation', 'Department orientation', 'Manager assignment',
];

export const DEFAULT_OFFBOARDING_ITEMS = [
  'Resignation documentation', 'Exit interview', 'Equipment return', 'Access removal',
  'Clearance', 'Final payroll', 'Certificate of Employment', 'Account deactivation',
];

const today = () => new Date().toISOString().slice(0, 10);

export function openingTitle(db: any, id: number): string {
  return (db.jobOpenings ?? []).find((j: any) => j.id === id)?.title ?? '—';
}

export function applicantProgress(status: string): number {
  const i = APPLICANT_STAGES.indexOf(status as any);
  if (status === 'Rejected') return 100;
  if (status === 'Hired') return 100;
  return i < 0 ? 0 : Math.round(((i + 1) / 7) * 100);
}

export function checklistProgress(list: { done: boolean }[]): number {
  if (!list.length) return 0;
  return Math.round((list.filter(x => x.done).length / list.length) * 100);
}

export function moveApplicant(id: number, to: string, user: any, note = ''): boolean {
  const d = getDB();
  const a = (d.applicants ?? []).find((x: any) => x.id === id);
  if (!a) return false;
  if (!(APPLICANT_STAGES as readonly string[]).includes(to)) return false;
  const from = a.status;
  a.status = to;
  a.history = a.history ?? [];
  a.history.push({ by: user?.name ?? '?', from, to, note, date: today() });
  saveDB(d);
  pushRow('applicants' as any, a);
  logAudit('Applicant moved', 'Recruitment', `${a.name} · ${from} → ${to}`, note);
  return true;
}

export function hireApplicant(applicantId: number, user: any): number | null {
  const d = getDB();
  const a = (d.applicants ?? []).find((x: any) => x.id === applicantId);
  if (!a || a.status === 'Hired') return null;
  if ((d.onboarding ?? []).some((o: any) => o.applicantId === applicantId)) return null;
  const opening = (d.jobOpenings ?? []).find((j: any) => j.id === a.openingId);
  const newId = Math.max(0, ...(d.employees ?? []).map((e: any) => Number(e.id) || 0)) + 1;
  const emp = {
    id: newId, code: `EMP-${String(newId).padStart(3, '0')}`, name: a.name,
    dob: '', gender: '', civilStatus: '', nationality: 'Filipino', address: '', contact: a.phone ?? '',
    email: a.email ?? '', personalEmail: a.email ?? '', personalMobile: a.phone ?? '',
    emergencyName: '', emergencyRelation: '', emergencyPhone: '',
    dept: opening?.dept ?? 1, position: opening?.position ?? 1, supervisor: null, workLocation: opening?.location ?? '',
    type: opening?.type ?? 'Probationary', status: 'Active', hired: today(),
    regularizationDate: '', resignationDate: '', terminationDate: '',
    salaryType: 'Monthly', payFrequency: 'Semi-monthly',
    salary: opening?.salaryMin ?? 25000, schedule: 1, allowances: 0, benefits: '',
    sss: '', philhealth: '', pagibig: '', tin: '', bank: '', bankAccount: '', bankAccountName: a.name, paymentMethod: 'Bank transfer',
  };
  d.employees.push(emp);
  a.status = 'Hired';
  a.history = a.history ?? [];
  a.history.push({ by: user?.name ?? '?', from: 'Offer', to: 'Hired', note: `Employee ${emp.code}`, date: today() });
  // Auto-create onboarding from default template
  const tpl = (d.onboardingTemplates ?? [])[0] ?? { items: DEFAULT_ONBOARDING_ITEMS };
  const items: string[] = Array.isArray(tpl.items) ? tpl.items : DEFAULT_ONBOARDING_ITEMS;
  d.onboarding.push({
    id: Date.now(), applicantId: a.id, empId: emp.id, empName: emp.name,
    template: tpl.name ?? 'Standard employee',
    checklist: items.map((label: string) => ({ label, done: false })),
    status: 'In Progress', started: today(), completed: '',
  });
  saveDB(d);
  pushRow('employees', emp);
  pushRow('applicants' as any, a);
  logAudit('Applicant hired', 'Recruitment', `${a.name} → ${emp.code}`);
  return newId;
}

export function toggleOnboarding(id: number, idx: number): boolean {
  const d = getDB();
  const o = (d.onboarding ?? []).find((x: any) => x.id === id);
  if (!o || !o.checklist[idx]) return false;
  o.checklist[idx].done = !o.checklist[idx].done;
  if (o.checklist.every((c: any) => c.done)) { o.status = 'Completed'; o.completed = today(); }
  else { o.status = 'In Progress'; o.completed = ''; }
  saveDB(d);
  pushRow('onboarding' as any, o);
  return true;
}

export function startOffboarding(empId: number, type: string, lastDay: string): number | null {
  const d = getDB();
  const emp = (d.employees ?? []).find((e: any) => e.id === empId);
  if (!emp) return null;
  if ((d.offboarding ?? []).some((o: any) => o.empId === empId && o.status === 'In Progress')) return null;
  const rec = {
    id: Date.now(), empId, empName: emp.name, type, lastDay,
    clearance: DEFAULT_OFFBOARDING_ITEMS.map(label => ({ label, done: false })),
    status: 'In Progress', exitInterview: '', started: today(),
  };
  d.offboarding.push(rec);
  saveDB(d);
  pushRow('offboarding' as any, rec);
  logAudit('Offboarding started', 'Offboarding', `${emp.name} · ${type}`);
  return rec.id;
}

export function toggleOffboarding(id: number, idx: number): boolean {
  const d = getDB();
  const o = (d.offboarding ?? []).find((x: any) => x.id === id);
  if (!o || !o.clearance[idx]) return false;
  o.clearance[idx].done = !o.clearance[idx].done;
  saveDB(d);
  pushRow('offboarding' as any, o);
  return true;
}

export function completeOffboarding(id: number, user: any): boolean {
  const d = getDB();
  const o = (d.offboarding ?? []).find((x: any) => x.id === id);
  if (!o) return false;
  if (!o.clearance.every((c: any) => c.done)) return false;
  o.status = 'Exited';
  const emp = (d.employees ?? []).find((e: any) => e.id === o.empId);
  if (emp) {
    emp.status = 'Archived';
    if (o.type === 'Resignation') emp.resignationDate = o.lastDay;
    else emp.terminationDate = o.lastDay;
    pushRow('employees', emp);
  }
  saveDB(d);
  pushRow('offboarding' as any, o);
  logAudit('Offboarding completed', 'Offboarding', `${o.empName} · final payroll due`, user?.name ?? '');
  return true;
}
