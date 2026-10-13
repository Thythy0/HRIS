import { useState } from 'react';
import { getDB, empName, peso, deptName } from '../data/mock';
import { exportCSV } from '../components/ui/bits';

function Bar({ pct, color = 'bg-indigo-500' }: { pct: number; color?: string }) {
  return <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>;
}

export default function Reports() {
  const db = getDB();
  const [dept, setDept] = useState('');
  const inDept = (empId: number) => !dept || (db.employees.find((e: any) => e.id === empId)?.dept === +dept);
  const emps = db.employees.filter((e: any) => !dept || e.dept === +dept);
  const active = emps.filter((e: any) => e.status === 'Active');
  const newHires = emps.filter((e: any) => (e.hired ?? '') >= '2026-01-01').length;
  const exits = (db.statusHistory ?? []).filter((s: any) => ['Archived'].includes(s.newStatus)).length;
  const turnover = active.length ? (exits / (active.length + exits)) * 100 : 0;

  const att = (db.attendance ?? []).filter((a: any) => inDept(a.empId));
  const present = att.filter((a: any) => a.status === 'Present').length;
  const late = att.filter((a: any) => a.status === 'Late').length;
  const absent = att.filter((a: any) => a.status === 'Absent').length;
  const total = Math.max(1, att.length);
  const otHrs = att.reduce((s: number, a: any) => s + (+a.overtime || 0), 0);

  const leaves = (db.leaveRequests ?? []).filter((l: any) => inDept(l.empId));
  const leaveDays = leaves.filter((l: any) => l.status === 'Approved').reduce((s: number, l: any) => s + (+l.days || 0), 0);

  const recs = (db.payrollRecords ?? []).filter((r: any) => inDept(r.empId));
  const gross = recs.reduce((s: number, r: any) => s + (+r.gross || 0), 0);
  const net = recs.reduce((s: number, r: any) => s + (+r.net || 0), 0);
  const erSSS = recs.reduce((s: number, r: any) => {
    const emp = db.employees.find((e: any) => e.id === r.empId);
    const monthly = +emp?.salary || 0;
    const msc = Math.min(35000, Math.max(5000, Math.round(monthly / 1000) * 1000));
    return s + msc * 0.10 / 2;
  }, 0);

  const openings = db.jobOpenings ?? [];
  const applicants = db.applicants ?? [];
  const funnel = ['Applied', 'Screening', 'Interview', 'Assessment', 'Final Interview', 'Offer', 'Hired'].map(st => ({ st, n: applicants.filter((a: any) => a.status === st).length }));
  const maxFunnel = Math.max(1, ...funnel.map(f => f.n));

  const reviews = db.reviews ?? [];
  const completed = reviews.filter((r: any) => r.status === 'Completed');
  const avgRating = completed.length ? completed.reduce((s: number, r: any) => s + (+r.rating || 0), 0) / completed.length : 0;
  const goalDone = (db.goals ?? []).filter((g: any) => g.status === 'Completed').length;

  const deptRows = db.departments.map((d: any) => {
    const ids = db.employees.filter((e: any) => e.dept === d.id).map((e: any) => e.id);
    const a = (db.attendance ?? []).filter((x: any) => ids.includes(x.empId));
    const rate = a.length ? (a.filter((x: any) => ['Present', 'Late', 'Half Day'].includes(x.status)).length / a.length) * 100 : 0;
    return { name: d.name, head: ids.length, rate };
  });

  return (
    <>
      <div className="card p-4 mb-4 flex flex-wrap gap-3 items-center">
        <select className="!w-auto" value={dept} onChange={e => setDept(e.target.value)}><option value="">All departments</option>{db.departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        <span className="text-xs text-slate-400">Executive dashboard — live from current data. Exports carry real rows.</span>
        <div className="flex-1" />
        <button className="btn btn-outline btn-sm" onClick={() => exportCSV(recs.map((r: any) => ({ Employee: empName(db, r.empId), Gross: r.gross, Net: r.net, Status: r.status })), 'payroll-analytics')}>Export payroll</button>
        <button className="btn btn-outline btn-sm" onClick={() => exportCSV(att.map((a: any) => ({ Date: a.date, Employee: empName(db, a.empId), Status: a.status })), 'attendance-analytics')}>Export attendance</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {([['Headcount', `${active.length}/${emps.length}`, 'text-slate-800'], ['Turnover', turnover.toFixed(1) + '%', 'text-red-600'], ['Gross payroll', peso(gross), 'text-slate-800'], ['Net payroll', peso(net), 'text-emerald-600']] as any).map(([l, v, c]: any) => (
          <div key={l} className="card p-4"><p className="text-xs text-slate-500">{l}</p><p className={`text-xl font-extrabold tabular-nums mt-1 ${c}`}>{v}</p></div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-5"><h3 className="font-bold text-sm mb-3">Workforce</h3>
          <div className="space-y-2 text-sm"><div className="flex justify-between"><span>Active</span><b className="tabular-nums">{active.length}</b></div>
          <div className="flex justify-between"><span>New hires (2026)</span><b className="tabular-nums">{newHires}</b></div>
          <div className="flex justify-between"><span>Exits</span><b className="tabular-nums">{exits}</b></div></div>
          <div className="mt-3"><Bar pct={active.length / Math.max(1, emps.length) * 100} color="bg-emerald-500" /><p className="text-[11px] text-slate-400 mt-1">Active share</p></div>
        </div>
        <div className="card p-5"><h3 className="font-bold text-sm mb-3">Attendance ({att.length} marks)</h3>
          {[['Present', present, 'bg-emerald-500'], ['Late', late, 'bg-amber-400'], ['Absent', absent, 'bg-red-500']].map(([l, v, c]: any) => (
            <div key={l} className="mb-2"><div className="flex justify-between text-sm"><span>{l}</span><b className="tabular-nums">{v} · {(v / total * 100).toFixed(1)}%</b></div><Bar pct={v / total * 100} color={c} /></div>
          ))}
          <p className="text-xs text-slate-400 mt-2 tabular-nums">Overtime {otHrs.toFixed(1)}h · Leave {leaveDays}d approved</p>
        </div>
        <div className="card p-5"><h3 className="font-bold text-sm mb-3">Payroll</h3>
          <div className="space-y-2 text-sm"><div className="flex justify-between"><span>Gross</span><b className="tabular-nums">{peso(gross)}</b></div>
          <div className="flex justify-between"><span>Net</span><b className="tabular-nums">{peso(net)}</b></div>
          <div className="flex justify-between"><span>Employer SSS (est.)</span><b className="tabular-nums">{peso(erSSS)}</b></div></div>
          <div className="mt-3"><Bar pct={gross ? (net / gross) * 100 : 0} color="bg-indigo-500" /><p className="text-[11px] text-slate-400 mt-1">Net / gross</p></div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-4">
        <div className="card p-5"><h3 className="font-bold text-sm mb-3">Recruitment funnel</h3>
          {funnel.map(f => <div key={f.st} className="mb-2"><div className="flex justify-between text-xs"><span>{f.st}</span><b className="tabular-nums">{f.n}</b></div><Bar pct={f.n / maxFunnel * 100} /></div>)}
          <p className="text-xs text-slate-400 mt-2">{openings.filter((j: any) => j.status === 'Open').length} open roles · {applicants.length} applicants</p>
        </div>
        <div className="card p-5"><h3 className="font-bold text-sm mb-3">Performance</h3>
          <p className="text-2xl font-extrabold tabular-nums">{avgRating ? avgRating.toFixed(1) : '—'}<span className="text-sm text-slate-400"> / 5</span></p>
          <p className="text-xs text-slate-400 mb-3">{completed.length} reviews completed · {goalDone} goals done</p>
          <Bar pct={avgRating / 5 * 100} color="bg-amber-400" />
        </div>
        <div className="card p-5"><h3 className="font-bold text-sm mb-3">Attendance by department</h3>
          {deptRows.map((r: any) => <div key={r.name} className="mb-2"><div className="flex justify-between text-xs"><span>{deptName(db, db.departments.find((d: any) => d.name === r.name)?.id)} · {r.head}</span><b className="tabular-nums">{r.rate.toFixed(0)}%</b></div><Bar pct={r.rate} color="bg-emerald-500" /></div>)}
        </div>
      </div>
    </>
  );
}
