import { useState } from 'react';
import { getDB, saveDB, empName, fmtDate } from '../data/mock';
import { Badge, toast, exportCSV } from '../components/ui/bits';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { pushRow } from '../lib/sync';
import { DOC_CATEGORIES, docsExpiringSoon } from '../lib/experience';
import { logAudit } from '../lib/audit';

export default function Documents() {
  const { user } = useAuth();
  const [db, setDb] = useState(getDB());
  const [filter, setFilter] = useState('All');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<any>({ empId: 0, name: '', category: DOC_CATEGORIES[0], file: '', expiry: '' });
  const myEmployee = (db.employees ?? []).find((e: any) => e.name === user?.name);
  const isHr = user?.role === 'Super Admin' || user?.role === 'HR/Admin' || user?.role === 'Manager';
  const all = (db.documents ?? []).filter((d: any) => (isHr ? true : d.empId === myEmployee?.id));
  const rows = all.filter((d: any) => filter === 'All' || d.category === filter).slice().reverse();
  const expiring = docsExpiringSoon(db).filter((d: any) => isHr || d.empId === myEmployee?.id);
  const refresh = () => setDb({ ...getDB() });

  const save = () => {
    if (!form.empId || !form.name) return toast('Employee and name required');
    const d = getDB();
    const rec = { id: Date.now(), empId: +form.empId, name: form.name, category: form.category, file: form.file || form.name, expiry: form.expiry || '', status: 'Active' };
    d.documents.push(rec);
    saveDB(d); pushRow('employee_documents', rec); logAudit('Document added', 'Documents', `${rec.name}`);
    setShow(false); refresh(); toast('Document saved');
  };

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {([['Total', all.length, 'text-slate-800'], ['Expiring ≤30d', expiring.length, 'text-amber-700'], ['Contracts', all.filter((d: any) => d.category === 'Contracts').length, 'text-blue-700'], ['My files', all.filter((d: any) => d.empId === myEmployee?.id).length, 'text-emerald-700']] as any).map(([l, v, c]: any) => (
          <div key={l} className="card p-4"><p className="text-xs text-slate-500">{l}</p><p className={`text-xl font-extrabold tabular-nums mt-1 ${c}`}>{v}</p></div>
        ))}
      </div>
      {!!expiring.length && (
        <div className="card p-4 mb-4"><h3 className="font-bold text-sm mb-2">Expiring soon</h3>
          {expiring.slice(0, 5).map((d: any) => <div key={d.id} className="flex justify-between text-sm py-1 border-b border-slate-50 last:border-0"><span>{empName(db, d.empId)} · {d.name}</span><span className="text-amber-700 text-xs">expires {fmtDate(d.expiry)}</span></div>)}
        </div>
      )}
      <div className="flex items-center flex-wrap gap-3 mb-4">
        <div className="flex gap-2 flex-wrap">{['All', ...DOC_CATEGORIES].map(s => (
          <button key={s} className={`btn btn-outline btn-sm ${filter === s ? '!bg-indigo-50 !text-indigo-700 !border-indigo-200' : ''}`} onClick={() => setFilter(s)}>{s}</button>
        ))}</div>
        <div className="flex-1" />
        <button className="btn btn-outline btn-sm" onClick={() => exportCSV(rows.map((r: any) => ({ Employee: empName(db, r.empId), Name: r.name, Category: r.category, Expiry: r.expiry, Status: r.status })), 'documents')}>Export</button>
        {isHr && <button className="btn btn-primary btn-sm" onClick={() => { setForm({ empId: db.employees[0]?.id ?? 0, name: '', category: DOC_CATEGORIES[0], file: '', expiry: '' }); setShow(true); }}>+ Add Document</button>}
      </div>
      <div className="card overflow-x-auto"><table><thead><tr><th>Employee</th><th>Document</th><th>Category</th><th>Expiry</th><th>Status</th></tr></thead>
        <tbody>{rows.map((d: any) => (
          <tr key={d.id}>
            <td className="text-sm">{empName(db, d.empId)}</td>
            <td className="text-sm font-medium">{d.name}<br /><span className="text-[11px] text-slate-400">{d.file}</span></td>
            <td className="text-xs">{d.category}</td>
            <td className="text-xs whitespace-nowrap">{d.expiry ? fmtDate(d.expiry) : '—'}</td>
            <td><Badge status={d.status} /></td>
          </tr>
        ))}
        {!rows.length && <tr><td colSpan={5} className="text-center text-sm text-slate-400 py-6">No documents.</td></tr>}</tbody></table></div>
      {show && (
        <Modal size="sm" onClose={() => setShow(false)}>
          <h3 className="font-bold mb-4">Add Document</h3>
          <label className="flabel">Employee</label><select value={form.empId} onChange={e => setForm({ ...form, empId: +e.target.value })}>{db.employees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
          <label className="flabel mt-3">Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Employment contract" />
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div><label className="flabel">Category</label><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{DOC_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
            <div><label className="flabel">Expiry</label><input type="date" value={form.expiry} onChange={e => setForm({ ...form, expiry: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-5"><button className="btn btn-outline" onClick={() => setShow(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></div>
        </Modal>
      )}
    </>
  );
}
