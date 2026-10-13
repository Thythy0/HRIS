import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getDB, deptName, posName, peso } from '../../data/mock';
import { getPayrollConfig, sssER } from '../../lib/payroll';

export default function PayslipModal({ empId, periodId, onClose }: { empId: number; periodId?: number; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  const db = getDB();
  const cfg = getPayrollConfig(db);
  const records = (db.payrollRecords ?? []).filter((x: any) => x.empId === empId);
  const r = periodId ? records.find((x: any) => x.periodId === periodId) ?? records[0] : records[0];
  const e = db.employees.find((x: any) => x.id === empId);
  if (!r || !e) return null;
  const period = (db.payrollPeriods ?? []).find((p: any) => p.id === (periodId ?? r.periodId));
  const monthly = (Number(e.salary) || 0);
  const er = sssER(monthly, cfg);
  const earnings: [string, number][] = [['Basic Salary', r.basic], ['Overtime', r.overtime], ['Holiday Pay', r.holiday ?? 0], ['Night Differential', r.nightDiff ?? 0], ['Allowances', r.allowances], ['Bonuses', r.bonus ?? 0]];
  const deductions: [string, number][] = [['SSS (EE)', r.sss], ['PhilHealth (EE)', r.philhealth], ['Pag-IBIG (EE)', r.pagibig], ['Withholding Tax', r.tax], ['Loans', r.loans ?? 0], ['Absences', r.absences ?? 0], ['Lates', r.lates ?? 0]];
  return createPortal(
    <div className="modal-bg" onClick={ev => { if (ev.target === ev.currentTarget) onClose(); }}>
      <div className="card p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        <div className="text-sm">
          <div className="text-center border-b pb-3 mb-3">
            <h2 className="text-lg font-bold">{db.company.name}</h2><p className="text-xs text-slate-500">{db.company.address} · {db.company.contact}</p>
            <h3 className="mt-2 font-semibold text-indigo-600 uppercase tracking-widest text-xs">Payslip</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mb-4">
            <div><b>Employee:</b> {e.name}</div><div><b>Employee ID:</b> {e.code}</div>
            <div><b>Department:</b> {deptName(db, e.dept)}</div><div><b>Position:</b> {posName(db, e.position)}</div>
            <div><b>Period:</b> {period?.label ?? `#${r.periodId}`}</div><div><b>Days Worked:</b> {r.daysWorked}</div>
            <div><b>TIN:</b> {e.tin || '—'}</div><div><b>Status:</b> {r.status}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><h4 className="font-bold text-xs uppercase text-slate-400 mb-1">Earnings</h4>
              {earnings.map(([l, v]) => <div key={l} className="flex justify-between py-1 tabular-nums"><span>{l}</span><span>{peso(v)}</span></div>)}
            </div>
            <div><h4 className="font-bold text-xs uppercase text-slate-400 mb-1">Deductions</h4>
              {deductions.map(([l, v]) => <div key={l} className="flex justify-between py-1 tabular-nums"><span>{l}</span><span>{peso(v)}</span></div>)}
            </div>
          </div>
          <div className="border-t mt-3 pt-3 space-y-1">
            <div className="flex justify-between font-semibold tabular-nums"><span>GROSS PAY</span><span>{peso(r.gross)}</span></div>
            <div className="flex justify-between font-semibold text-red-600 tabular-nums"><span>TOTAL DEDUCTIONS</span><span>{peso(r.totalDed)}</span></div>
            <div className="flex justify-between font-bold text-lg text-emerald-600 tabular-nums"><span>NET PAY</span><span>{peso(r.net)}</span></div>
          </div>

          <div className="border-t mt-3 pt-3">
            <h4 className="font-bold text-xs uppercase text-slate-400 mb-2">Calculation (eff. {cfg.ph.sss.effective})</h4>
            <div className="space-y-1 text-xs text-slate-500">
              <div className="flex justify-between"><span>Basic</span><span>Monthly ÷ 2</span></div>
              <div className="flex justify-between"><span>Overtime</span><span>Hrs × (₱{monthly.toLocaleString()} ÷ 22 ÷ 8) × {cfg.ph.otMultiplier}</span></div>
              <div className="flex justify-between"><span>SSS EE</span><span>5% of MSC 5k–35k (ER {peso(er.er)} + EC {peso(er.ec)} not deducted)</span></div>
              <div className="flex justify-between"><span>PhilHealth EE</span><span>2.5% of base 10k–100k</span></div>
              <div className="flex justify-between"><span>Pag-IBIG EE</span><span>2% (1% if &lt;₱1,500), cap ₱10k</span></div>
              <div className="flex justify-between"><span>Withholding Tax</span><span>TRAIN monthly ÷ 2</span></div>
              <div className="flex justify-between"><span>Absences / Lates</span><span>Daily ÷ 22 · per-minute</span></div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5 no-print">
          <button className="btn btn-outline" onClick={() => window.print()}>Print Payslip</button>
          <button className="btn btn-primary" onClick={() => { window.print(); }}>Download PDF</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
