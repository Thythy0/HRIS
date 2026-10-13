import { getDB, saveDB } from '../data/mock';
import { pushRow } from './sync';
import { logAudit } from './audit';

/** Reusable approval workflow engine. Chains live in company.workflows so HR can reconfigure without code changes. */
export interface Step { role: string; label: string }
export interface Chain { type: string; steps: Step[] }

export const WORKFLOW_TYPES = ['leave', 'overtime', 'attendance_correction', 'payroll', 'recruitment', 'expense', 'hr_request', 'loan'] as const;

export function defaultWorkflows(): Chain[] {
  return [
    { type: 'leave', steps: [{ role: 'Manager', label: 'Supervisor review' }, { role: 'HR/Admin', label: 'HR approval' }] },
    { type: 'overtime', steps: [{ role: 'Manager', label: 'Supervisor review' }, { role: 'HR/Admin', label: 'HR approval' }] },
    { type: 'attendance_correction', steps: [{ role: 'Manager', label: 'Supervisor review' }, { role: 'HR/Admin', label: 'HR approval' }] },
    { type: 'payroll', steps: [{ role: 'Payroll Officer', label: 'Prepared' }, { role: 'HR/Admin', label: 'HR review' }, { role: 'Super Admin', label: 'Final approval' }] },
    { type: 'recruitment', steps: [{ role: 'HR/Admin', label: 'HR screening' }, { role: 'Manager', label: 'Hiring manager' }] },
    { type: 'expense', steps: [{ role: 'Manager', label: 'Supervisor review' }, { role: 'Finance', label: 'Finance approval' }] },
    { type: 'hr_request', steps: [{ role: 'Manager', label: 'Supervisor review' }, { role: 'HR/Admin', label: 'HR approval' }] },
    { type: 'loan', steps: [{ role: 'Manager', label: 'Supervisor review' }, { role: 'HR/Admin', label: 'HR approval' }] },
  ];
}

export function getChain(type: string): Chain {
  const custom = (getDB().company as any)?.workflows as Chain[] | undefined;
  return custom?.find(c => c.type === type) ?? defaultWorkflows().find(c => c.type === type)!;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Which step index is currently waiting. -1 = fully approved. */
export function pendingStep(req: any, chain: Chain): number {
  if (req.status === 'Approved') return -1;
  if (req.status === 'Rejected' || req.status === 'Cancelled' || req.status === 'Returned') return -2;
  return typeof req.stage === 'number' ? req.stage : 0;
}

/** Can this user act on the request right now? Super Admin can act at any step. */
export function canActOn(user: any, req: any, chain: Chain): boolean {
  if (!user || req.status !== 'Pending') return false;
  const step = pendingStep(req, chain);
  if (step < 0) return false;
  if (user.role === 'Super Admin') return true;
  // Requester cannot approve their own request at step 0 unless they hold the step role AND are not the requester
  const stepRole = chain.steps[step]?.role;
  if (req.empName && req.empName === user.name && step === 0 && chain.steps.length > 1) {
    // allow only if no one else can (self-approval blocked) — fall through to role check but exclude requester
    if (user.name === req.empName) return false;
  }
  if (user.role === stepRole) return true;
  // HR/Admin covers HR steps; Manager covers Supervisor steps
  if (stepRole === 'HR/Admin' && user.role === 'HR/Admin') return true;
  return false;
}

export function stepLabel(req: any, chain: Chain): string {
  const step = pendingStep(req, chain);
  if (step === -1) return 'Approved';
  if (step === -2) return req.status;
  return `Waiting: ${chain.steps[step]?.label ?? 'review'} (${chain.steps[step]?.role})`;
}

/**
 * Advance any staged request (leave, overtime, …): 'approve' moves to next step or final Approved;
 * 'reject' ends as Rejected; 'return' sends back to requester as Returned.
 */
function decideOn(collection: 'leaveRequests' | 'overtimeRequests' | 'correctionRequests' | 'offers' | 'hrRequests' | 'loans' | 'expenses', type: string, id: number, decision: 'approve' | 'reject' | 'return', comment: string, user: any) {
  const module = type === 'leave' ? 'Leave' : type === 'overtime' ? 'Overtime' : type === 'offer' ? 'Recruitment' : type === 'hr_request' ? 'HR Request' : type === 'loan' ? 'Loans' : type === 'expense' ? 'Expense' : 'Attendance';
  const d = getDB();
  const l = (d[collection] ?? []).find((x: any) => x.id === id);
  if (!l || l.status !== 'Pending') return false;
  const chain = getChain(type === 'offer' ? 'recruitment' : type);
  const step = pendingStep(l, chain);
  l.history = l.history ?? [];
  l.history.push({ by: user?.name ?? '?', role: user?.role ?? '?', decision, comment, date: today(), step });
  if (decision === 'reject') l.status = 'Rejected';
  else if (decision === 'return') { l.status = 'Returned'; l.stage = 0; }
  else {
    if (step >= chain.steps.length - 1) {
      l.status = 'Approved'; l.stage = chain.steps.length;
      if (type === 'loan') l.status = 'Active';
    }
    else l.stage = step + 1;
  }
  saveDB(d);
  pushRow(collection === 'leaveRequests' ? 'leave_requests' : collection === 'overtimeRequests' ? 'overtime_requests' : collection === 'offers' ? 'job_offers' as any : collection === 'hrRequests' ? 'hr_requests' as any : collection === 'loans' ? 'loans' as any : collection === 'expenses' ? 'expenses' as any : 'correction_requests', l);
  logAudit(`${type} ${l.status.toLowerCase()}`, module, `#${l.id} · ${l.reason ?? l.details ?? l.title ?? ''}`, comment);
  if (type === 'correction' && l.status === 'Approved') applyCorrection(l);
  return true;
}

function parseClock(t: string): Date | null {
  if (!t || t === '—') return null;
  const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return null;
  let h = +m[1]; const min = +m[2]; const ap = (m[3] || '').toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  const d = new Date(); d.setHours(h, min, 0, 0);
  return d;
}

/** Apply an approved correction to the attendance record (creates it if missing). */
function applyCorrection(c: any) {
  const d = getDB();
  let rec = d.attendance.find((a: any) => a.empId === c.empId && a.date === c.date);
  if (!rec) {
    rec = { id: Date.now(), empId: c.empId, date: c.date, timeIn: '—', timeOut: '—', hours: 0, late: 0, overtime: 0, status: 'Present' };
    d.attendance.push(rec);
  }
  if (c.field === 'timeIn') {
    rec.timeIn = c.requestedTime;
    const mins = parseClock(c.requestedTime);
    const late = mins ? Math.max(0, Math.round((mins.getTime() - +new Date(c.date + 'T08:00:00')) / 60000) - 10) : 0;
    rec.late = late;
    rec.status = late > 0 ? 'Late' : 'Present';
  } else {
    rec.timeOut = c.requestedTime;
    const start = parseClock(rec.timeIn)?.getTime();
    const end = parseClock(c.requestedTime)?.getTime();
    rec.hours = start && end && end > start ? Math.round(((end - start) / 3600000) * 100) / 100 : rec.hours;
  }
  saveDB(d);
  pushRow('attendance', rec);
  logAudit('Attendance corrected', 'Attendance', `${c.date} · ${c.field} → ${c.requestedTime}`);
}

export function decideLeave(id: number, decision: 'approve' | 'reject' | 'return', comment: string, user: any) {
  return decideOn('leaveRequests', 'leave', id, decision, comment, user);
}

export function decideOvertime(id: number, decision: 'approve' | 'reject' | 'return', comment: string, user: any) {
  return decideOn('overtimeRequests', 'overtime', id, decision, comment, user);
}

export function decideCorrection(id: number, decision: 'approve' | 'reject' | 'return', comment: string, user: any) {
  return decideOn('correctionRequests', 'correction', id, decision, comment, user);
}

export function decideOffer(id: number, decision: 'approve' | 'reject' | 'return', comment: string, user: any) {
  return decideOn('offers', 'offer', id, decision, comment, user);
}

export function decideHrRequest(id: number, decision: 'approve' | 'reject' | 'return', comment: string, user: any) {
  return decideOn('hrRequests', 'hr_request', id, decision, comment, user);
}

export function decideLoan(id: number, decision: 'approve' | 'reject' | 'return', comment: string, user: any) {
  return decideOn('loans', 'loan', id, decision, comment, user);
}

export function decideExpense(id: number, decision: 'approve' | 'reject' | 'return', comment: string, user: any) {
  return decideOn('expenses', 'expense', id, decision, comment, user);
}

export function submitPayrollPeriod(periodId: number, user: any): boolean {
  const d = getDB();
  const p = (d.payrollPeriods ?? []).find((x: any) => x.id === periodId);
  if (!p || p.status === 'Paid' || p.status === 'Locked' || p.status === 'Approved') return false;
  p.status = 'Pending';
  p.stage = 0;
  p.history = p.history ?? [];
  p.history.push({ by: user?.name ?? '?', role: user?.role ?? '?', decision: 'submit', comment: '', date: today(), step: -1 });
  saveDB(d);
  pushRow('payroll_periods' as any, p);
  logAudit('Payroll submitted', 'Payroll', `${p.label}`);
  return true;
}

export function decidePayrollPeriod(periodId: number, decision: 'approve' | 'reject' | 'return', comment: string, user: any): boolean {
  const d = getDB();
  const p = (d.payrollPeriods ?? []).find((x: any) => x.id === periodId);
  if (!p || (p.status !== 'Pending' && p.status !== 'Processing')) return false;
  const chain = getChain('payroll');
  const step = typeof p.stage === 'number' ? p.stage : 0;
  // role gate: reuse canActOn with a pseudo request
  const pseudo = { status: 'Pending', stage: step, empName: '' };
  if (!canActOn(user, pseudo, chain)) return false;
  p.history = p.history ?? [];
  p.history.push({ by: user?.name ?? '?', role: user?.role ?? '?', decision, comment, date: today(), step });
  if (decision === 'reject') { p.status = 'Processing'; p.stage = 0; }
  else if (decision === 'return') { p.status = 'Processing'; p.stage = 0; }
  else {
    if (step >= chain.steps.length - 1) {
      p.status = 'Approved'; p.stage = chain.steps.length;
      (d.payrollRecords ?? []).filter((r: any) => r.periodId === periodId).forEach((r: any) => { r.status = 'Approved'; });
    } else { p.status = 'Pending'; p.stage = step + 1; }
  }
  saveDB(d);
  pushRow('payroll_periods' as any, p);
  logAudit(`Payroll ${p.status.toLowerCase()}`, 'Payroll', `${p.label}`, comment);
  return true;
}

export function markPayrollPaid(periodId: number): boolean {
  const d = getDB();
  const p = (d.payrollPeriods ?? []).find((x: any) => x.id === periodId);
  if (!p || p.status !== 'Approved') return false;
  p.status = 'Paid';
  (d.payrollRecords ?? []).filter((r: any) => r.periodId === periodId).forEach((r: any) => { r.status = 'Paid'; });
  saveDB(d);
  pushRow('payroll_periods' as any, p);
  logAudit('Payroll paid', 'Payroll', `${p.label}`);
  return true;
}
