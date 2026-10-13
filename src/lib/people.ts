import { getDB, saveDB } from '../data/mock';
import { pushRow } from './sync';
import { logAudit } from './audit';

/** Phase 5 helpers — goals, reviews, skills, training. */

export const REVIEW_STATUSES = ['Not Started', 'Self Review', 'Manager Review', 'Calibration', 'Completed'] as const;
export const GOAL_STATUSES = ['Not Started', 'In Progress', 'Completed', 'Deferred'] as const;

export function goalCompletion(empId?: number, db?: any): number {
  const d = db ?? getDB();
  const goals = (d.goals ?? []).filter((g: any) => !empId || g.empId === empId);
  if (!goals.length) return 0;
  const wTotal = goals.reduce((s: number, g: any) => s + (Number(g.weight) || 0), 0) || goals.length;
  const wDone = goals.reduce((s: number, g: any) => s + ((Number(g.progress) || 0) / 100) * (Number(g.weight) || 1), 0);
  return Math.round((wDone / wTotal) * 100);
}

export function advanceReview(id: number, user: any): boolean {
  const d = getDB();
  const r = (d.reviews ?? []).find((x: any) => x.id === id);
  if (!r) return false;
  const i = REVIEW_STATUSES.indexOf(r.status);
  if (i < 0 || i >= REVIEW_STATUSES.length - 1) return false;
  r.status = REVIEW_STATUSES[i + 1];
  r.history = r.history ?? [];
  r.history.push({ by: user?.name ?? '?', to: r.status, date: new Date().toISOString().slice(0, 10) });
  saveDB(d);
  pushRow('reviews' as any, r);
  logAudit('Review advanced', 'Performance', `#${r.id} → ${r.status}`);
  return true;
}

export function markAttendance(programId: number, empId: number, attended: boolean): boolean {
  const d = getDB();
  let rec = (d.trainingRecords ?? []).find((x: any) => x.programId === programId && x.empId === empId);
  if (!rec) {
    rec = { id: Date.now(), programId, empId, attended, certificate: '', date: new Date().toISOString().slice(0, 10) };
    d.trainingRecords.push(rec);
  } else rec.attended = attended;
  const prog = (d.trainings ?? []).find((t: any) => t.id === programId);
  if (prog) {
    prog.participants = prog.participants ?? [];
    if (attended && !prog.participants.includes(empId)) prog.participants.push(empId);
    if (!attended) prog.participants = prog.participants.filter((x: number) => x !== empId);
    pushRow('trainings' as any, prog);
  }
  saveDB(d);
  pushRow('training_records' as any, rec);
  return true;
}
