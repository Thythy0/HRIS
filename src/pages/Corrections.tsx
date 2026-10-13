import { useState } from 'react';
import { getDB, saveDB, empName, fmtDate } from '../data/mock';
import { Avatar, Badge, toast } from '../components/ui/bits';
import { pushRow } from '../lib/sync';
import { getChain, canActOn, stepLabel, decideCorrection } from '../lib/workflows';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';

export default function Corrections() {
  const { user } = useAuth();
  const [db, setDb] = useState(getDB());
  const [filter, setFilter] = useState('All');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<any>({ date: '', field: 'timeIn', requestedTime: '', reason: '' });
  const myEmployee = (db.employees ?? []).find((e: any) => e.name === user?.name);
  const chain = getChain('attendance_correction');
  const all = db.correctionRequests ?? [];
  const rows = all.filter((c: any) =>
    (user?.role !== 'Employee' || c.empId === myEmployee?.id) &&
    (filter === 'All' || c.status === filter)).slice().reverse();
  const refresh = () => setDb({ ...getDB() });

  const myRec = (date: string) => (db.attendance ?? []).find((a: any) => a.empId === myEmployee?.id && a.date === date);

  const submit = () => {
    if (!form.date || !form.requestedTime || !form.reason) return toast('Date, time, and reason required');
    if (!myEmployee) return toast('No employee record found');
    const rec = myRec(form.date);
    const original = rec ? (form.field === 'timeIn' ? rec.timeIn : rec.timeOut) : '—';
    const d = getDB();
    const entry = { id: Date.now(), empId: myEmployee.id, empName: myEmployee.name, date: form.date, field: form.field, originalTime: original ?? '—', requestedTime: form.requestedTime, reason: form.reason, status: 'Pending', stage: 0, history: [], doc: '' };
    d.correctionRequests.push(entry);
    saveDB(d); pushRow('correction_requests', entry);
    setShow(false); setForm({ date: '', field: 'timeIn', requestedTime: '', reason: '' });
    refresh(); toast('Correction request submitted');
  };

  const decide = (id: number, decision: 'approve' | 'reject') => {
    if (decideCorrection(id, decision, '', user)) { refresh(); toast(decision === 'approve' ? 'Correction approved and applied' : 'Correction rejected'); }
    else toast('Could not update request');
  };

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {[['Pending', all.filter((c: any) => c.status === 'Pending').length, 'text-amber-700'], ['Applied', all.filter((c: any) => c.status === 'Approved').length, 'text-emerald-700'], ['My requests', all.filter((c: any) => c.empId === myEmployee?.id).length, 'text-slate-800'], ['Rejected / returned', all.filter((c: any) => c.status === 'Rejected' || c.status === 'Returned').length, 'text-red-600']].map(([l, v, c]: any) => (
          <div key={l} className="card p-4"><p className="text-xs text-slate-500">{l}</p><p className={`text-xl font-extrabold tabular-nums mt-1 ${c}`}>{v}</p></div>
        ))}
      </div>
      <div className="flex items-center flex-wrap gap-3 mb-4">
        <div className="flex gap-2 flex-wrap">{['All', 'Pending', 'Approved', 'Rejected', 'Returned'].map(s => (
          <button key={s} className={`btn btn-outline btn-sm ${filter === s ? '!bg-indigo-50 !text-indigo-700 !border-indigo-200' : ''}`} onClick={() => setFilter(s)}>{s}</button>
        ))}</div>
        <div className="flex-1" />
        <button className="btn btn-primary btn-sm !px-5 shrink-0" onClick={() => setShow(true)}>+ Request Correction</button>
      </div>
      <div className="card overflow-x-auto"><table className="table-sticky"><thead><tr><th>Employee</th><th>Date</th><th>Field</th><th>Original → Requested</th><th>Reason</th><th>Status</th><th>Stage</th><th>Actions</th></tr></thead>
        <tbody>{rows.map((c: any) => (
          <tr key={c.id}>
            <td><div className="flex items-center gap-2"><Avatar name={empName(db, c.empId)} /><span className="text-sm">{empName(db, c.empId)}</span></div></td>
            <td className="whitespace-nowrap">{fmtDate(c.date)}</td>
            <td className="text-xs">{c.field === 'timeIn' ? 'Time in' : 'Time out'}</td>
            <td className="text-xs whitespace-nowrap tabular-nums">{c.originalTime} → <b>{c.requestedTime}</b></td>
            <td className="text-xs max-w-[200px] truncate">{c.reason}</td>
            <td><Badge status={c.status} /></td>
            <td><span className="text-xs text-slate-500">{c.status === 'Pending' ? stepLabel(c, chain) : '—'}</span></td>
            <td>{c.status === 'Pending' && canActOn(user, c, chain) ? (
              <div className="flex gap-2">
                <button className="btn btn-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100" onClick={() => decide(c.id, 'approve')}>Approve</button>
                <button className="btn btn-sm bg-red-50 text-red-700 hover:bg-red-100 border border-red-100" onClick={() => decide(c.id, 'reject')}>Reject</button>
              </div>
            ) : '—'}</td>
          </tr>
        ))}
        {!rows.length && <tr><td colSpan={8} className="text-center text-sm text-slate-400 py-6">No correction requests. Approved corrections update the attendance record automatically.</td></tr>}</tbody></table></div>
      {show && (
        <Modal size="sm" onClose={() => setShow(false)}>
          <h3 className="font-bold mb-4">Request Correction</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="flabel">Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            <div><label className="flabel">Field</label><select value={form.field} onChange={e => setForm({ ...form, field: e.target.value })}><option value="timeIn">Time in</option><option value="timeOut">Time out</option></select></div>
            <div><label className="flabel">Requested time</label><input value={form.requestedTime} onChange={e => setForm({ ...form, requestedTime: e.target.value })} placeholder="08:03 AM" /></div>
            {form.date && <div className="col-span-2 text-sm text-slate-500">Original {form.field === 'timeIn' ? 'time in' : 'time out'}: <b>{(() => { const r = myRec(form.date); return r ? (form.field === 'timeIn' ? r.timeIn : r.timeOut) : '—'; })()}</b></div>}
            <div className="col-span-2"><label className="flabel">Reason</label><textarea rows={2} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></div>
          </div>
          <p className="text-xs text-slate-400 mt-3">Goes to Supervisor → HR. On final approval the attendance record updates itself.</p>
          <div className="flex justify-end gap-2 mt-4"><button className="btn btn-outline" onClick={() => setShow(false)}>Cancel</button><button className="btn btn-primary" onClick={submit}>Submit</button></div>
        </Modal>
      )}
    </>
  );
}
