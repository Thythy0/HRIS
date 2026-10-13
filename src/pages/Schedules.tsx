import React, { useState } from 'react';
import { getDB, saveDB, fmtDate } from '../data/mock';
import { toast } from '../components/ui/bits';

export default function Schedules() {
  const [db, setDb] = useState(getDB());
  const add = () => {
    const n = prompt('Schedule name:');
    if (!n) return;
    const d = getDB();
    d.schedules.push({ id: Date.now(), name: n, days: 'Mon–Fri', from: '08:00', to: '17:00', break: '12:00–13:00', type: 'Fixed', restDay: 'Sat, Sun' });
    saveDB(d); setDb({ ...getDB() }); toast('Schedule added');
  };
  const del = (id: number) => {
    const d = getDB();
    d.schedules = d.schedules.filter((s: any) => s.id !== id);
    saveDB(d); setDb({ ...getDB() }); toast('Schedule removed');
  };
  return (
    <>
      <div className="card p-4 mb-4 flex justify-between"><h3 className="font-bold text-sm">Work Schedules</h3><button className="btn btn-primary btn-sm" onClick={add}>+ Add Schedule</button></div>
      <div className="grid md:grid-cols-3 gap-4 mb-4">{db.schedules.map((s: any) => (
        <div key={s.id} className="card p-5"><h4 className="font-bold">{s.name}</h4><span className="badge badge-indigo mt-1">{s.type}</span>
          <p className="text-sm text-slate-500 mt-2">{s.days} · {s.from} – {s.to}</p><p className="text-xs text-slate-400">Break: {s.break}</p><p className="text-xs text-slate-400">Rest days: {s.restDay}</p>
          <button className="btn btn-danger btn-sm mt-3" onClick={() => del(s.id)}>Delete</button></div>
      ))}</div>
      <div className="card p-5"><h3 className="font-bold text-sm mb-3">Holidays</h3>
        {db.holidays.map((h: any) => (
          <div key={h.id} className="flex justify-between py-2 border-b border-slate-50 text-sm"><span>{h.name}</span><span className="text-slate-500">{fmtDate(h.date)} · <span className="badge badge-blue">{h.type}</span></span></div>
        ))}
      </div>
    </>
  );
}
