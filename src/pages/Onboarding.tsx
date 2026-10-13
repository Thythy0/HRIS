import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getDB, saveDB, empName, fmtDate } from '../data/mock';
import { Avatar, Badge, toast } from '../components/ui/bits';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { pushRow } from '../lib/sync';
import { toggleOnboarding, checklistProgress, DEFAULT_ONBOARDING_ITEMS } from '../lib/lifecycle';
import { logAudit } from '../lib/audit';

export default function Onboarding() {
  const { user } = useAuth();
  if (user && !['Super Admin', 'HR/Admin', 'Manager'].includes(user.role)) return <Navigate to="/dashboard" replace />;
  const [db, setDb] = useState(getDB());
  const [showTpl, setShowTpl] = useState(false);
  const [tplName, setTplName] = useState('');
  const refresh = () => setDb({ ...getDB() });
  const canEdit = user?.role === 'Super Admin' || user?.role === 'HR/Admin' || user?.role === 'Manager';
  const list = db.onboarding ?? [];
  const done = list.filter((o: any) => o.status === 'Completed').length;

  const createTemplate = () => {
    if (!tplName) return toast('Template name required');
    const d = getDB();
    const rec = { id: Date.now(), name: tplName, items: DEFAULT_ONBOARDING_ITEMS };
    d.onboardingTemplates.push(rec);
    saveDB(d); pushRow('onboarding_templates', rec);
    setShowTpl(false); setTplName(''); refresh(); toast('Template created');
  };

  const toggle = (id: number, idx: number) => {
    if (toggleOnboarding(id, idx)) refresh();
  };

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {([['In progress', list.filter((o: any) => o.status !== 'Completed').length, 'text-amber-700'], ['Completed', done, 'text-emerald-700'], ['Templates', (db.onboardingTemplates ?? []).length, 'text-slate-800'], ['Completion', list.length ? Math.round((done / list.length) * 100) + '%' : '—', 'text-blue-700']] as any).map(([l, v, c]: any) => (
          <div key={l} className="card p-4"><p className="text-xs text-slate-500">{l}</p><p className={`text-xl font-extrabold tabular-nums mt-1 ${c}`}>{v}</p></div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        <span className="badge badge-blue">Applicant → Hired → Onboarding → Active</span>
        <div className="flex-1" />
        {canEdit && <button className="btn btn-outline btn-sm" onClick={() => setShowTpl(true)}>+ Template</button>}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {list.slice().reverse().map((o: any) => {
          const pct = checklistProgress(o.checklist ?? []);
          return (
            <div key={o.id} className="card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Avatar name={o.empName ?? empName(db, o.empId)} />
                <div><p className="text-sm font-medium">{o.empName ?? empName(db, o.empId)}</p><p className="text-[11px] text-slate-400">{o.template} · started {fmtDate(o.started)}</p></div>
                <span className="ml-auto"><Badge status={o.status} /></span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden my-3"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} /></div>
              <p className="text-xs text-slate-500 mb-3 tabular-nums">{pct}% complete · {o.checklist.filter((c: any) => c.done).length}/{o.checklist.length}</p>
              <div className="space-y-1.5">
                {o.checklist.map((c: any, i: number) => (
                  <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={!!c.done} disabled={!canEdit} onChange={() => toggle(o.id, i)} />
                    <span className={c.done ? 'line-through text-slate-400' : ''}>{c.label}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
        {!list.length && <div className="card p-6 text-sm text-slate-400 md:col-span-2">No onboardings yet. Hire an applicant from Recruitment → Applicants → Hire.</div>}
      </div>

      {!!(db.onboardingTemplates ?? []).length && (
        <div className="card p-4 mt-4">
          <h3 className="font-bold text-sm mb-2">Templates</h3>
          {(db.onboardingTemplates ?? []).map((t: any) => (
            <div key={t.id} className="flex justify-between py-1.5 border-b border-slate-50 text-sm"><span>{t.name}</span><span className="text-slate-400 text-xs">{(t.items ?? []).length} items</span></div>
          ))}
        </div>
      )}

      {showTpl && (
        <Modal size="sm" onClose={() => setShowTpl(false)}>
          <h3 className="font-bold mb-4">New Template</h3>
          <label className="flabel">Name</label><input value={tplName} onChange={e => setTplName(e.target.value)} placeholder="Standard employee" />
          <p className="text-xs text-slate-400 mt-2">Starts with the {DEFAULT_ONBOARDING_ITEMS.length}-item standard checklist.</p>
          <div className="flex justify-end gap-2 mt-5"><button className="btn btn-outline" onClick={() => setShowTpl(false)}>Cancel</button><button className="btn btn-primary" onClick={createTemplate}>Create</button></div>
        </Modal>
      )}
    </>
  );
}
