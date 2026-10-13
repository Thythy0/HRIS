import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getDB, saveDB } from '../data/mock';
import { toast } from '../components/ui/bits';
import { defaultWorkflows, WORKFLOW_TYPES } from '../lib/workflows';
import { ROLES } from '../lib/permissions';
import { logAudit } from '../lib/audit';
import { ensurePayrollConfig } from '../lib/payroll';
import { pushRow } from '../lib/sync';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user } = useAuth();
  if (user?.role !== 'Super Admin' && user?.role !== 'HR/Admin') return <Navigate to="/dashboard" replace />;
  const [db] = useState(getDB());
  const c = db.company;
  const pc = ensurePayrollConfig();
  const [form, setForm] = useState<any>({ name: c.name, address: c.address, contact: c.contact, freq: c.payrollFrequency, dates: c.payrollDates, grace: c.gracePeriod, lateRule: c.lateRule, otRule: c.overtimeRule });
  const [rules, setRules] = useState(c.deductionRules);
  const [flows, setFlows] = useState<any[]>(() => (c as any).workflows ?? defaultWorkflows());
  const [earn, setEarn] = useState<any[]>(pc.earningTypes);
  const [ded, setDed] = useState<any[]>(pc.deductionTypes);
  const [ph, setPh] = useState<any>(pc.ph);
  const save = () => {
    const d = getDB();
    d.company.name = form.name; d.company.address = form.address; d.company.contact = form.contact;
    d.company.payrollFrequency = form.freq; d.company.payrollDates = form.dates; d.company.gracePeriod = +form.grace;
    d.company.lateRule = form.lateRule; d.company.overtimeRule = form.otRule; d.company.deductionRules = rules;
    (d.company as any).workflows = flows;
    (d.company as any).payrollConfig = { earningTypes: earn, deductionTypes: ded, ph };
    saveDB(d); pushRow('company' as any, d.company as any);
    logAudit('Settings saved', 'Settings', 'company + payroll config + workflows'); toast('Settings saved');
  };
  const setStep = (type: string, i: number, role: string) =>
    setFlows(flows.map(f => f.type === type ? { ...f, steps: f.steps.map((s: any, j: number) => j === i ? { ...s, role, label: `${role} step` } : s) } : f));
  const addStep = (type: string) =>
    setFlows(flows.map(f => f.type === type ? { ...f, steps: [...f.steps, { role: 'HR/Admin', label: 'HR/Admin step' }] } : f));
  const delStep = (type: string, i: number) =>
    setFlows(flows.map(f => f.type === type ? { ...f, steps: f.steps.filter((_: any, j: number) => j !== i) } : f));
  const num = (v: any, fb = 0) => (v === '' || isNaN(Number(v)) ? fb : Number(v));
  return (
    <>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5"><h3 className="font-bold text-sm mb-4">Company</h3>
          <label className="flabel">Company Name</label><input className="mb-3" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <label className="flabel">Address</label><input className="mb-3" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          <label className="flabel">Contact</label><input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} />
        </div>
        <div className="card p-5"><h3 className="font-bold text-sm mb-4">Payroll</h3>
          <label className="flabel">Frequency</label>
          <select className="mb-3" value={form.freq} onChange={e => setForm({ ...form, freq: e.target.value })}>{['Monthly','Semi-monthly','Bi-weekly','Weekly'].map(f => <option key={f}>{f}</option>)}</select>
          <label className="flabel">Payroll Dates</label><input value={form.dates} onChange={e => setForm({ ...form, dates: e.target.value })} />
          <p className="text-[11px] text-slate-400 mt-2">Periods generate semi-monthly 1–15 / 16–EOM. Frequency label drives display; engine stays semi-monthly.</p>
        </div>
        <div className="card p-5"><h3 className="font-bold text-sm mb-4">Attendance Rules</h3>
          <label className="flabel">Grace Period (mins)</label><input type="number" className="mb-3" value={form.grace} onChange={e => setForm({ ...form, grace: e.target.value })} />
          <label className="flabel">Late Rules</label><input className="mb-3" value={form.lateRule} onChange={e => setForm({ ...form, lateRule: e.target.value })} />
          <label className="flabel">Overtime Rules</label><input value={form.otRule} onChange={e => setForm({ ...form, otRule: e.target.value })} />
        </div>
        <div className="card p-5"><h3 className="font-bold text-sm mb-4">Leave Settings</h3>
          {db.leaveTypes.map((t: any) => <div key={t.id} className="flex justify-between py-1.5 border-b border-slate-50 text-sm"><span>{t.name}</span><span className="text-slate-500">{t.credits} days credit</span></div>)}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <div className="card p-5"><h3 className="font-bold text-sm mb-1">Earning Types</h3>
          <p className="text-xs text-slate-400 mb-3">Toggle what the calculator includes. Formulas live in the payroll engine.</p>
          <table><thead><tr><th>Code</th><th>Name</th><th>Taxable</th><th>On</th></tr></thead><tbody>
            {earn.map((r: any, i: number) => (
              <tr key={r.code}><td className="font-mono text-xs">{r.code}</td><td className="text-sm">{r.name}<br /><span className="text-[11px] text-slate-400">{r.formula}</span></td>
                <td><input type="checkbox" checked={!!r.taxable} onChange={e => setEarn(earn.map((x: any, j: number) => j === i ? { ...x, taxable: e.target.checked } : x))} /></td>
                <td><input type="checkbox" checked={r.enabled !== false} onChange={e => setEarn(earn.map((x: any, j: number) => j === i ? { ...x, enabled: e.target.checked } : x))} /></td></tr>
            ))}
          </tbody></table>
        </div>
        <div className="card p-5"><h3 className="font-bold text-sm mb-1">Deduction Types</h3>
          <p className="text-xs text-slate-400 mb-3">Disabled items are skipped in Run Payroll.</p>
          <table><thead><tr><th>Code</th><th>Name</th><th>On</th></tr></thead><tbody>
            {ded.map((r: any, i: number) => (
              <tr key={r.code}><td className="font-mono text-xs">{r.code}</td><td className="text-sm">{r.name}<br /><span className="text-[11px] text-slate-400">{r.basis}</span></td>
                <td><input type="checkbox" checked={r.enabled !== false} onChange={e => setDed(ded.map((x: any, j: number) => j === i ? { ...x, enabled: e.target.checked } : x))} /></td></tr>
            ))}
          </tbody></table>
        </div>
      </div>

      <div className="card p-5 mt-4"><h3 className="font-bold text-sm mb-1">PH Statutory Tables (2025 schedules — editable)</h3>
        <p className="text-xs text-slate-400 mb-4">Run <code>supabase/migration_payroll.sql</code> to persist these server-side. App uses these values offline.</p>
        <div className="grid md:grid-cols-4 gap-4 text-sm">
          <div className="border border-slate-100 rounded-xl p-3">
            <p className="font-bold text-xs mb-2">SSS (EE 5% / ER 10%)</p>
            <label className="flabel">Min MSC</label><input type="number" value={ph.sss.minMSC} onChange={e => setPh({ ...ph, sss: { ...ph.sss, minMSC: num(e.target.value, 5000) } })} />
            <label className="flabel mt-2">Max MSC</label><input type="number" value={ph.sss.maxMSC} onChange={e => setPh({ ...ph, sss: { ...ph.sss, maxMSC: num(e.target.value, 35000) } })} />
            <label className="flabel mt-2">EE rate</label><input type="number" step="0.001" value={ph.sss.rateEE} onChange={e => setPh({ ...ph, sss: { ...ph.sss, rateEE: num(e.target.value, 0.05) } })} />
          </div>
          <div className="border border-slate-100 rounded-xl p-3">
            <p className="font-bold text-xs mb-2">PhilHealth (5% total)</p>
            <label className="flabel">Floor</label><input type="number" value={ph.philhealth.min} onChange={e => setPh({ ...ph, philhealth: { ...ph.philhealth, min: num(e.target.value, 10000) } })} />
            <label className="flabel mt-2">Cap</label><input type="number" value={ph.philhealth.max} onChange={e => setPh({ ...ph, philhealth: { ...ph.philhealth, max: num(e.target.value, 100000) } })} />
            <label className="flabel mt-2">Rate</label><input type="number" step="0.001" value={ph.philhealth.rate} onChange={e => setPh({ ...ph, philhealth: { ...ph.philhealth, rate: num(e.target.value, 0.05) } })} />
          </div>
          <div className="border border-slate-100 rounded-xl p-3">
            <p className="font-bold text-xs mb-2">Pag-IBIG</p>
            <label className="flabel">Cap (MFS)</label><input type="number" value={ph.pagibig.cap} onChange={e => setPh({ ...ph, pagibig: { ...ph.pagibig, cap: num(e.target.value, 10000) } })} />
            <label className="flabel mt-2">Rate</label><input type="number" step="0.001" value={ph.pagibig.rate} onChange={e => setPh({ ...ph, pagibig: { ...ph.pagibig, rate: num(e.target.value, 0.02) } })} />
            <label className="flabel mt-2">OT ×</label><input type="number" step="0.01" value={ph.otMultiplier} onChange={e => setPh({ ...ph, otMultiplier: num(e.target.value, 1.25) })} />
          </div>
          <div className="border border-slate-100 rounded-xl p-3">
            <p className="font-bold text-xs mb-2">Payroll math</p>
            <label className="flabel">Workdays / mo</label><input type="number" value={ph.workDaysPerMonth} onChange={e => setPh({ ...ph, workDaysPerMonth: num(e.target.value, 22) })} />
            <label className="flabel mt-2">Night diff</label><input type="number" step="0.01" value={ph.nightDiffRate} onChange={e => setPh({ ...ph, nightDiffRate: num(e.target.value, 0.10) })} />
            <p className="text-[11px] text-slate-400 mt-2">Tax: TRAIN monthly ÷ 2. Taxable = monthly gross − SSS/PhilHealth/Pag-IBIG.</p>
          </div>
        </div>
      </div>

      <div className="card p-5 mt-4"><h3 className="font-bold text-sm mb-4">Deduction Rules (Legacy toggles)</h3>
        <table><thead><tr><th>Deduction</th><th>Type</th><th>Basis</th><th>Enabled</th></tr></thead><tbody>
          {rules.map((r: any, i: number) => (
            <tr key={r.id}><td className="font-medium">{r.name}</td><td>{r.type}</td><td className="text-xs text-slate-500">{r.basis}</td>
            <td><input type="checkbox" checked={r.enabled} onChange={e => setRules(rules.map((x: any, j: number) => j === i ? { ...x, enabled: e.target.checked } : x))} /></td></tr>
          ))}
        </tbody></table>
      </div>
      <div className="card p-5 mt-4"><h3 className="font-bold text-sm mb-1">Approval Workflows</h3>
        <p className="text-xs text-slate-400 mb-4">Chains run Employee → steps → Approved. Overtime, correction, payroll, recruitment, and expense chains activate with their modules.</p>
        <div className="grid md:grid-cols-2 gap-4">
          {WORKFLOW_TYPES.map(t => {
            const f = flows.find(x => x.type === t) ?? { type: t, steps: [] };
            return (
              <div key={t} className="border border-slate-100 rounded-xl p-3">
                <p className="text-sm font-bold capitalize mb-2">{t.replace(/_/g, ' ')}</p>
                {f.steps.map((s: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-slate-400 w-12 shrink-0">Step {i + 1}</span>
                    <select className="!w-auto flex-1 text-xs font-semibold" value={s.role} onChange={e => setStep(t, i, e.target.value)}>
                      {ROLES.map(r => <option key={r}>{r}</option>)}
                    </select>
                    <button className="btn btn-outline btn-sm" onClick={() => delStep(t, i)} aria-label={`Remove step ${i + 1}`}>×</button>
                  </div>
                ))}
                <button className="btn btn-outline btn-sm mt-1" onClick={() => addStep(t)}>+ Add step</button>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-4"><button className="btn btn-primary" onClick={save}>Save Settings</button></div>
    </>
  );
}
