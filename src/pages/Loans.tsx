import { useState } from 'react';
import { getDB, saveDB, empName, fmtDate, peso } from '../data/mock';
import { Avatar, Badge, toast } from '../components/ui/bits';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { pushRow } from '../lib/sync';
import { getChain, canActOn, stepLabel, decideLoan } from '../lib/workflows';
import { recordLoanPayment } from '../lib/experience';
import { logAudit } from '../lib/audit';

export default function Loans() {
  const { user } = useAuth();
  const [db, setDb] = useState(getDB());
  const [filter, setFilter] = useState('All');
  const [show, setShow] = useState(false);
  const [payFor, setPayFor] = useState<number | null>(null);
  const [payAmt, setPayAmt] = useState('');
  const [form, setForm] = useState<any>({ type: 'Loan', amount: 10000, installments: 4, reason: '', startDate: '' });
  const myEmployee = (db.employees ?? []).find((e: any) => e.name === user?.name);
  const chain = getChain('loan');
  const all = db.loans ?? [];
  const rows = all.filter((l: any) => (user?.role === 'Employee' ? l.empId === myEmployee?.id : true) && (filter === 'All' || l.status === filter)).slice().reverse();
  const refresh = () => setDb({ ...getDB() });

  const submit = () => {
    const amount = +form.amount || 0;
    const inst = Math.max(1, +form.installments || 1);
    if (amount <= 0) return toast('Amount must be positive');
    if (!myEmployee && user?.role === 'Employee') return toast('No employee record');
    const per = Math.round((amount / inst) * 100) / 100;
    const d = getDB();
    const rec = { id: Date.now(), empId: myEmployee?.id ?? 0, empName: myEmployee?.name ?? user?.name ?? '', type: form.type, amount, installments: inst, deductedPerPay: per, remaining: amount, paid: 0, startDate: form.startDate || new Date().toISOString().slice(0, 10), status: 'Pending', stage: 0, history: [], reason: form.reason };
    d.loans.push(rec);
    saveDB(d); pushRow('loans', rec); logAudit('Loan requested', 'Loans', `${rec.type} ${amount}`);
    setShow(false); refresh(); toast(`Submitted — ${peso(per)} × ${inst} pays`);
  };

  const decide = (id: number, dec: 'approve' | 'reject') => {
    if (decideLoan(id, dec, '', user)) refresh();
    else toast('Could not update — check role/step');
  };

  const pay = () => {
    if (payFor == null) return;
    if (recordLoanPayment(payFor, +payAmt || 0, user)) { setPayFor(null); setPayAmt(''); refresh(); toast('Payment posted'); }
    else toast('Invalid amount');
  };

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {([['Active', all.filter((l: any) => l.status === 'Active').length, 'text-emerald-700'], ['Pending', all.filter((l: any) => l.status === 'Pending').length, 'text-amber-700'], ['Outstanding', peso(all.filter((l: any) => l.status === 'Active').reduce((s: number, l: any) => s + (Number(l.remaining) || 0), 0)), 'text-slate-800'], ['My active', peso(all.filter((l: any) => l.empId === myEmployee?.id && l.status === 'Active').reduce((s: number, l: any) => s + (Number(l.remaining) || 0), 0)), 'text-blue-700']] as any).map(([l, v, c]: any) => (
          <div key={l} className="card p-4"><p className="text-xs text-slate-500">{l}</p><p className={`text-xl font-extrabold tabular-nums mt-1 ${c}`}>{v}</p></div>
        ))}
      </div>
      <div className="card p-4 mb-4 text-sm text-slate-600">Approved loans auto-deduct <b>{peso(0)} + per-pay</b> in Run Payroll via <span className="badge badge-blue">deductedPerPay</span>. Post off-cycle payments with Record payment.</div>
      <div className="flex items-center flex-wrap gap-3 mb-4">
        <div className="flex gap-2 flex-wrap">{['All', 'Pending', 'Active', 'Completed', 'Rejected'].map(s => (
          <button key={s} className={`btn btn-outline btn-sm ${filter === s ? '!bg-indigo-50 !text-indigo-700 !border-indigo-200' : ''}`} onClick={() => setFilter(s)}>{s}</button>
        ))}</div>
        <div className="flex-1" />
        <button className="btn btn-primary btn-sm" onClick={() => setShow(true)}>+ Request Loan / Advance</button>
      </div>
      <div className="card overflow-x-auto"><table><thead><tr><th>Employee</th><th>Type</th><th>Amount</th><th>Per pay × terms</th><th>Remaining</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{rows.map((l: any) => (
          <tr key={l.id}>
            <td><div className="flex items-center gap-2"><Avatar name={l.empName || empName(db, l.empId)} /><span className="text-sm">{l.empName || empName(db, l.empId)}</span></div></td>
            <td className="text-xs">{l.type}<br /><span className="text-slate-400">{fmtDate(l.startDate)}</span></td>
            <td className="tabular-nums font-semibold">{peso(l.amount)}</td>
            <td className="text-xs tabular-nums">{peso(l.deductedPerPay)} × {l.installments}</td>
            <td className="tabular-nums">{peso(l.remaining)}</td>
            <td><div className="flex flex-col gap-1"><Badge status={l.status} />{l.status === 'Pending' && <span className="text-[11px] text-slate-400">{stepLabel(l, chain)}</span>}</div></td>
            <td><div className="flex gap-2">
              {l.status === 'Pending' && canActOn(user, l, chain) && (<>
                <button className="btn btn-sm bg-emerald-50 text-emerald-700 border border-emerald-100" onClick={() => decide(l.id, 'approve')}>Approve</button>
                <button className="btn btn-sm bg-red-50 text-red-700 border border-red-100" onClick={() => decide(l.id, 'reject')}>Reject</button>
              </>)}
              {l.status === 'Active' && user?.role !== 'Employee' && <button className="btn btn-outline btn-sm" onClick={() => { setPayFor(l.id); setPayAmt(String(l.deductedPerPay)); }}>Record payment</button>}
            </div></td>
          </tr>
        ))}
        {!rows.length && <tr><td colSpan={7} className="text-center text-sm text-slate-400 py-6">No loans. Advances and loans flow into payroll on approval.</td></tr>}</tbody></table></div>
      {show && (
        <Modal size="sm" onClose={() => setShow(false)}>
          <h3 className="font-bold mb-4">Request Loan / Advance</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="flabel">Type</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option>Loan</option><option>Advance</option></select></div>
            <div><label className="flabel">Start payroll</label><input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
            <div><label className="flabel">Amount</label><input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
            <div><label className="flabel">Installments</label><input type="number" min={1} value={form.installments} onChange={e => setForm({ ...form, installments: e.target.value })} /></div>
            <div className="col-span-2 text-sm text-slate-500 tabular-nums">Per pay: <b>{peso((+form.amount || 0) / Math.max(1, +form.installments || 1))}</b></div>
            <div className="col-span-2"><label className="flabel">Reason</label><textarea rows={2} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-5"><button className="btn btn-outline" onClick={() => setShow(false)}>Cancel</button><button className="btn btn-primary" onClick={submit}>Submit</button></div>
        </Modal>
      )}
      {payFor != null && (
        <Modal size="sm" onClose={() => setPayFor(null)}>
          <h3 className="font-bold mb-4">Record Payment</h3>
          <label className="flabel">Amount</label><input type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)} />
          <div className="flex justify-end gap-2 mt-5"><button className="btn btn-outline" onClick={() => setPayFor(null)}>Cancel</button><button className="btn btn-primary" onClick={pay}>Post</button></div>
        </Modal>
      )}
    </>
  );
}
