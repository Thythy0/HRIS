import React, { useState } from 'react';
import { getDB, saveDB, empName } from '../data/mock';
const fmtDate = (d: any) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(+dt)) return '—';
  return `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}/${dt.getFullYear()}`;
};
import { Avatar, Badge, toast } from '../components/ui/bits';
import { pushRow } from '../lib/sync';
import { getChain, canActOn, stepLabel, decideLeave } from '../lib/workflows';
import { UploadCloud } from 'lucide-react';
import Modal from '../components/ui/Modal';

export default function Leave() {
  const [db, setDb] = useState(getDB());
  const [filter, setFilter] = useState('All');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<any>({ typeId: 1, days: 1, start: '', end: '', reason: '' });
  const user = (() => { try { return JSON.parse(localStorage.getItem('hrsuite_user') || 'null'); } catch { return null; } })();
  const myEmployee = db.employees.find((e: any) => e.name === user?.name);
  const rows = db.leaveRequests.filter((l: any) =>
    (user?.role !== 'Employee' || l.empId === myEmployee?.id) &&
    (filter === 'All' || l.status === filter));
  const chain = getChain('leave');
  const refresh = () => setDb({ ...getDB() });
  const action = (id: number, status: string) => {
    if (status === 'Approved' || status === 'Rejected') {
      const ok = decideLeave(id, status === 'Approved' ? 'approve' : 'reject', '', user);
      if (!ok) return toast('Request not found');
      refresh(); toast(`Leave ${status.toLowerCase()}`);
    } else {
      const d = getDB(); const l = d.leaveRequests.find((x: any) => x.id === id);
      if (!l) return toast('Request not found');
      l.status = 'Pending'; l.stage = 0;
      saveDB(d); pushRow('leave_requests', l); refresh(); toast('Change request sent');
    }
  };
  const submit = () => {
    if (!form.start || !form.reason) return toast('Complete required fields');
    if (!myEmployee) return toast('No employee record found');
    const d = getDB();
    const rec = { id: Date.now(), empId: myEmployee.id, empName: myEmployee.name, typeId: +form.typeId, start: form.start, end: form.end || form.start, days: +form.days || 1, reason: form.reason, status: 'Pending', stage: 0, history: [], doc: form.doc || '' };
    d.leaveRequests.push(rec);
    saveDB(d); pushRow('leave_requests', rec); setShow(false); refresh(); toast('Leave request submitted');
  };

  return (
    <>
      <div className="flex items-center flex-wrap gap-4 mb-6">
        <div className="flex gap-2 flex-wrap">{['All','Pending','Approved','Rejected','Cancelled'].map(s => (
          <button key={s} className={`btn btn-outline btn-sm ${filter === s ? '!bg-indigo-50 !text-indigo-700 !border-indigo-200' : ''}`} onClick={() => setFilter(s)}>{s}</button>
        ))}</div>
        <div className="flex-1" />
        <button className="btn btn-primary btn-sm !px-5 shrink-0 self-center" onClick={() => setShow(true)}>+ Request Leave</button>
      </div>
      <div className="card overflow-x-auto"><table className="table-sticky"><thead><tr><th>Employee</th><th>Type</th><th>Start</th><th>End</th><th>Days</th><th>Reason</th><th>Document</th><th>Status</th><th>Stage</th><th>Actions</th></tr></thead>
        <tbody>{rows.map((l: any) => (
          <tr key={l.id}>
            <td><div className="flex items-center gap-2"><Avatar name={empName(db, l.empId)} /><span className="text-sm">{empName(db, l.empId)}</span></div></td>
            <td>{db.leaveTypes.find((t: any) => t.id === l.typeId)?.name}</td><td>{fmtDate(l.start)}</td><td>{fmtDate(l.end)}</td><td>{l.days}</td>
            <td className="text-xs max-w-[180px] truncate">{l.reason}</td><td>{l.doc ? <span className="badge badge-blue">{l.doc}</span> : '—'}</td><td><Badge status={l.status} /></td>
            <td><span className="text-xs text-slate-500">{l.status === 'Pending' ? stepLabel(l, chain) : '—'}</span></td>
            <td>{l.status === 'Pending' && canActOn(user, l, chain) ? (
              <div className="flex gap-2">
                <button className="btn btn-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100" onClick={() => action(l.id, 'Approved')}>Approve</button>
                <button className="btn btn-sm bg-red-50 text-red-700 hover:bg-red-100 border border-red-100" onClick={() => action(l.id, 'Rejected')}>Reject</button>
              </div>
            ) : '—'}</td>
          </tr>
        ))}</tbody></table></div>
      {show && (
        <Modal size="sm" onClose={() => setShow(false)}>
          <h3 className="font-bold mb-4">Request Leave</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="flabel">Leave Type</label><select value={form.typeId} onChange={e => setForm({ ...form, typeId: e.target.value })}>{db.leaveTypes.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            <div><label className="flabel">Number of Days</label><input type="number" min="1" value={form.days} onChange={e => setForm({ ...form, days: e.target.value })} /></div>
            <div><label className="flabel">Start Date</label><input type="date" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} /></div>
            <div><label className="flabel">End Date</label><input type="date" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} /></div>
            <div className="col-span-2"><label className="flabel">Reason</label><textarea rows={2} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}></textarea></div>
            <div className="col-span-2">
              <label className="flabel">Supporting Document</label>
              <input type="file" id="leaveDocFile" className="hidden" onChange={e => setForm({ ...form, doc: e.target.files?.[0]?.name || '' })} />
              <label htmlFor="leaveDocFile" className="flex items-center gap-2 w-full border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-lg px-4 py-5 text-sm text-slate-500 cursor-pointer transition-colors justify-center">
                <UploadCloud size={18} className="text-slate-400" />
                {form.doc ? <span className="font-medium text-slate-700">{form.doc}</span> : <span>Click to upload a document</span>}
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5"><button className="btn btn-outline" onClick={() => setShow(false)}>Cancel</button><button className="btn btn-primary" onClick={submit}>Submit</button></div>
        </Modal>
      )}
    </>
  );
}
