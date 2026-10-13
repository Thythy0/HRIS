import { useEffect, useMemo, useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { getDB, saveDB } from '../../data/mock';
import { config } from '../../lib/config';
import { pushRow } from '../../lib/sync';
import { toast } from '../ui/bits';

function parseTimeToday(t: string): Date | null {
  if (!t || t === '—') return null;
  const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return null;
  let h = +m[1]; const min = +m[2]; const ap = (m[3] || '').toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  const d = new Date(); d.setHours(h, min, 0, 0);
  return d;
}

function fmtDur(ms: number) {
  if (ms < 0) ms = 0;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { h: String(h).padStart(2, '0'), m: String(m).padStart(2, '0'), s: String(s).padStart(2, '0') };
}

const SHIFT_HRS = config.shiftHours;

export default function TodayAttendance({ empId, onChange }: { empId: number; onChange: () => void }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const today = localToday();
  const rec = useMemo(() => {
    return getDB().attendance.find((a: any) => a.empId === empId && a.date === today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empId, today, now.getMinutes()]);

  const clockedIn = !!rec && rec.timeIn !== '—';
  const clockedOut = !!rec && rec.timeOut !== '—';
  const onDuty = clockedIn && !clockedOut;

  const sessionMs = useMemo(() => {
    if (!rec || !clockedIn) return 0;
    const start = parseTimeToday(rec.timeIn);
    if (!start) return 0;
    const end = clockedOut ? parseTimeToday(rec.timeOut) ?? new Date() : new Date();
    return Math.max(0, end.getTime() - start.getTime());
  }, [rec, clockedIn, clockedOut]);

  const shiftPct = Math.min(100, (sessionMs / (SHIFT_HRS * 3600000)) * 100);
  const dur = fmtDur(sessionMs);

  const doClock = (kind: 'in' | 'out') => {
    const d = getDB();
    let r = d.attendance.find((a: any) => a.empId === empId && a.date === today);
    const fmt = new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
    if (kind === 'in') {
      if (!r) { r = { id: Date.now(), empId, date: today, timeIn: '—', timeOut: '—', hours: 0, late: 0, overtime: 0, status: 'Present' }; d.attendance.push(r); }
      if (r.timeIn !== '—') return toast('Already clocked in');
      r.timeIn = fmt;
      r.late = Math.max(0, Math.round((Date.now() - +new Date(today + 'T08:00:00')) / 60000) - config.graceMinutes);
      r.status = r.late > 0 ? 'Late' : 'Present';
      toast('Clocked in at ' + fmt);
    } else {
      if (!r || r.timeIn === '—') return toast('Clock in first');
      if (r.timeOut !== '—') return toast('Already clocked out');
      r.timeOut = fmt; r.hours = Math.max(0, Math.round(((parseTimeToday(fmt)?.getTime() ?? Date.now()) - (parseTimeToday(r.timeIn)?.getTime() ?? Date.now())) / 3600000 * 100) / 100) || 8;
      toast('Clocked out at ' + fmt);
    }
    saveDB(d); pushRow('attendance', r); setNow(new Date()); onChange();
  };

  return (
    <div className="rounded-2xl bg-[#091413] text-white p-5 h-full min-h-[312px] flex flex-col relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-white/15" />
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[13px] text-white/60">{now.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <p className="display text-[34px] leading-none font-bold tabular-nums tracking-tight mt-1" aria-live="off">
            {now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 shrink-0 ${onDuty ? 'bg-emerald-400/15 text-emerald-300' : clockedOut ? 'bg-white/10 text-white/60' : 'bg-amber-400/15 text-amber-300'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${onDuty ? 'bg-emerald-400 animate-pulse' : clockedOut ? 'bg-white/40' : 'bg-amber-400'}`} />
          {onDuty ? 'On duty' : clockedOut ? 'Shift done' : 'Not started'}
        </span>
      </div>

      <div className="mt-4 flex items-end gap-2 tabular-nums" aria-label={`Session ${dur.h}:${dur.m}:${dur.s}`}>
        <span className="display text-5xl font-bold tracking-tight">{dur.h}<span className="text-lg text-white/40 font-bold">h</span></span>
        <span className="display text-5xl font-bold tracking-tight text-white/25">:</span>
        <span className="display text-5xl font-bold tracking-tight">{dur.m}<span className="text-lg text-white/40 font-bold">m</span></span>
        <span className="display text-5xl font-bold tracking-tight text-white/25">:</span>
        <span className="display text-5xl font-bold tracking-tight">{dur.s}<span className="text-lg text-white/40 font-bold">s</span></span>
      </div>
      <p className="text-xs text-white/55 mt-1 tabular-nums">Session time · {SHIFT_HRS} hr shift · {Math.round(shiftPct)}%</p>

      <div className="mt-2 flex gap-[3px]" role="progressbar" aria-valuenow={Math.round(shiftPct)} aria-valuemin={0} aria-valuemax={100} aria-label="Shift progress">
        {Array.from({ length: 32 }).map((_, i) => (
          <div key={i} className={`h-2 flex-1 rounded-full ${i / 32 * 100 < shiftPct ? 'bg-emerald-400' : 'bg-white/12'}`} style={i / 32 * 100 >= shiftPct ? { background: 'rgba(255,255,255,0.12)' } : undefined} />
        ))}
      </div>

      <dl className="mt-4 divide-y divide-white/10 text-sm border-y border-white/10">
        <div className="flex justify-between py-2">
          <dt className="text-white/55 text-[13px]">Clock in {rec && clockedIn && rec.late > 0 ? `· ${rec.late}m late` : ''}</dt>
          <dd className="font-semibold tabular-nums">{rec?.timeIn && rec.timeIn !== '—' ? rec.timeIn : '—'}</dd>
        </div>
        <div className="flex justify-between py-2">
          <dt className="text-white/55 text-[13px]">Clock out</dt>
          <dd className="font-semibold tabular-nums">{rec?.timeOut && rec.timeOut !== '—' ? rec.timeOut : '—'}</dd>
        </div>
      </dl>

      <div className="grid grid-cols-2 gap-2.5 mt-auto pt-4">
        <button onClick={() => doClock('in')} disabled={clockedIn}
          className="rounded-xl py-2.5 text-sm font-semibold bg-[#B0E4CC] text-[#091413] flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-105 active:scale-[0.98] transition">
          <LogIn size={15} /> Clock in
        </button>
        <button onClick={() => doClock('out')} disabled={!clockedIn || clockedOut}
          className="rounded-xl py-2.5 text-sm font-semibold border border-white/20 text-white flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 active:scale-[0.98] transition">
          <LogOut size={15} /> Clock out
        </button>
      </div>
    </div>
  );
}
