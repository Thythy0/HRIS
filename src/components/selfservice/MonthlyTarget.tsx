import { useMemo, useState } from 'react';
import { config } from '../../lib/config';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const TARGET = config.targetHours;
const SEGMENTS = 20; // 20 punches across the monthly target

export default function MonthlyTarget({ empId, records }: { empId: number; records: any[] }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const data = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const mine = (records ?? []).filter((r: any) => r.empId === empId && typeof r.date === 'string' && r.date.startsWith(prefix));
    const done = mine.reduce((s: number, r: any) => s + (Number(r.hours) || 0), 0);
    const completed = Math.round(done * 100) / 100;
    const remaining = Math.max(0, Math.round((TARGET - completed) * 100) / 100);
    const pct = Math.min(100, completed / TARGET * 100);

    const weeks = [0, 0, 0, 0];
    mine.forEach((r: any) => {
      const day = +String(r.date).slice(8, 10);
      const wi = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3;
      weeks[wi] += Number(r.hours) || 0;
    });

    const dim = new Date(year, month + 1, 0).getDate();
    const isCurrent = year === now.getFullYear() && month === now.getMonth();
    const elapsed = isCurrent ? Math.min(now.getDate(), dim) : dim;
    const expected = TARGET * (elapsed / dim);
    const onPace = completed >= expected - 4;

    const full = Math.floor(completed / (TARGET / SEGMENTS));
    const partial = (completed % (TARGET / SEGMENTS)) / (TARGET / SEGMENTS);
    return { completed, remaining, pct, weeks, onPace, full, partial, dim };
  }, [records, empId, month, year]);

  return (
    <div className="card p-5 h-full min-h-[312px] flex flex-col">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm text-slate-500">Monthly target · {MONTHS[month]} {year}</p>
          <p className="display text-[34px] leading-none font-bold tracking-tight mt-1 tabular-nums">
            {data.remaining.toFixed(2)} <span className="text-lg font-bold text-slate-400">hrs to go</span>
          </p>
          <p className="text-xs text-slate-500 mt-1.5 tabular-nums">
            {data.completed.toFixed(2)} of {TARGET} hrs logged · {Math.round(data.pct)}%
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <select value={month} onChange={e => setMonth(+e.target.value)} aria-label="Month"
              className="!w-auto text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-2 bg-white">
              {MONTHS.map((m, i) => <option key={m} value={i}>{m.slice(0,3)}</option>)}
            </select>
            <select value={year} onChange={e => setYear(+e.target.value)} aria-label="Year"
              className="!w-auto text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-2 bg-white">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${data.onPace ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
            {data.onPace ? 'On pace' : 'Behind pace'}
          </span>
        </div>
      </div>

      <div className="mt-4" role="progressbar" aria-valuenow={Math.round(data.pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Hours completed">
        <div className="flex gap-1">
          {Array.from({ length: SEGMENTS }).map((_, i) => {
            const filled = i < data.full;
            const isPartial = i === data.full && data.partial > 0;
            return (
              <div key={i} className={`h-9 flex-1 rounded-md border ${filled ? 'bg-[#408A71] border-[#408A71]' : 'bg-white border-slate-200'} overflow-hidden relative`}>
                {isPartial && !filled && (
                  <div className="absolute inset-y-0 left-0 bg-[#408A71]/30" style={{ width: `${data.partial * 100}%` }} />
                )}
                {i % 5 === 4 && <div className="absolute inset-y-1 right-0 w-px bg-current opacity-10" />}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[11px] text-slate-400 mt-1 tabular-nums">
          <span>0</span><span>40</span><span>80</span><span>120</span><span>160 hrs</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-auto pt-3">
        {data.weeks.map((h, i) => {
          const max = Math.max(...data.weeks, 40);
          return (
            <div key={i} className="rounded-xl bg-slate-50 px-3 py-2.5">
              <p className="text-[11px] text-slate-500">Week {i + 1}</p>
              <p className="text-sm font-bold tabular-nums">{h.toFixed(1)}h</p>
              <div className="h-1 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                <div className="h-full bg-[#408A71] rounded-full" style={{ width: `${Math.min(100, (h / max) * 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
