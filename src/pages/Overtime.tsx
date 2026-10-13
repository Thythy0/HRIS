import { useState } from 'react';
import { getDB, saveDB, empName, fmtDate } from '../data/mock';
import { Avatar, Badge, toast } from '../components/ui/bits';
import { pushRow } from '../lib/sync';
import { getChain, canActOn, stepLabel, decideOvertime } from '../lib/workflows';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';

function hrs(a: string, b: string) {
  const [h1, m1] = a.split(':').map(Number); const [h2, m2] = b.split(':').map(Number);
  if ([h1, m1, h2, m2].some(v => isNaN(v))) return 0;
  return Math.max(0, Math.round(((h2 * 60 + m2 - (h1 * 60 + m1)) / 60) * 100) / 100);
}

export default function Overtime() {
  const { user } = useAuth();
  const [db, setDb] = useState(getDB());
  const [filter, setFilter] = useState('All');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<any>({ date: '', start: '18:00', end: '20:00', reason: '', project: '' });
  const myEmployee = (db.employees ?? []).find((e: any) => e.name === user?.name);
  const chain = getChain('overtime');
  const all = db.overtimeRequests ?? [];
  const rows = all.filter((o: any) =>
    (user?.role !== 'Employee' || o.empId === myEmployee?.id) &&
    (filter === 'All' || o.status === filter)).slice().reverse();
  const approvedHrs = all.filter((o: any) => o.status === 'Approved' && (user?.role !== 'Employee' || o.empId === myEmployee?.id))
    .reduce((s: number, o: any) => s + (Number(o.hours) || 0), 0);
  const refresh = () => setDb({ ...getDB() });

  const submit = () => {
    if (!form.date || !form.reason) return toast('Date and reason required');
    if (!myEmployee) return toast('No employee record found');
    const h = hrs(form.start, form.end);
    if (!h) return toast('End time must be after start time');
    const d = getDB();
    const rec = { id: Date.now(), empId: myEmployee.id, empName: myEmployee.name, date: form.date, start: form.start, end: form.end, hours: h, reason: form.reason, project: form.project || '', status: 'Pending', stage: 0, history: [], doc: '' };
    d.overtimeRequests.push(rec);
    saveDB(d); pushRow('overtime_requests', rec);
    setShow(false); setForm({ date: '', start: '18:00', end: '20:00', reason: '', project: '' });
    refresh(); toast('Overtime request submitted');
  };

  const decide = (id: number, decision: 'approve' | 'reject') => {
    if (decideOvertime(id, decision, '', user)) { refresh(); toast(decision === 'approve' ? 'Overtime approved' : 'Overtime rejected'); }
    else toast('Could not update request');
  };

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {[['Pending', all.filter((o: any) => o.status === 'Pending').length, 'text-amber-700'], ['Approved hours', approvedHrs.toFixed(1) + 'h', 'text-emerald-700'], ['My requests', all.filter((o: any) => o.empId === myEmployee?.id).length, 'text-slate-800'], ['Approved → payroll', approvedHrs.toFixed(1) + 'h', 'text-blue-700']].map(([l, v, c]: any) => (
          <div key={l} className="card p-4"><p className="text-xs text-slate-500">{l}</p><p className={`text-xl font-extrabold tabular-nums mt-1 ${c}`}>{v}</p></div>
        ))}
      </div>
      <div className="flex items-center flex-wrap gap-3 mb-4">
        <div className="flex gap-2 flex-wrap">{['All', 'Pending', 'Approved', 'Rejected', 'Returned'].map(s => (
          <button key={s} className={`btn btn-outline btn-sm ${filter === s ? '!bg-indigo-50 !text-indigo-700 !border-indigo-200' : ''}`} onClick={() => setFilter(s)}>{s}</button>
        ))}</div>
        <div className="flex-1" />
        <button className="btn btn-primary btn-sm !px-5 shrink-0" onClick={() => setShow(true)}>+ Request Overtime</button>
      </div>
      <div className="card overflow-x-auto"><table className="table-sticky"><thead><tr><th>Employee</th><th>Date</th><th>Start–End</th><th>Hours</th><th>Reason / Project</th><th>Status</th><th>Stage</th><th>Actions</th></tr></thead>
        <tbody>{rows.map((o: any) => (
          <tr key={o.id}>
            <td><div className="flex items-center gap-2"><Avatar name={empName(db, o.empId)} /><span className="text-sm">{empName(db, o.empId)}</span></div></td>
            <td className="whitespace-nowrap">{fmtDate(o.date)}</td>
            <td className="text-xs whitespace-nowrap tabular-nums">{o.start}–{o.end}</td>
            <td className="tabular-nums font-semibold">{Number(o.hours).toFixed(1)}h</td>
            <td className="text-xs max-w-[200px]"><span className="truncate block">{o.reason}</span>{o.project && <span className="text-slate-400">{o.project}</span>}</td>
            <td><Badge status={o.status} /></td>
            <td><span className="text-xs text-slate-500">{o.status === 'Pending' ? stepLabel(o, chain) : '—'}</span></td>
            <td>{o.status === 'Pending' && canActOn(user, o, chain) ? (
              <div className="flex gap-2">
                <button className="btn btn-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100" onClick={() => decide(o.id, 'approve')}>Approve</button>
                <button className="btn btn-sm bg-red-50 text-red-700 hover:bg-red-100 border border-red-100" onClick={() => decide(o.id, 'reject')}>Reject</button>
              </div>
            ) : '—'}</td>
          </tr>
        ))}
        {!rows.length && <tr><td colSpan={8} className="text-center text-sm text-slate-400 py-6">No overtime requests. Overtime you request here flows into the Approval Center and payroll.</td></tr>}</tbody></table></div>
      {show && (
        <Modal size="sm" onClose={() => setShow(false)}>
          <h3 className="font-bold mb-4">Request Overtime</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="flabel">Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            <div><label className="flabel">Start</label><input type="time" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} /></div>
            <div><label className="flabel">End</label><input type="time" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} /></div>
            <div className="col-span-2 text-sm text-slate-500 tabular-nums">Total: <b>{hrs(form.start, form.end).toFixed(1)} hours</b> · goes to Supervisor → HR</div>
            <div className="col-span-2"><label className="flabel">Project / task</label><input value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} placeholder="Month-end closing" /></div>
            <div className="col-span-2"><label className="flabel">Reason</label><textarea rows={2} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-5"><button className="btn btn-outline" onClick={() => setShow(false)}>Cancel</button><button className="btn btn-primary" onClick={submit}>Submit</button></div>
        </Modal>
      )}
    </>
  );
}
