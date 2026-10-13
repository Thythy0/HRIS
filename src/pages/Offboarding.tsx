import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getDB, empName, fmtDate } from '../data/mock';
import { Avatar, Badge, toast } from '../components/ui/bits';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { startOffboarding, toggleOffboarding, completeOffboarding, checklistProgress } from '../lib/lifecycle';

export default function Offboarding() {
  const { user } = useAuth();
  if (user?.role !== 'Super Admin' && user?.role !== 'HR/Admin') return <Navigate to="/dashboard" replace />;
  const [db, setDb] = useState(getDB());
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<any>({ empId: 0, type: 'Resignation', lastDay: '' });
  const refresh = () => setDb({ ...getDB() });
  const canEdit = user?.role === 'Super Admin' || user?.role === 'HR/Admin';
  const list = db.offboarding ?? [];
  const active = db.employees.filter((e: any) => e.status === 'Active');

  const start = () => {
    if (!form.empId || !form.lastDay) return toast('Employee and last day required');
    const id = startOffboarding(+form.empId, form.type, form.lastDay);
    if (!id) return toast('Already has an active offboarding');
    setShow(false); refresh(); toast('Offboarding started');
  };

  const toggle = (id: number, idx: number) => { if (toggleOffboarding(id, idx)) refresh(); };
  const done = (id: number) => {
    if (!confirm('Complete this exit? The employee will be archived. Run final payroll afterwards.')) return;
    if (completeOffboarding(id, user)) { refresh(); toast('Exited — run final payroll for this employee'); }
    else toast('Complete every clearance item first');
  };

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {([['In progress', list.filter((o: any) => o.status === 'In Progress').length, 'text-amber-700'], ['Exited', list.filter((o: any) => o.status === 'Exited').length, 'text-slate-800'], ['Resignations', list.filter((o: any) => o.type === 'Resignation').length, 'text-blue-700'], ['Terminations', list.filter((o: any) => o.type === 'Termination').length, 'text-red-600']] as any).map(([l, v, c]: any) => (
          <div key={l} className="card p-4"><p className="text-xs text-slate-500">{l}</p><p className={`text-xl font-extrabold tabular-nums mt-1 ${c}`}>{v}</p></div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        <span className="badge badge-blue">Resignation → Clearance → Final payroll → Exit</span>
        <div className="flex-1" />
        {canEdit && <button className="btn btn-primary btn-sm" onClick={() => { setForm({ empId: active[0]?.id ?? 0, type: 'Resignation', lastDay: '' }); setShow(true); }}>+ Start Offboarding</button>}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {list.slice().reverse().map((o: any) => {
          const pct = checklistProgress(o.clearance ?? []);
          const ready = (o.clearance ?? []).every((c: any) => c.done);
          return (
            <div key={o.id} className="card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Avatar name={o.empName ?? empName(db, o.empId)} />
                <div><p className="text-sm font-medium">{o.empName ?? empName(db, o.empId)}</p><p className="text-[11px] text-slate-400">{o.type} · last day {fmtDate(o.lastDay)}</p></div>
                <span className="ml-auto"><Badge status={o.status} /></span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden my-3"><div className="h-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} /></div>
              <div className="space-y-1.5">
                {o.clearance.map((c: any, i: number) => (
                  <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={!!c.done} disabled={!canEdit || o.status !== 'In Progress'} onChange={() => toggle(o.id, i)} />
                    <span className={c.done ? 'line-through text-slate-400' : ''}>{c.label}</span>
                  </label>
                ))}
              </div>
              {o.status === 'In Progress' && canEdit && (
                <button className="btn btn-primary btn-sm mt-4" disabled={!ready} onClick={() => done(o.id)}>Complete exit{ready ? '' : ` (${pct}%)`}</button>
              )}
              {o.status === 'Exited' && <p className="text-xs text-slate-400 mt-3">Exited. Include in next payroll run as final pay, then archive is automatic.</p>}
            </div>
          );
        })}
        {!list.length && <div className="card p-6 text-sm text-slate-400 md:col-span-2">No offboardings. Start one for resignations or terminations; completion archives the employee.</div>}
      </div>

      {show && (
        <Modal size="sm" onClose={() => setShow(false)}>
          <h3 className="font-bold mb-4">Start Offboarding</h3>
          <label className="flabel">Employee</label>
          <select value={form.empId} onChange={e => setForm({ ...form, empId: +e.target.value })}>{active.map((e: any) => <option key={e.id} value={e.id}>{e.name} · {e.code}</option>)}</select>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div><label className="flabel">Type</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option>Resignation</option><option>Termination</option></select></div>
            <div><label className="flabel">Last day</label><input type="date" value={form.lastDay} onChange={e => setForm({ ...form, lastDay: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-5"><button className="btn btn-outline" onClick={() => setShow(false)}>Cancel</button><button className="btn btn-primary" onClick={start}>Start</button></div>
        </Modal>
      )}
    </>
  );
}
