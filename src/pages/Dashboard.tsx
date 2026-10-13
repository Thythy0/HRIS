import { useEffect, useMemo, useState } from 'react';
import { getDB, peso } from '../data/mock';
import { useAuth } from '../context/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const db = getDB();
  const [range, setRange] = useState('today');
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  if (user?.role === 'Employee') return <Navigate to="/self-service" replace />;

  const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const today = localToday();
  const attendance = Array.isArray(db.attendance) ? db.attendance : [];

  const recs = useMemo(() => {
    if (range === 'today') return attendance.filter((a: any) => a.date === today);
    if (range === 'week') return attendance.filter((a: any) => { const diff = (Date.now() - +new Date(a.date)) / 86400000; return diff >= 0 && diff <= 7; });
    return attendance.filter((a: any) => { const diff = (Date.now() - +new Date(a.date)) / 86400000; return diff >= 0 && diff <= 30; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, db.attendance.length]);

  const count = (s: string) => recs.filter((a: any) => a.status === s).length;
  const todayAtt = useMemo(() => attendance.filter((a: any) => a.date === today), [attendance, today]);
  const active = (db.employees ?? []).filter((e: any) => e.status === 'Active');
  const present = todayAtt.filter((a: any) => a.status === 'Present' || a.status === 'Half Day').length;
  const late = todayAtt.filter((a: any) => a.status === 'Late').length;
  const absent = todayAtt.filter((a: any) => a.status === 'Absent').length;
  const onLeave = todayAtt.filter((a: any) => a.status === 'On Leave').length;
  const pendingLeaves = (db.leaveRequests ?? []).filter((l: any) => l.status === 'Pending').length;
  const gross = (db.payrollRecords ?? []).reduce((s: number, r: any) => s + (Number(r.gross) || 0), 0);
  const ded = (db.payrollRecords ?? []).reduce((s: number, r: any) => s + (Number(r.totalDed) || 0), 0);
  const net = (db.payrollRecords ?? []).reduce((s: number, r: any) => s + (Number(r.net) || 0), 0);
  const ot = (db.payrollRecords ?? []).reduce((s: number, r: any) => s + (Number(r.overtime) || 0), 0);

  const clocked = present + late;
  const onTimePct = clocked + absent === 0 ? 0 : Math.round((present / Math.max(1, clocked + absent)) * 100);
  const nextPeriod = (db.payrollPeriods ?? []).find((p: any) => p.status === 'Draft') ?? (db.payrollPeriods ?? [])[(db.payrollPeriods ?? []).length - 1];

  const tape = useMemo(() => active.map((e: any) => {
    const r = todayAtt.find((a: any) => a.empId === e.id);
    return { id: e.id, name: e.name, status: r?.status ?? 'Missing' };
  }), [active, todayAtt]);

  const tapeColor = (s: string) =>
    s === 'Present' || s === 'Half Day' ? 'bg-emerald-400' :
    s === 'Late' ? 'bg-amber-400' :
    s === 'Absent' ? 'bg-red-400' :
    s === 'On Leave' ? 'bg-blue-400' : 'bg-white/15';

  const rows: { label: string; value: number; bar: string; text: string }[] = [
    { label: 'Present', value: count('Present'), bar: 'bg-emerald-500', text: 'text-emerald-700' },
    { label: 'Late', value: count('Late'), bar: 'bg-amber-500', text: 'text-amber-700' },
    { label: 'Absent', value: count('Absent'), bar: 'bg-red-500', text: 'text-red-700' },
    { label: 'On leave', value: count('On Leave'), bar: 'bg-blue-500', text: 'text-blue-700' },
    { label: 'Half day', value: count('Half Day'), bar: 'bg-slate-400', text: 'text-slate-600' },
  ];
  const maxRow = Math.max(1, ...rows.map(r => r.value));

  const cards = [
    { label: 'Active headcount', value: String(active.length), sub: `${active.length - clocked - absent - onLeave} yet to clock in`, stripe: 'bg-[#408A71]', to: '/employees' },
    { label: 'Present today', value: String(present), sub: `${onTimePct}% on time`, stripe: 'bg-emerald-500', to: '/attendance' },
    { label: 'Needs attention', value: String(late + absent), sub: `${late} late · ${absent} absent`, stripe: 'bg-amber-500', to: '/attendance' },
    { label: 'Pending leaves', value: String(pendingLeaves), sub: pendingLeaves ? 'awaiting review' : 'all clear', stripe: 'bg-blue-500', to: '/leave' },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-[#091413] text-white p-5 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-white/15" />
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[13px] text-white/60">{now.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
            <p className="display text-[34px] leading-none font-bold tabular-nums tracking-tight mt-1">
              {now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-xs text-white/60 mt-1.5 tabular-nums">{clocked} of {active.length} clocked in · {onLeave} on leave</p>
          </div>
          <div className="text-right">
            <p className="text-[13px] text-white/60">On time today</p>
            <p className="display text-[34px] leading-none font-bold tabular-nums">{onTimePct}%</p>
          </div>
        </div>
        <div className="mt-4 flex gap-1" role="img" aria-label={`${present} present, ${late} late, ${absent} absent`}>
          {tape.slice(0, 48).map((t: any) => (
            <span key={t.id} title={`${t.name} · ${t.status}`} className={`h-8 flex-1 rounded-md min-w-[10px] ${tapeColor(t.status)}`} />
          ))}
        </div>
        <div className="flex justify-between text-[11px] text-white/45 mt-1.5">
          <span>Each block is one person today</span><span className="tabular-nums">{present} present · {late} late · {absent} absent</span>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(c => (
          <button key={c.label} onClick={() => navigate(c.to)} className="card p-0 h-[104px] flex items-stretch overflow-hidden text-left hover:border-slate-300 transition-colors">
            <span className={`w-1.5 shrink-0 ${c.stripe}`} aria-hidden />
            <span className="p-4 flex flex-col justify-center min-w-0">
              <span className="text-xs text-slate-500">{c.label}</span>
              <span className="text-[28px] leading-none font-extrabold tabular-nums tracking-tight mt-1">{c.value}</span>
              <span className="text-[11px] text-slate-400 mt-1 truncate">{c.sub}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-4 items-stretch">
        <div className="card p-5 lg:col-span-3 h-full flex flex-col">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="font-bold text-[15px]">Attendance ledger</h3>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">{recs.length} records in view</p>
            </div>
            <select className="!w-auto text-xs font-semibold h-9" value={range} onChange={e => setRange(e.target.value)} aria-label="Range">
              <option value="today">Today</option><option value="week">This week</option><option value="month">This month</option>
            </select>
          </div>
          <div className="mt-4 space-y-3">
            {rows.map(r => (
              <div key={r.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">{r.label}</span>
                  <span className={`font-bold tabular-nums ${r.text}`}>{r.value}</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${r.bar}`} style={{ width: `${(r.value / maxRow) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-outline btn-sm mt-auto pt-2 self-start" onClick={() => navigate('/attendance')}>Open attendance</button>
        </div>

        <div className="lg:col-span-2 h-full">
          <div className="card p-5 h-full flex flex-col">
            <h3 className="font-bold text-[15px]">Payroll ledger</h3>
            <p className="text-xs text-slate-500 mt-0.5">{nextPeriod ? `${nextPeriod.label} · ${nextPeriod.status}` : 'No period'}</p>
            <div className="mt-3 divide-y divide-slate-100">
              {[['Gross pay', gross, 'text-slate-800'], ['Deductions', ded, 'text-red-600'], ['Overtime', ot, 'text-amber-700']].map(([l, v, c]: any) => (
                <div key={l} className="flex justify-between py-2 text-sm"><span className="text-slate-500">{l}</span><span className={`font-semibold tabular-nums ${c}`}>{peso(v)}</span></div>
              ))}
            </div>
            <div className="mt-auto pt-3">
              <div className="rounded-xl bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
                <span className="text-xs text-white/60">Net pay</span>
                <span className="text-xl font-extrabold tabular-nums">{peso(net)}</span>
              </div>
              <button className="btn btn-outline btn-sm mt-3" onClick={() => navigate('/payroll')}>Open payroll</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card-flat p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[15px]">Recent activity</h3>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/reports')}>Reports</button>
        </div>
        <ol className="mt-3 relative border-l border-slate-200 ml-1.5 space-y-4">
          {(db.activity ?? []).slice(0, 6).map((a: any, i: number) => (
            <li key={i} className="pl-4 relative">
              <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#408A71] ring-4 ring-[#B0E4CC]/40" aria-hidden />
              <p className="text-sm text-slate-700">{a.text}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{a.time}</p>
            </li>
          ))}
          {!(db.activity ?? []).length && <p className="text-sm text-slate-400 pl-4">No activity yet.</p>}
        </ol>
      </div>
    </div>
  );
}
