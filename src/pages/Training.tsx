import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getDB, saveDB, empName } from '../data/mock';
import { Badge, toast, exportCSV } from '../components/ui/bits';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { pushRow } from '../lib/sync';
import { markAttendance } from '../lib/people';
import { logAudit } from '../lib/audit';

export default function Training() {
  const { user } = useAuth();
  if (user && !['Super Admin', 'HR/Admin', 'Manager'].includes(user.role)) return <Navigate to="/dashboard" replace />;
  const [db, setDb] = useState(getDB());
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<any>({ title: '', trainer: '', dates: '', status: 'Planned' });
  const refresh = () => setDb({ ...getDB() });
  const canEdit = user?.role !== 'Employee';
  const programs = db.trainings ?? [];

  const save = () => {
    if (!form.title) return toast('Title required');
    const d = getDB();
    const rec = { id: Date.now(), ...form, participants: [] };
    d.trainings.push(rec);
    saveDB(d); pushRow('trainings', rec); logAudit('Training created', 'Training', rec.title);
    setShow(false); refresh(); toast('Program created');
  };

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {([['Programs', programs.length, 'text-slate-800'], ['Participants', programs.reduce((s: number, t: any) => s + ((t.participants ?? []).length), 0), 'text-blue-700'], ['Completed records', (db.trainingRecords ?? []).filter((r: any) => r.attended).length, 'text-emerald-700'], ['Certificates', (db.trainingRecords ?? []).filter((r: any) => r.certificate).length, 'text-amber-700']] as any).map(([l, v, c]: any) => (
          <div key={l} className="card p-4"><p className="text-xs text-slate-500">{l}</p><p className={`text-xl font-extrabold tabular-nums mt-1 ${c}`}>{v}</p></div>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap mb-4">
        <div className="flex-1" />
        <button className="btn btn-outline btn-sm" onClick={() => exportCSV(programs.map((t: any) => ({ Program: t.title, Trainer: t.trainer, Dates: t.dates, Participants: (t.participants ?? []).length, Status: t.status })), 'training')}>Export</button>
        {canEdit && <button className="btn btn-primary btn-sm" onClick={() => setShow(true)}>+ New Program</button>}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {programs.slice().reverse().map((t: any) => (
          <div key={t.id} className="card p-5">
            <div className="flex items-center gap-2"><h3 className="font-bold text-sm">{t.title}</h3><span className="ml-auto"><Badge status={t.status} /></span></div>
            <p className="text-[11px] text-slate-400 mb-3">{t.trainer} · {t.dates} · {(t.participants ?? []).length} attending</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {db.employees.filter((e: any) => e.status === 'Active').map((e: any) => {
                const on = (t.participants ?? []).includes(e.id);
                return (
                  <label key={e.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={on} disabled={!canEdit} onChange={() => { markAttendance(t.id, e.id, !on); refresh(); }} />
                    <span>{e.name}</span>
                    {(db.trainingRecords ?? []).some((r: any) => r.programId === t.id && r.empId === e.id && r.attended) && <span className="badge badge-emerald ml-auto">Attended</span>}
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-3">Profile → Training tab shows each employee's completed programs.</p>
          </div>
        ))}
        {!programs.length && <div className="card p-6 text-sm text-slate-400 md:col-span-2">No programs. Create courses with trainers, dates, and attendance.</div>}
      </div>
      {show && (
        <Modal size="sm" onClose={() => setShow(false)}>
          <h3 className="font-bold mb-4">New Program</h3>
          <label className="flabel">Title</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div><label className="flabel">Trainer</label><input value={form.trainer} onChange={e => setForm({ ...form, trainer: e.target.value })} /></div>
            <div><label className="flabel">Dates</label><input value={form.dates} onChange={e => setForm({ ...form, dates: e.target.value })} placeholder="Oct 20–21" /></div>
          </div>
          <div className="flex justify-end gap-2 mt-5"><button className="btn btn-outline" onClick={() => setShow(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Create</button></div>
        </Modal>
      )}
      <p className="hidden">{empName(db, 0)}</p>
    </>
  );
}
