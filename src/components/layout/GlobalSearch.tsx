import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDB, empName } from '../../data/mock';

export default function GlobalSearch() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const close = (e: any) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const esc = (e: any) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, []);

  const db = getDB();
  const query = q.trim().toLowerCase();
  const results = !query ? [] : [
    ...db.employees.filter((e: any) => (e.name + ' ' + e.code + ' ' + e.email).toLowerCase().includes(query)).slice(0, 4).map((e: any) => ({ label: e.name, sub: `${e.code} · Employee`, to: '/employees' })),
    ...db.leaveRequests.filter((l: any) => (l.reason + ' ' + empName(db, l.empId)).toLowerCase().includes(query)).slice(0, 3).map((l: any) => ({ label: `${empName(db, l.empId)} — leave`, sub: `${l.reason} · ${l.status}`, to: '/leave' })),
    ...(db.overtimeRequests ?? []).filter((o: any) => ((o.reason + ' ' + o.project + ' ' + empName(db, o.empId))).toLowerCase().includes(query)).slice(0, 3).map((o: any) => ({ label: `${empName(db, o.empId)} — overtime`, sub: `${Number(o.hours).toFixed(1)}h · ${o.status}`, to: '/overtime' })),
    ...(db.correctionRequests ?? []).filter((c: any) => ((c.reason + ' ' + empName(db, c.empId))).toLowerCase().includes(query)).slice(0, 2).map((c: any) => ({ label: `${empName(db, c.empId)} — correction`, sub: `${c.requestedTime} · ${c.status}`, to: '/corrections' })),
    ...db.payrollRecords.filter((r: any) => empName(db, r.empId).toLowerCase().includes(query)).slice(0, 3).map((r: any) => ({ label: `${empName(db, r.empId)} — payroll`, sub: `Period #${r.periodId} · ${r.status}`, to: '/payroll' })),
    ...(db.payrollPeriods ?? []).filter((p: any) => (p.label ?? '').toLowerCase().includes(query)).slice(0, 2).map((p: any) => ({ label: `${p.label} — period`, sub: `${p.status}`, to: '/payroll' })),
    ...(db.jobOpenings ?? []).filter((j: any) => (j.title ?? '').toLowerCase().includes(query)).slice(0, 2).map((j: any) => ({ label: `${j.title} — opening`, sub: `${j.status}`, to: '/recruitment' })),
    ...(db.applicants ?? []).filter((a: any) => (a.name ?? '').toLowerCase().includes(query)).slice(0, 3).map((a: any) => ({ label: `${a.name} — applicant`, sub: `${a.status}`, to: '/recruitment' })),
    ...(db.hrRequests ?? []).filter((r: any) => ((r.type + ' ' + r.details)).toLowerCase().includes(query)).slice(0, 2).map((r: any) => ({ label: `${r.type} — request`, sub: `${r.status}`, to: '/requests' })),
    ...(db.documents ?? []).filter((d: any) => (d.name ?? '').toLowerCase().includes(query)).slice(0, 2).map((d: any) => ({ label: `${d.name} — doc`, sub: `${d.category}`, to: '/documents' })),
    ...(db.announcements ?? []).filter((a: any) => ((a.title + ' ' + a.body)).toLowerCase().includes(query)).slice(0, 2).map((a: any) => ({ label: `${a.title} — announcement`, sub: `${a.by ?? ''}`, to: '/announcements' })),
    ...(db.loans ?? []).filter((l: any) => ((l.empName ?? '') + ' ' + l.type).toLowerCase().includes(query)).slice(0, 2).map((l: any) => ({ label: `${l.empName} — loan`, sub: `${l.status}`, to: '/loans' })),
    ...(db.expenses ?? []).filter((e: any) => ((e.description + ' ' + e.category)).toLowerCase().includes(query)).slice(0, 2).map((e: any) => ({ label: `${e.category} — expense`, sub: `${e.status}`, to: '/expenses' })),
    ...(db.goals ?? []).filter((g: any) => (g.title ?? '').toLowerCase().includes(query)).slice(0, 2).map((g: any) => ({ label: `${g.title} — goal`, sub: `${g.status}`, to: '/performance' })),
    ...(db.trainings ?? []).filter((t: any) => (t.title ?? '').toLowerCase().includes(query)).slice(0, 2).map((t: any) => ({ label: `${t.title} — training`, sub: `${t.status}`, to: '/training' })),
    ...db.attendance.filter((a: any) => empName(db, a.empId).toLowerCase().includes(query)).slice(-3).map((a: any) => ({ label: `${empName(db, a.empId)} — ${a.date}`, sub: `${a.status} · In ${a.timeIn}`, to: '/attendance' })),
  ].slice(0, 10);

  return (
    <div ref={box} className="relative hidden md:block w-56 lg:w-72">
      <input placeholder="Search anything…" value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} aria-label="Global search" />
      {open && query && (
        <div className="absolute top-full mt-2 w-full card p-1.5 z-50 max-h-80 overflow-y-auto">
          {results.length ? results.map((r, i) => (
            <button key={i} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50" onClick={() => { setOpen(false); setQ(''); navigate(r.to); }}>
              <p className="text-sm font-medium truncate">{r.label}</p><p className="text-[11px] text-slate-400 truncate">{r.sub}</p>
            </button>
          )) : <p className="text-xs text-slate-400 px-3 py-3">No matches for “{q}”. Try a name, code, or reason.</p>}
        </div>
      )}
    </div>
  );
}
