import { useMemo, useState } from 'react';

type AttStatus = 'Present' | 'Late' | 'Absent' | 'Half Day' | 'On Leave' | string;

interface Props {
  empId: number;
  records: any[];
  initialMonth?: number; // 0-11
  initialYear?: number;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function dateKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function statusStyle(status: AttStatus) {
  switch (status) {
    case 'Present': return { cell: 'bg-emerald-500 border-emerald-600 text-white', dot: 'bg-white', sub: 'text-emerald-50' };
    case 'Late': return { cell: 'bg-amber-400 border-amber-500 text-amber-950', dot: 'bg-amber-950', sub: 'text-amber-900' };
    case 'Absent': return { cell: 'bg-red-500 border-red-600 text-white', dot: 'bg-white', sub: 'text-red-50' };
    case 'Half Day': return { cell: 'bg-orange-300 border-orange-400 text-orange-950', dot: 'bg-orange-900', sub: 'text-orange-900' };
    case 'On Leave': return { cell: 'bg-blue-500 border-blue-600 text-white', dot: 'bg-white', sub: 'text-blue-50' };
    default: return { cell: 'bg-slate-200 border-slate-300 text-slate-700', dot: 'bg-slate-500', sub: 'text-slate-600' };
  }
}

export default function AttendanceCalendar({ empId, records, initialMonth, initialYear }: Props) {
  const now = new Date();
  const [month, setMonth] = useState(initialMonth ?? now.getMonth());
  const [year, setYear] = useState(initialYear ?? now.getFullYear());

  const byDate = useMemo(() => {
    const m = new Map<string, any>();
    (records ?? []).filter((r: any) => r.empId === empId).forEach((r: any) => { if (r?.date) m.set(r.date, r); });
    return m;
  }, [records, empId]);

  const { leadBlanks, daysInMonth } = useMemo(() => {
    const first = new Date(year, month, 1).getDay();
    const dim = new Date(year, month + 1, 0).getDate();
    return { leadBlanks: first, daysInMonth: dim };
  }, [month, year]);

  const monthRecords = useMemo(() => {
    const arr: any[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const k = dateKey(year, month, d);
      const r = byDate.get(k);
      if (r) arr.push(r);
    }
    return arr;
  }, [byDate, daysInMonth, month, year]);

  const cPresent = monthRecords.filter(r => r.status === 'Present').length;
  const cLate = monthRecords.filter(r => r.status === 'Late').length;
  const cAbsent = monthRecords.filter(r => r.status === 'Absent').length;

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const goToday = () => { setMonth(now.getMonth()); setYear(now.getFullYear()); };

  const todayK = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return (
    <div className="card p-5 h-full flex flex-col">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-bold text-[15px]">My Attendance Calendar</h3>
          <p className="text-xs text-slate-500 mt-0.5">Green present · Yellow late · Red absent</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button className="btn btn-outline btn-sm !px-2.5 h-9" onClick={prev} aria-label="Previous month">‹</button>
          <select className="!w-auto text-xs font-semibold h-9" value={month} onChange={e => setMonth(+e.target.value)} aria-label="Month">
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select className="!w-auto text-xs font-semibold h-9" value={year} onChange={e => setYear(+e.target.value)} aria-label="Year">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-outline btn-sm !px-2.5 h-9" onClick={next} aria-label="Next month">›</button>
          <button className="btn btn-outline btn-sm h-9" onClick={goToday}>Today</button>
        </div>
      </div>

      <div className="flex gap-2 text-xs font-semibold mt-3 mb-3 flex-wrap">
        <span className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full px-2.5 py-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Present ({cPresent})</span>
        <span className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-full px-2.5 py-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Late ({cLate})</span>
        <span className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 rounded-full px-2.5 py-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Absent ({cAbsent})</span>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold text-slate-500 mb-1.5">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: leadBlanks }).map((_, i) => <div key={`b${i}`} aria-hidden />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const k = dateKey(year, month, day);
          const rec = byDate.get(k);
          const isToday = k === todayK;
          const dow = new Date(year, month, day).getDay();
          const isWeekend = dow === 0 || dow === 6;
          const isFuture = k > todayK;
          const todayRing = isToday ? 'ring-2 ring-slate-900 ring-offset-1 !border-slate-900' : '';
          if (!rec) {
            return (
              <div key={k} title={isFuture ? `${k} · Upcoming` : isWeekend ? `${k} · Weekend` : `${k} · No record`}
                className={`rounded-xl border text-sm h-[54px] flex flex-col items-center justify-center tabular-nums ${todayRing} ${isToday ? 'border-slate-900 font-bold' : 'border-slate-200'} ${isWeekend ? 'bg-slate-100 text-slate-400' : isFuture ? 'bg-white text-slate-300 border-dashed' : 'bg-white text-slate-600'}`}>
                <span className="leading-none">{day}</span>
                {isToday && <span className="text-[9px] font-bold mt-0.5 text-slate-500">Today</span>}
              </div>
            );
          }
          const s = statusStyle(rec.status);
          return (
            <div key={k} title={`${k} · ${rec.status} · In: ${rec.timeIn ?? '—'} Out: ${rec.timeOut ?? '—'}`}
              role="img" aria-label={`${k} ${rec.status}`}
              className={`rounded-xl border-2 text-sm h-[54px] flex flex-col items-center justify-center font-bold tabular-nums ${s.cell} ${todayRing}`}>
              <span className="leading-none">{day}</span>
              <span className={`flex items-center gap-1 mt-1 text-[9px] font-bold uppercase tracking-wide ${s.sub}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                {String(rec.status).slice(0, 7)}
              </span>
              {isToday && <span className="sr-only">(today)</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
