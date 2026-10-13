import { useState } from 'react';
import { getDB, saveDB, fmtDate } from '../data/mock';
import { toast } from '../components/ui/bits';
import { activeAnnouncements } from '../lib/experience';

export default function Notifications() {
  const [db, setDb] = useState(getDB());
  const safeParse = () => { try { return JSON.parse(localStorage.getItem('hrsuite_user') || 'null'); } catch { return null; } };
  const user = safeParse();
  const isEmployee = user?.role === 'Employee';
  const all = Array.isArray(db?.notifications) ? db.notifications : [];
  const visible = isEmployee
    ? all.filter((n: any) => /payroll|payslip|upcoming|announcement/i.test(n.text ?? ''))
    : all;
  const ann = activeAnnouncements(db, user);
  const markRead = () => { const d = getDB(); d.notifications.forEach((n: any) => n.unread = false); saveDB(d); setDb({ ...getDB() }); toast('All marked read'); };
  return (
    <div className="space-y-4">
      {!!ann.length && (
        <div className="card p-5">
          <h3 className="font-bold text-sm mb-3">Announcements ({ann.length})</h3>
          {ann.map((a: any) => (
            <div key={a.id} className="py-2 border-b border-slate-50 last:border-0"><p className="text-sm font-medium">{a.title}</p><p className="text-xs text-slate-500">{a.body}</p><p className="text-[11px] text-slate-400 mt-1">{a.by} · {fmtDate(a.published)}</p></div>
          ))}
        </div>
      )}
      <div className="card p-5">
        <div className="flex justify-between mb-3"><h3 className="font-bold text-sm">Notifications</h3><button className="btn btn-outline btn-sm" onClick={markRead}>Mark all read</button></div>
        {visible.length === 0 && <p className="text-sm text-slate-400 py-4">No announcements yet.</p>}
        {visible.map((n: any) => (
          <div key={n.id} className="flex justify-between items-center py-3 border-b border-slate-50">
            <div className="flex items-center gap-3">{n.unread ? <span className="w-2 h-2 rounded-full bg-indigo-500"></span> : <span className="w-2 h-2"></span>}<span className="text-sm">{n.text}</span></div>
            <span className="text-xs text-slate-400">{n.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
