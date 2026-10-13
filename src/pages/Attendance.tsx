import { useMemo, useState } from 'react';
import { getDB, empName, fmtDate } from '../data/mock';
import { Avatar, Badge } from '../components/ui/bits';
import { useAuth } from '../context/AuthContext';

function localKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isLate(a: any) {
  return (Number(a.late) || 0) > 0 || a.status === 'Late';
}

function hasTimeIn(a: any) {
  return a.timeIn && a.timeIn !== '—';
}

export default function Attendance() {
  const { user } = useAuth();
  const [db] = useState(getDB());
  const [start, setStart] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return localKey(d); });
  const [end, setEnd] = useState(() => localKey(new Date()));
  const [status, setStatus] = useState('');
  const [punctual, setPunctual] = useState(''); // '' | 'ontime' | 'late'

  const myEmployee = db.employees.find((e: any) => e.name === user?.name);

  const { rows, nLate, nOnTime } = useMemo(() => {
    const s = start && end && start > end ? end : start;
    const e = start && end && start > end ? start : end;
    const filtered = db.attendance.filter((a: any) =>
      (user?.role !== 'Employee' || a.empId === myEmployee?.id) &&
      (!s || a.date >= s) && (!e || a.date <= e) &&
      (!status || a.status === status) &&
      (!punctual || (punctual === 'late' ? isLate(a) : hasTimeIn(a) && !isLate(a)))
    ).slice(-200).reverse();
    return {
      rows: filtered,
      nLate: filtered.filter(isLate).length,
      nOnTime: filtered.filter((a: any) => hasTimeIn(a) && !isLate(a)).length,
    };
  }, [db, user?.role, myEmployee?.id, start, end, status, punctual]);

  const clear = () => {
    setStatus(''); setPunctual('');
    const t = new Date(); const s = new Date(); s.setDate(t.getDate() - 30);
    setStart(localKey(s)); setEnd(localKey(t));
  };

  const field = 'flex flex-col gap-1 min-w-[140px]';
  const label = 'text-[11px] font-semibold text-slate-500';

  return (
    <div className="space-y-3">
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className={`${field}`}>
            <label className={label} htmlFor="att-start">Start date</label>
            <input id="att-start" type="date" className="!w-auto" value={start} max={end || undefined} onChange={e => setStart(e.target.value)} />
          </div>
          <div className={field}>
            <label className={label} htmlFor="att-end">End date</label>
            <input id="att-end" type="date" className="!w-auto" value={end} min={start || undefined} onChange={e => setEnd(e.target.value)} />
          </div>
          <div className={field}>
            <label className={label} htmlFor="att-status">Attendance status</label>
            <select id="att-status" className="!w-auto" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {['Present', 'Late', 'Absent', 'Half Day', 'On Leave', 'Rest Day', 'Holiday'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className={field}>
            <label className={label} htmlFor="att-punctual">Time in status</label>
            <select id="att-punctual" className="!w-auto" value={punctual} onChange={e => setPunctual(e.target.value)}>
              <option value="">On time + late</option>
              <option value="ontime">On time only</option>
              <option value="late">Late only</option>
            </select>
          </div>
          <button className="btn btn-outline btn-sm" onClick={clear}>Clear</button>
        </div>
        <p className="text-xs text-slate-500 mt-3 tabular-nums">
          {rows.length} record{rows.length === 1 ? '' : 's'}
          {start || end ? ` · ${start || '…'} to ${end || '…'}` : ''}
          {` · ${nOnTime} on time · ${nLate} late`}
        </p>
      </div>

      <div className="card p-4 overflow-x-auto">
        <table className="table-sticky">
          <thead><tr><th>Date</th><th>Employee</th><th>Time In</th><th>Time in status</th><th>Time Out</th><th>Hours</th><th>Late</th><th>OT</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((a: any) => {
              const late = isLate(a);
              const onTime = hasTimeIn(a) && !late;
              return (
                <tr key={a.id}>
                  <td className="whitespace-nowrap">{fmtDate(a.date)}</td>
                  <td><div className="flex items-center gap-2"><Avatar name={empName(db, a.empId)} /><span className="text-sm">{empName(db, a.empId)}</span></div></td>
                  <td className="whitespace-nowrap">{a.timeIn}</td>
                  <td>
                    {!hasTimeIn(a)
                      ? <span className="text-slate-300">—</span>
                      : late
                        ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-100 border border-amber-200 rounded-full px-2.5 py-0.5 whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Late{Number(a.late) ? ` ${a.late}m` : ''}</span>
                        : <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-full px-2.5 py-0.5 whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />On time</span>}
                    {onTime && null}
                  </td>
                  <td className="whitespace-nowrap">{a.timeOut}</td>
                  <td className="tabular-nums">{a.hours}</td>
                  <td className="tabular-nums">{a.late ? a.late + 'm' : '—'}</td>
                  <td className="tabular-nums">{a.overtime ? a.overtime + 'h' : '—'}</td>
                  <td><Badge status={a.status} /></td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr><td colSpan={9} className="text-center text-sm text-slate-400 py-6">No attendance in this range. Try widening the dates or clearing a filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
