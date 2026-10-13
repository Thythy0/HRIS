import { useMemo, useState } from 'react';
import { getDB, saveDB, empName, peso, fmtDate } from '../data/mock';
import { Avatar, Badge, exportCSV, toast } from '../components/ui/bits';
import PayslipModal from '../components/payroll/Payslip';
import { useAuth } from '../context/AuthContext';
import { ensurePayrollConfig, ensurePeriods, calculatePeriod } from '../lib/payroll';
import { getChain, canActOn, stepLabel, submitPayrollPeriod, decidePayrollPeriod, markPayrollPaid } from '../lib/workflows';
import { pushRow } from '../lib/sync';
import { logAudit } from '../lib/audit';

export default function Payroll() {
  const { user } = useAuth();
  ensurePayrollConfig();
  ensurePeriods(2026);
  const [db, setDb] = useState(getDB());
  const [slip, setSlip] = useState<{ empId: number; periodId: number } | null>(null);
  const [comment, setComment] = useState('');

  const periods = useMemo(() => [...(db.payrollPeriods ?? [])].sort((a: any, b: any) => String(a.from).localeCompare(String(b.from))), [db]);
  const today = new Date().toISOString().slice(0, 10);
  const defaultPeriod = periods.find((p: any) => today >= p.from && today <= p.to)?.id
    ?? [...periods].reverse().find((p: any) => p.status === 'Processing' || p.status === 'Pending' || p.status === 'Draft')?.id
    ?? periods[periods.length - 1]?.id ?? 1;
  const [periodId, setPeriodId] = useState<number>(defaultPeriod);
  const period = periods.find((p: any) => p.id === periodId) ?? periods[0];
  const chain = getChain('payroll');

  const refresh = () => setDb({ ...getDB() });
  const myEmployee = db.employees.find((e: any) => e.name === user?.name);
  const allForPeriod = (db.payrollRecords ?? []).filter((r: any) => r.periodId === (period?.id ?? periodId));
  const visibleRecords = user?.role === 'Employee'
    ? (myEmployee ? allForPeriod.filter((r: any) => r.empId === myEmployee.id) : [])
    : allForPeriod;
  const totals = visibleRecords.reduce((a: any, r: any) => ({ gross: a.gross + r.gross, ded: a.ded + r.totalDed, net: a.net + r.net, ot: a.ot + r.overtime }), { gross: 0, ded: 0, net: 0, ot: 0 });

  const attIn = (db.attendance ?? []).filter((a: any) => period && a.date >= period.from && a.date <= period.to);
  const otApproved = (db.overtimeRequests ?? []).filter((o: any) => period && o.status === 'Approved' && o.date >= period.from && o.date <= period.to);
  const otHrs = otApproved.reduce((s: number, o: any) => s + (Number(o.hours) || 0), 0);
  const present = attIn.filter((a: any) => ['Present', 'Late', 'Half Day'].includes(a.status)).length;

  const stepIdx = !period ? 0 : period.status === 'Draft' ? 1 : period.status === 'Processing' ? 3 : period.status === 'Pending' ? 4 : 5;
  const steps = ['Select Payroll Period', 'Review Attendance', 'Calculate Payroll', 'Review', 'Approve', 'Generate Payslips'];
  const editable = period && (period.status === 'Draft' || period.status === 'Processing') && user?.role !== 'Employee';
  const canSubmit = editable && allForPeriod.length > 0;
  const pseudo = period ? { status: period.status === 'Pending' ? 'Pending' : 'Done', stage: period.stage ?? 0, empName: '__period__' } : null;
  const canDecide = !!period && period.status === 'Pending' && canActOn(user, pseudo, chain);

  const runCalc = () => {
    if (!period) return;
    const n = calculatePeriod(period.id);
    const d = getDB();
    const p = d.payrollPeriods.find((x: any) => x.id === period.id);
    if (p) pushRow('payroll_periods', p);
    (d.payrollRecords ?? []).filter((r: any) => r.periodId === period.id).forEach((r: any) => pushRow('payroll_records', r));
    if (p) logAudit('Payroll calculated', 'Payroll', `${p.label} · ${n} employees`);
    refresh();
    toast(`Payroll calculated — ${n} records · SSS/PhilHealth/Pag-IBIG/TRAIN applied`);
  };

  const adjust = (empId: number, field: 'bonus' | 'loans', val: number) => {
    const d = getDB();
    const r = d.payrollRecords.find((x: any) => x.empId === empId && x.periodId === period.id);
    if (!r) return;
    const v = Math.max(0, Number(val) || 0);
    (r as any)[field] = v;
    if (field === 'loans') (r as any).loansManual = v;
    saveDB(d);
    refresh();
  };

  const recalcOne = () => runCalc();

  const submit = () => { if (period && submitPayrollPeriod(period.id, user)) { refresh(); toast('Submitted for approval'); } };
  const decide = (dec: 'approve' | 'reject') => {
    if (!period) return;
    if (decidePayrollPeriod(period.id, dec, comment, user)) { setComment(''); refresh(); toast(dec === 'approve' ? 'Payroll decision recorded' : 'Payroll returned'); }
    else toast('Could not update — check your role/step');
  };
  const paid = () => { if (period && markPayrollPaid(period.id)) { refresh(); toast('Marked paid — records locked'); } };

  const genYear = () => { ensurePeriods(new Date().getFullYear()); ensurePeriods(2026); refresh(); toast('Periods generated (semi-monthly 1–15 / 16–EOM)'); };

  return (
    <>
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 overflow-x-auto">
          {steps.map((s, i) => (
            <span key={s} className="flex items-center gap-2 whitespace-nowrap">
              <span className={`w-6 h-6 rounded-full ${i <= stepIdx ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'} flex items-center justify-center`}>{i + 1}</span>{s}
              {i < steps.length - 1 && <span className="text-slate-300">→</span>}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {([['Gross Pay', totals.gross, 'text-slate-800'], ['Total Deductions', totals.ded, 'text-red-600'], ['Net Pay', totals.net, 'text-emerald-600'], ['Overtime Pay', totals.ot, 'text-amber-600']] as any).map(([l, v, c]: any) => (
          <div key={l} className="card p-4"><p className="text-xs text-slate-500">{l}</p><p className={`text-xl font-bold mt-1 tabular-nums ${c}`}>{peso(v)}</p></div>
        ))}
      </div>

      <div className="card p-4 mb-4 flex items-center gap-3 flex-wrap">
        <span className="badge badge-blue">Period review</span>
        <p className="text-sm text-slate-600">
          {period ? <><b>{period.label}</b> ({fmtDate(period.from)} – {fmtDate(period.to)}) · <b className="tabular-nums">{present}</b> present marks · <b className="tabular-nums">{otHrs.toFixed(1)}h</b> approved OT · </> : 'No period. '}
          <span className="ml-1">{period && stepLabel({ status: period.status === 'Pending' ? 'Pending' : period.status === 'Approved' ? 'Approved' : 'Pending', stage: period.stage ?? 0 }, chain)}</span>
        </p>
        <span className="ml-auto"><Badge status={period?.status ?? 'Draft'} /></span>
      </div>

      <div className="card p-4 mb-4 flex flex-wrap gap-3 items-center">
        {user?.role !== 'Employee' ? (
          <>
            <select className="!w-auto" value={period?.id ?? periodId} onChange={e => setPeriodId(+e.target.value)}>
              {periods.map((p: any) => <option key={p.id} value={p.id}>{p.label} ({p.status})</option>)}
            </select>
            <button className="btn btn-primary btn-sm" onClick={runCalc} disabled={!editable && period?.status !== 'Pending'}>Run Payroll</button>
            {canSubmit && <button className="btn btn-outline btn-sm" onClick={submit}>Submit for approval</button>}
            {canDecide && (
              <>
                <input className="!w-auto flex-1 min-w-[180px]" placeholder="Approval comment…" value={comment} onChange={e => setComment(e.target.value)} />
                <button className="btn btn-sm bg-emerald-50 text-emerald-700 border border-emerald-100" onClick={() => decide('approve')}>Approve</button>
                <button className="btn btn-sm bg-red-50 text-red-700 border border-red-100" onClick={() => decide('reject')}>Return</button>
              </>
            )}
            {period?.status === 'Approved' && <button className="btn btn-outline btn-sm" onClick={paid}>Mark paid</button>}
            <button className="btn btn-outline btn-sm" onClick={genYear}>Generate periods</button>
          </>
        ) : (
          <select className="!w-auto" value={period?.id ?? periodId} onChange={e => setPeriodId(+e.target.value)}>
            {periods.filter((p: any) => ['Approved', 'Paid'].includes(p.status)).map((p: any) => <option key={p.id} value={p.id}>{p.label} ({p.status})</option>)}
          </select>
        )}
        <button className="btn btn-outline btn-sm" onClick={() => exportCSV(visibleRecords.map((r: any) => ({ Employee: empName(db, r.empId), Period: period?.label ?? '', Basic: r.basic.toFixed(2), Days: r.daysWorked, OT: r.overtime.toFixed(2), Holiday: Number(r.holiday || 0).toFixed(2), Allowances: r.allowances.toFixed(2), Bonus: Number(r.bonus || 0).toFixed(2), Gross: r.gross.toFixed(2), SSS: r.sss.toFixed(2), PhilHealth: r.philhealth.toFixed(2), PagIBIG: r.pagibig.toFixed(2), Tax: r.tax.toFixed(2), Absences: Number(r.absences || 0).toFixed(2), Lates: Number(r.lates || 0).toFixed(2), Deductions: r.totalDed.toFixed(2), Net: r.net.toFixed(2), Status: r.status })), `payroll-${period?.label ?? 'report'}`)}>Export Payroll</button>
      </div>

      {!allForPeriod.length && (
        <div className="card p-6 text-sm text-slate-500 mb-4">No records for this period yet. Click <b>Run Payroll</b> to calculate from attendance + approved overtime + PH tables.</div>
      )}

      <div className="card overflow-x-auto"><table className="table-sticky"><thead><tr><th>Employee</th><th>Basic</th><th>Days</th><th>Overtime</th><th>Allowances</th><th>Bonus/Loans</th><th>Gross Pay</th><th>Deductions</th><th>Net Pay</th><th>Status</th><th></th></tr></thead>
        <tbody>{visibleRecords.map((r: any) => (
          <tr key={r.id}>
            <td><div className="flex items-center gap-2"><Avatar name={empName(db, r.empId)} /><span className="text-sm">{empName(db, r.empId)}</span></div></td>
            <td className="tabular-nums">{peso(r.basic)}</td><td className="tabular-nums">{r.daysWorked}</td><td className="tabular-nums">{peso(r.overtime)}</td><td className="tabular-nums">{peso(r.allowances)}</td>
            <td>
              {editable ? (
                <div className="flex gap-1">
                  <input type="number" min={0} className="!w-20 !py-1 text-xs" title="Bonus" value={r.bonus ?? 0} onChange={e => adjust(r.empId, 'bonus', +e.target.value)} onBlur={recalcOne} />
                  <input type="number" min={0} className="!w-20 !py-1 text-xs" title="Loans" value={r.loans ?? 0} onChange={e => adjust(r.empId, 'loans', +e.target.value)} onBlur={recalcOne} />
                </div>
              ) : <span className="text-xs tabular-nums">+{peso(r.bonus ?? 0)} / −{peso(r.loans ?? 0)}</span>}
            </td>
            <td className="font-semibold tabular-nums">{peso(r.gross)}</td><td className="text-red-600 tabular-nums">{peso(r.totalDed)}</td><td className="text-emerald-600 font-semibold tabular-nums">{peso(r.net)}</td>
            <td><Badge status={r.status} /></td><td><button className="btn btn-outline btn-sm" onClick={() => setSlip({ empId: r.empId, periodId: period.id })}>Payslip</button></td>
          </tr>
        ))}</tbody></table></div>
      {slip && <PayslipModal empId={slip.empId} periodId={slip.periodId} onClose={() => setSlip(null)} />}
    </>
  );
}
