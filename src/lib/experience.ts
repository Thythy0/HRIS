import { getDB, saveDB } from '../data/mock';
import { pushRow } from './sync';
import { logAudit } from './audit';

/** Phase 4 helpers — HR requests, announcements, loans, expenses, documents. */

export const HR_REQUEST_TYPES = ['Certificate of Employment', 'Certificate of Compensation', 'Employment Verification', 'Document Request', 'HR Question', 'Other'] as const;
export const EXPENSE_CATEGORIES = ['Travel', 'Meals', 'Supplies', 'Training', 'Medical', 'Communication', 'Other'] as const;
export const DOC_CATEGORIES = ['Contracts', 'Government IDs', 'Certificates', 'Policies', 'Performance', 'Payroll', 'Resignation', 'Other'] as const;

export function activeLoansFor(empId: number, db?: any): any[] {
  const d = db ?? getDB();
  return (d.loans ?? []).filter((l: any) => l.empId === empId && l.status === 'Active');
}

export function autoLoanDeduction(empId: number, db?: any): number {
  return activeLoansFor(empId, db).reduce((s: number, l: any) => s + (Number(l.deductedPerPay) || 0), 0);
}

export function recordLoanPayment(id: number, amount: number, user: any): boolean {
  const d = getDB();
  const l = (d.loans ?? []).find((x: any) => x.id === id);
  if (!l || l.status !== 'Active') return false;
  const pay = Math.min(Number(amount) || 0, Number(l.remaining) || 0);
  if (pay <= 0) return false;
  l.remaining = Math.round(((Number(l.remaining) || 0) - pay) * 100) / 100;
  l.paid = Math.round(((Number(l.paid) || 0) + pay) * 100) / 100;
  if (l.remaining <= 0) { l.remaining = 0; l.status = 'Completed'; }
  saveDB(d);
  pushRow('loans' as any, l);
  logAudit('Loan payment posted', 'Loans', `${l.type} #${l.id} · −${pay}`, user?.name ?? '');
  return true;
}

export function markExpensePaid(id: number): boolean {
  const d = getDB();
  const e = (d.expenses ?? []).find((x: any) => x.id === id);
  if (!e || e.status !== 'Approved') return false;
  e.status = 'Paid';
  saveDB(d);
  pushRow('expenses' as any, e);
  logAudit('Expense paid', 'Expense', `#${e.id} · ${e.amount}`);
  return true;
}

export function completeHrRequest(id: number): boolean {
  const d = getDB();
  const r = (d.hrRequests ?? []).find((x: any) => x.id === id);
  if (!r || r.status !== 'Approved') return false;
  r.status = 'Completed';
  saveDB(d);
  pushRow('hr_requests' as any, r);
  logAudit('HR request completed', 'HR Request', `#${r.id} · ${r.type}`);
  return true;
}

export function docsExpiringSoon(db?: any, days = 30): any[] {
  const d = db ?? getDB();
  const now = new Date();
  return (d.documents ?? []).filter((x: any) => {
    if (!x.expiry) return false;
    const e = new Date(x.expiry);
    if (isNaN(+e)) return false;
    const diff = (e.getTime() - now.getTime()) / 86400000;
    return diff >= 0 && diff <= days;
  });
}

export function activeAnnouncements(db?: any, user?: any): any[] {
  const d = db ?? getDB();
  const today = new Date().toISOString().slice(0, 10);
  return (d.announcements ?? []).filter((a: any) => {
    if (a.expires && a.expires < today) return false;
    if (!a.audience || a.audience === 'All') return true;
    if (a.audience === 'Role' && user) return true;
    return true;
  }).slice().reverse();
}
