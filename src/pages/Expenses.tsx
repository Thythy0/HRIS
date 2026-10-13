import { useState } from 'react';
import { getDB, saveDB, empName, fmtDate, peso } from '../data/mock';
import { Avatar, Badge, toast, exportCSV } from '../components/ui/bits';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { pushRow } from '../lib/sync';
import { getChain, canActOn, stepLabel, decideExpense } from '../lib/workflows';
import { EXPENSE_CATEGORIES, markExpensePaid } from '../lib/experience';
import { logAudit } from '../lib/audit';

export default function Expenses() {
  const { user } = useAuth();
  const [db, setDb] = useState(getDB());
  const [filter, setFilter] = useState('All');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<any>({ category: EXPENSE_CATEGORIES[0], amount: '', date: '', description: '', receipt: '' });
  const myEmployee = (db.employees ?? []).find((e: any) => e.name === user?.name);
  const chain = getChain('expense');
  const all = db.expenses ?? [];
  const rows = all.filter((e: any) => (user?.role === 'Employee' ? e.empId === myEmployee?.id : true) && (filter === 'All' || e.status === filter)).slice().reverse();
  const refresh = () => setDb({ ...getDB() });

  const submit = () => {
    if (!(+form.amount > 0) || !form.date) return toast('Amount and date required');
    const d = getDB();
    const rec = { id: Date.now(), empId: myEmployee?.id ?? 0, empName: myEmployee?.name ?? user?.name ?? '', category: form.category, amount: +form.amount, date: form.date, receipt: form.receipt, description: form.description, status: 'Pending', stage: 0, history: [] };
    d.expenses.push(rec);
    saveDB(d); pushRow('expenses', rec); logAudit('Expense submitted', 'Expense', `${rec.category} ${rec.amount}`);
    setShow(false); refresh(); toast('Expense submitted');
  };

  const decide = (id: number, dec: 'approve' | 'reject') => {
    if (decideExpense(id, dec, '', user)) refresh();
    else toast('Could not update — check role/step');
  };

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {([['Pending', all.filter((e: any) => e.status === 'Pending').length, 'text-amber-700'], ['Approved', peso(all.filter((e: any) => e.status === 'Approved').reduce((s: number, x: any) => s + (+x.amount || 0), 0)), 'text-emerald-700'], ['Paid', peso(all.filter((e: any) => e.status === 'Paid').reduce((s: number, x: any) => s + (+x.amount || 0), 0)), 'text-blue-700'], ['My total', peso(all.filter((e: any) => e.empId === myEmployee?.id).reduce((s: number, x: any) => s + (+x.amount || 0), 0)), 'text-slate-800']] as any).map(([l, v, c]: any) => (
          <div key={l} className="card p-4"><p className="text-xs text-slate-500">{l}</p><p className={`text-xl font-extrabold tabular-nums mt-1 ${c}`}>{v}</p></div>
        ))}
      </div>
      <div className="flex items-center flex-wrap gap-3 mb-4">
        <div className="flex gap-2 flex-wrap">{['All', 'Pending', 'Approved', 'Paid', 'Rejected'].map(s => (
          <button key={s} className={`btn btn-outline btn-sm ${filter === s ? '!bg-indigo-50 !text-indigo-700 !border-indigo-200' : ''}`} onClick={() => setFilter(s)}>{s}</button>
        ))}</div>
        <div className="flex-1" />
        <button className="btn btn-outline btn-sm" onClick={() => exportCSV(rows.map((r: any) => ({ Employee: r.empName, Category: r.category, Amount: r.amount, Date: r.date, Status: r.status })), 'expenses')}>Export</button>
        <button className="btn btn-primary btn-sm" onClick={() => setShow(true)}>+ New Expense</button>
      </div>
      <div className="card overflow-x-auto"><table><thead><tr><th>Employee</th><th>Category</th><th>Amount</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{rows.map((e: any) => (
          <tr key={e.id}>
            <td><div className="flex items-center gap-2"><Avatar name={e.empName || empName(db, e.empId)} /><span className="text-sm">{e.empName || empName(db, e.empId)}</span></div></td>
            <td className="text-xs">{e.category}<br /><span className="text-slate-400">{e.description}</span></td>
            <td className="tabular-nums font-semibold">{peso(e.amount)}</td>
            <td className="text-xs whitespace-nowrap">{fmtDate(e.date)}</td>
            <td><div className="flex flex-col gap-1"><Badge status={e.status} />{e.status === 'Pending' && <span className="text-[11px] text-slate-400">{stepLabel(e, chain)}</span>}</div></td>
            <td><div className="flex gap-2">
              {e.status === 'Pending' && canActOn(user, e, chain) && (<>
                <button className="btn btn-sm bg-emerald-50 text-emerald-700 border border-emerald-100" onClick={() => decide(e.id, 'approve')}>Approve</button>
                <button className="btn btn-sm bg-red-50 text-red-700 border border-red-100" onClick={() => decide(e.id, 'reject')}>Reject</button>
              </>)}
              {e.status === 'Approved' && (user?.role === 'Finance' || user?.role === 'Super Admin' || user?.role === 'HR/Admin') && <button className="btn btn-outline btn-sm" onClick={() => { markExpensePaid(e.id); refresh(); }}>Mark paid</button>}
            </div></td>
          </tr>
        ))}
        {!rows.length && <tr><td colSpan={6} className="text-center text-sm text-slate-400 py-6">No expenses. Employee → Supervisor → Finance → Paid.</td></tr>}</tbody></table></div>
      {show && (
        <Modal size="sm" onClose={() => setShow(false)}>
          <h3 className="font-bold mb-4">New Expense</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="flabel">Category</label><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
            <div><label className="flabel">Amount</label><input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
            <div><label className="flabel">Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            <div><label className="flabel">Receipt ref</label><input value={form.receipt} onChange={e => setForm({ ...form, receipt: e.target.value })} placeholder="OR #…" /></div>
            <div className="col-span-2"><label className="flabel">Description</label><textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-5"><button className="btn btn-outline" onClick={() => setShow(false)}>Cancel</button><button className="btn btn-primary" onClick={submit}>Submit</button></div>
        </Modal>
      )}
    </>
  );
}
