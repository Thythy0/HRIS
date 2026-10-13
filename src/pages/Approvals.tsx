import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getDB, empName, deptName, fmtDate } from '../data/mock';
import { Avatar, Badge, toast } from '../components/ui/bits';
import { useAuth } from '../context/AuthContext';
import { getChain, canActOn, stepLabel, decideLeave, decideOvertime, decideCorrection, decidePayrollPeriod, decideOffer, decideHrRequest, decideLoan, decideExpense } from '../lib/workflows';

export default function Approvals() {
  const { user } = useAuth();
  const [db, setDb] = useState(getDB());
  const [comment, setComment] = useState('');
  if (user?.role === 'Employee') return <Navigate to="/self-service" replace />;

  const leaveChain = getChain('leave');
  const otChain = getChain('overtime');
  const corrChain = getChain('attendance_correction');
  const payChain = getChain('payroll');
  const offerChain = getChain('recruitment');
  const chainFor = (kind: string) => kind === 'overtime' ? otChain : kind === 'correction' ? corrChain : leaveChain;
  const badgeFor = (kind: string) => kind === 'overtime' ? 'Overtime' : kind === 'correction' ? 'Correction' : 'Leave';
  const payrollPending = (db.payrollPeriods ?? []).filter((p: any) => p.status === 'Pending');
  const payrollMine = payrollPending.filter((p: any) => canActOn(user, { status: 'Pending', stage: p.stage ?? 0, empName: '__period__' }, payChain));
  const offerPending = (db.offers ?? []).filter((o: any) => o.status === 'Pending');
  const offerMine = offerPending.filter((o: any) => canActOn(user, o, offerChain));
  const hrChain = getChain('hr_request');
  const loanChain = getChain('loan');
  const expChain = getChain('expense');
  const hrPending = (db.hrRequests ?? []).filter((r: any) => r.status === 'Pending');
  const loanPending = (db.loans ?? []).filter((l: any) => l.status === 'Pending');
  const expPending = (db.expenses ?? []).filter((e: any) => e.status === 'Pending');
  const hrMine = hrPending.filter((r: any) => canActOn(user, r, hrChain));
  const loanMine = loanPending.filter((l: any) => canActOn(user, l, loanChain));
  const expMine = expPending.filter((e: any) => canActOn(user, e, expChain));
  const pending = [
    ...db.leaveRequests.filter((l: any) => l.status === 'Pending').map((l: any) => ({ kind: 'leave', ...l, title: `${db.leaveTypes.find((t: any) => t.id === l.typeId)?.name} · ${l.days}d`, detail: `${fmtDate(l.start)} – ${fmtDate(l.end)}` })),
    ...(db.overtimeRequests ?? []).filter((o: any) => o.status === 'Pending').map((o: any) => ({ kind: 'overtime', ...o, title: `Overtime · ${Number(o.hours).toFixed(1)}h`, detail: `${fmtDate(o.date)} · ${o.start}–${o.end}` })),
    ...(db.correctionRequests ?? []).filter((c: any) => c.status === 'Pending').map((c: any) => ({ kind: 'correction', ...c, title: `${c.field === 'timeIn' ? 'Time in' : 'Time out'} → ${c.requestedTime}`, detail: `${fmtDate(c.date)} · was ${c.originalTime}` })),
  ];
  const mine = pending.filter((l: any) => canActOn(user, l, chainFor(l.kind)));
  const waitingOthers = pending.filter((l: any) => !canActOn(user, l, chainFor(l.kind)));
  const recent = [
    ...db.leaveRequests.filter((l: any) => l.status !== 'Pending').map((l: any) => ({ kind: 'leave', ...l })),
    ...((db.overtimeRequests ?? []).filter((o: any) => o.status !== 'Pending').map((o: any) => ({ kind: 'overtime', ...o }))),
    ...((db.correctionRequests ?? []).filter((c: any) => c.status !== 'Pending').map((c: any) => ({ kind: 'correction', ...c }))),
  ].slice(-8).reverse();

  const decide = (kind: string, id: number, d: 'approve' | 'reject') => {
    const ok = kind === 'overtime' ? decideOvertime(id, d, comment, user) : kind === 'correction' ? decideCorrection(id, d, comment, user) : decideLeave(id, d, comment, user);
    if (ok) { setDb({ ...getDB() }); setComment(''); toast(d === 'approve' ? 'Approved' : 'Rejected'); }
    else toast('Could not update request');
  };

  const decidePay = (id: number, d: 'approve' | 'reject') => {
    if (decidePayrollPeriod(id, d, comment, user)) { setDb({ ...getDB() }); setComment(''); toast(d === 'approve' ? 'Payroll approved' : 'Payroll returned'); }
    else toast('Could not update — check your role/step');
  };

  const decideOff = (id: number, d: 'approve' | 'reject') => {
    if (decideOffer(id, d, comment, user)) { setDb({ ...getDB() }); setComment(''); toast(d === 'approve' ? 'Offer approved' : 'Offer returned'); }
    else toast('Could not update — check your role/step');
  };

  const decideExtra = (kind: 'hr' | 'loan' | 'exp', id: number, d: 'approve' | 'reject') => {
    const ok = kind === 'hr' ? decideHrRequest(id, d, comment, user) : kind === 'loan' ? decideLoan(id, d, comment, user) : decideExpense(id, d, comment, user);
    if (ok) { setDb({ ...getDB() }); setComment(''); toast('Recorded'); }
    else toast('Could not update — check your role/step');
  };

  const extraBlock = (title: string, items: any[], chain: any, kind: 'hr' | 'loan' | 'exp') => (
    !!items.length && (
      <div className="card p-4">
        <h3 className="font-bold text-sm mb-1">{title} ({items.length})</h3>
        <p className="text-xs text-slate-400 mb-3">Chain: {chain.steps.map((s: any) => s.role).join(' → ')}.</p>
        <div className="overflow-x-auto"><table><thead><tr><th>Who</th><th>Detail</th><th>Stage</th><th>Decision</th></tr></thead>
          <tbody>{items.map((o: any) => {
            const actionable = canActOn(user, o, chain);
            const who = o.empName ?? empName(db, o.empId);
            const detail = kind === 'hr' ? o.type : kind === 'loan' ? `${o.type} · ${o.amount}` : `${o.category} · ${o.amount}`;
            return (
              <tr key={kind + o.id}>
                <td className="text-sm font-medium">{who}</td>
                <td className="text-xs text-slate-500">{detail}</td>
                <td><span className="text-xs text-slate-500">{stepLabel(o, chain)}</span></td>
                <td>{actionable ? (
                  <div className="flex gap-2">
                    <button className="btn btn-sm bg-emerald-50 text-emerald-700 border border-emerald-100" onClick={() => decideExtra(kind, o.id, 'approve')}>Approve</button>
                    <button className="btn btn-sm bg-red-50 text-red-700 border border-red-100" onClick={() => decideExtra(kind, o.id, 'reject')}>Return</button>
                  </div>
                ) : <span className="text-xs text-slate-400">Waiting on another role</span>}</td>
              </tr>
            );
          })}</tbody></table></div>
      </div>
    )
  );

  const row = (l: any, actionable: boolean) => (
    <tr key={l.kind + l.id}>
      <td><div className="flex items-center gap-2"><Avatar name={empName(db, l.empId)} /><div><p className="text-sm font-medium">{empName(db, l.empId)}</p><p className="text-[11px] text-slate-400">{deptName(db, db.employees.find((e: any) => e.id === l.empId)?.dept)}</p></div></div></td>
      <td><span className="badge badge-indigo">{badgeFor(l.kind)}</span></td>
      <td className="text-xs">{l.title}<br /><span className="text-slate-400">{l.detail}</span></td>
      <td><span className="text-xs text-slate-500">{stepLabel(l, chainFor(l.kind))}</span></td>
      <td>{actionable ? (
        <div className="flex gap-2">
          <button className="btn btn-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100" onClick={() => decide(l.kind, l.id, 'approve')}>Approve</button>
          <button className="btn btn-sm bg-red-50 text-red-700 hover:bg-red-100 border border-red-100" onClick={() => decide(l.kind, l.id, 'reject')}>Reject</button>
        </div>
      ) : <span className="text-xs text-slate-400">Waiting on another role</span>}</td>
    </tr>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[['Waiting on you', mine.length + payrollMine.length + offerMine.length + hrMine.length + loanMine.length + expMine.length, 'text-amber-700'], ['Total pending', pending.length + payrollPending.length + offerPending.length + hrPending.length + loanPending.length + expPending.length, 'text-slate-800'], ['HR requests', hrPending.length, 'text-emerald-700'], ['Loans + expenses', loanPending.length + expPending.length, 'text-indigo-700']].map(([l, v, c]: any) => (
          <div key={l} className="card p-4"><p className="text-xs text-slate-500">{l}</p><p className={`text-2xl font-extrabold tabular-nums mt-1 ${c}`}>{v}</p></div>
        ))}
      </div>

      {extraBlock('HR requests awaiting decision', hrPending, hrChain, 'hr')}
      {extraBlock('Loans awaiting decision', loanPending, loanChain, 'loan')}
      {extraBlock('Expenses awaiting decision', expPending, expChain, 'exp')}

      {!!offerPending.length && (
        <div className="card p-4">
          <h3 className="font-bold text-sm mb-1">Job offers awaiting decision ({offerPending.length})</h3>
          <p className="text-xs text-slate-400 mb-3">Chain: {offerChain.steps.map(s => s.role).join(' → ')}. Hire after final approval.</p>
          <div className="overflow-x-auto"><table><thead><tr><th>Candidate</th><th>Offer</th><th>Stage</th><th>Decision</th></tr></thead>
            <tbody>{offerPending.map((o: any) => {
              const a = (db.applicants ?? []).find((x: any) => x.id === o.applicantId);
              const actionable = canActOn(user, o, offerChain);
              return (
                <tr key={'offer' + o.id}>
                  <td className="text-sm font-medium">{a?.name ?? '—'}</td>
                  <td className="text-xs text-slate-500">{fmtDate(o.startDate)} · {o.type}</td>
                  <td><span className="text-xs text-slate-500">{stepLabel(o, offerChain)}</span></td>
                  <td>{actionable ? (
                    <div className="flex gap-2">
                      <button className="btn btn-sm bg-emerald-50 text-emerald-700 border border-emerald-100" onClick={() => decideOff(o.id, 'approve')}>Approve</button>
                      <button className="btn btn-sm bg-red-50 text-red-700 border border-red-100" onClick={() => decideOff(o.id, 'reject')}>Return</button>
                    </div>
                  ) : <span className="text-xs text-slate-400">Waiting on another role</span>}</td>
                </tr>
              );
            })}</tbody></table></div>
        </div>
      )}

      {!!payrollPending.length && (
        <div className="card p-4">
          <h3 className="font-bold text-sm mb-1">Payroll periods awaiting decision ({payrollPending.length})</h3>
          <p className="text-xs text-slate-400 mb-3">Chain: {payChain.steps.map(s => s.role).join(' → ')}. Approval locks records for payslips.</p>
          <div className="overflow-x-auto"><table><thead><tr><th>Period</th><th>Dates</th><th>Stage</th><th>Decision</th></tr></thead>
            <tbody>{payrollPending.map((p: any) => {
              const actionable = canActOn(user, { status: 'Pending', stage: p.stage ?? 0, empName: '__period__' }, payChain);
              return (
                <tr key={'pay' + p.id}>
                  <td className="text-sm font-medium">{p.label} <span className="ml-2"><Badge status={p.status} /></span></td>
                  <td className="text-xs text-slate-500">{fmtDate(p.from)} – {fmtDate(p.to)}</td>
                  <td><span className="text-xs text-slate-500">{stepLabel({ status: 'Pending', stage: p.stage ?? 0 }, payChain)}</span></td>
                  <td>{actionable ? (
                    <div className="flex gap-2">
                      <button className="btn btn-sm bg-emerald-50 text-emerald-700 border border-emerald-100" onClick={() => decidePay(p.id, 'approve')}>Approve</button>
                      <button className="btn btn-sm bg-red-50 text-red-700 border border-red-100" onClick={() => decidePay(p.id, 'reject')}>Return</button>
                    </div>
                  ) : <span className="text-xs text-slate-400">Waiting on another role</span>}</td>
                </tr>
              );
            })}</tbody></table></div>
        </div>
      )}

      <div className="card p-4">
        <h3 className="font-bold text-sm mb-1">Waiting on you ({mine.length})</h3>
        <p className="text-xs text-slate-400 mb-3">Requests at your step of the chain. Approved corrections update attendance automatically.</p>
        <div className="flex gap-2 mb-3"><input className="!w-auto flex-1 min-w-[200px]" placeholder="Add a comment for the next decision…" value={comment} onChange={e => setComment(e.target.value)} /></div>
        <div className="overflow-x-auto"><table><thead><tr><th>Requester</th><th>Type</th><th>Details</th><th>Stage</th><th>Decision</th></tr></thead>
          <tbody>{mine.map((l: any) => row(l, true))}{!mine.length && <tr><td colSpan={5} className="text-center text-sm text-slate-400 py-6">Nothing waiting on you. New requests appear here with requester, department, and stage.</td></tr>}</tbody></table></div>
      </div>

      {!!waitingOthers.length && (
        <div className="card p-4">
          <h3 className="font-bold text-sm mb-3">Pending elsewhere ({waitingOthers.length})</h3>
          <div className="overflow-x-auto"><table><thead><tr><th>Requester</th><th>Type</th><th>Details</th><th>Stage</th><th>Decision</th></tr></thead>
            <tbody>{waitingOthers.map((l: any) => row(l, false))}</tbody></table></div>
        </div>
      )}

      {!!recent.length && (
        <div className="card p-4">
          <h3 className="font-bold text-sm mb-3">Recently decided</h3>
          {recent.map((l: any) => (
            <div key={(l.kind ?? 'leave') + l.id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
              <span className="text-sm">{empName(db, l.empId)} · {l.kind === 'overtime' ? `Overtime ${Number(l.hours).toFixed(1)}h` : l.kind === 'correction' ? `Correction ${l.requestedTime}` : db.leaveTypes.find((t: any) => t.id === l.typeId)?.name}</span>
              <span className="flex items-center gap-2"><span className="text-xs text-slate-400">{l.history?.slice(-1)[0]?.by ?? ''}{l.history?.slice(-1)[0]?.comment ? ` — “${l.history.slice(-1)[0].comment}”` : ''}</span><Badge status={l.status} /></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
