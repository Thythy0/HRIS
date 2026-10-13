import { useState } from 'react';
import { getDB, saveDB, empName, fmtDate } from '../data/mock';
import { Avatar, Badge, toast } from '../components/ui/bits';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { pushRow } from '../lib/sync';
import { getChain, canActOn, stepLabel, decideHrRequest } from '../lib/workflows';
import { HR_REQUEST_TYPES } from '../lib/experience';
import { completeHrRequest } from '../lib/experience';
import { logAudit } from '../lib/audit';

export default function Requests() {
  const { user } = useAuth();
  const [db, setDb] = useState(getDB());
  const [filter, setFilter] = useState('All');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<any>({ type: HR_REQUEST_TYPES[0], details: '' });
  const myEmployee = (db.employees ?? []).find((e: any) => e.name === user?.name);
  const chain = getChain('hr_request');
  const all = db.hrRequests ?? [];
  const rows = all.filter((r: any) => (user?.role === 'Employee' ? r.empId === myEmployee?.id : true) && (filter === 'All' || r.status === filter)).slice().reverse();
  const refresh = () => setDb({ ...getDB() });

  const submit = () => {
    if (!form.details) return toast('Details required');
    if (!myEmployee && user?.role === 'Employee') return toast('No employee record');
    const d = getDB();
    const rec = { id: Date.now(), empId: myEmployee?.id ?? 0, empName: myEmployee?.name ?? user?.name ?? '', type: form.type, details: form.details, status: 'Pending', stage: 0, history: [], created: new Date().toISOString().slice(0, 10) };
    d.hrRequests.push(rec);
    saveDB(d); pushRow('hr_requests', rec); logAudit('HR request submitted', 'HR Request', rec.type);
    setShow(false); refresh(); toast('Request submitted');
  };

  const decide = (id: number, dec: 'approve' | 'reject') => {
    if (decideHrRequest(id, dec, '', user)) refresh();
    else toast('Could not update — check role/step');
  };

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {([['Pending', all.filter((r: any) => r.status === 'Pending').length, 'text-amber-700'], ['Approved', all.filter((r: any) => r.status === 'Approved').length, 'text-emerald-700'], ['Completed', all.filter((r: any) => r.status === 'Completed').length, 'text-blue-700'], ['My requests', all.filter((r: any) => r.empId === myEmployee?.id).length, 'text-slate-800']] as any).map(([l, v, c]: any) => (
          <div key={l} className="card p-4"><p className="text-xs text-slate-500">{l}</p><p className={`text-xl font-extrabold tabular-nums mt-1 ${c}`}>{v}</p></div>
        ))}
      </div>
      <div className="flex items-center flex-wrap gap-3 mb-4">
        <div className="flex gap-2 flex-wrap">{['All', 'Pending', 'Approved', 'Completed', 'Rejected'].map(s => (
          <button key={s} className={`btn btn-outline btn-sm ${filter === s ? '!bg-indigo-50 !text-indigo-700 !border-indigo-200' : ''}`} onClick={() => setFilter(s)}>{s}</button>
        ))}</div>
        <div className="flex-1" />
        <button className="btn btn-primary btn-sm" onClick={() => setShow(true)}>+ New Request</button>
      </div>
      <div className="card overflow-x-auto"><table><thead><tr><th>Requester</th><th>Type</th><th>Details</th><th>Status</th><th>Stage</th><th>Actions</th></tr></thead>
        <tbody>{rows.map((r: any) => (
          <tr key={r.id}>
            <td><div className="flex items-center gap-2"><Avatar name={r.empName || empName(db, r.empId)} /><span className="text-sm">{r.empName || empName(db, r.empId)}</span></div></td>
            <td className="text-xs font-medium">{r.type}</td>
            <td className="text-xs max-w-[260px] truncate">{r.details}</td>
            <td><Badge status={r.status} /></td>
            <td><span className="text-xs text-slate-500">{r.status === 'Pending' ? stepLabel(r, chain) : '—'}</span></td>
            <td><div className="flex gap-2">
              {r.status === 'Pending' && canActOn(user, r, chain) && (<>
                <button className="btn btn-sm bg-emerald-50 text-emerald-700 border border-emerald-100" onClick={() => decide(r.id, 'approve')}>Approve</button>
                <button className="btn btn-sm bg-red-50 text-red-700 border border-red-100" onClick={() => decide(r.id, 'reject')}>Reject</button>
              </>)}
              {r.status === 'Approved' && user?.role !== 'Employee' && <button className="btn btn-outline btn-sm" onClick={() => { completeHrRequest(r.id); refresh(); }}>Complete</button>}
              {!canActOn(user, r, chain) && r.status === 'Pending' && <span className="text-xs text-slate-400">Waiting</span>}
            </div></td>
          </tr>
        ))}
        {!rows.length && <tr><td colSpan={6} className="text-center text-sm text-slate-400 py-6">No HR requests. COE, verification, and document requests live here.</td></tr>}</tbody></table></div>
      {show && (
        <Modal size="sm" onClose={() => setShow(false)}>
          <h3 className="font-bold mb-4">New HR Request</h3>
          <label className="flabel">Type</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{HR_REQUEST_TYPES.map(t => <option key={t}>{t}</option>)}</select>
          <label className="flabel mt-3">Details</label><textarea rows={3} value={form.details} onChange={e => setForm({ ...form, details: e.target.value })} placeholder="Purpose, needed date…" />
          <div className="flex justify-end gap-2 mt-5"><button className="btn btn-outline" onClick={() => setShow(false)}>Cancel</button><button className="btn btn-primary" onClick={submit}>Submit</button></div>
        </Modal>
      )}
    </>
  );
}
