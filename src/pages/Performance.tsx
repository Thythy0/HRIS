import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getDB, saveDB, empName } from '../data/mock';
import { Avatar, Badge, toast, exportCSV } from '../components/ui/bits';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { pushRow } from '../lib/sync';
import { REVIEW_STATUSES, GOAL_STATUSES, goalCompletion, advanceReview } from '../lib/people';
import { logAudit } from '../lib/audit';

export default function Performance() {
  const { user } = useAuth();
  if (user && !['Super Admin', 'HR/Admin', 'Manager'].includes(user.role)) return <Navigate to="/dashboard" replace />;
  const [db, setDb] = useState(getDB());
  const [tab, setTab] = useState<'goals' | 'reviews' | 'skills'>('goals');
  const [showGoal, setShowGoal] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showSkill, setShowSkill] = useState(false);
  const [goalForm, setGoalForm] = useState<any>({ empId: 0, title: '', kpi: '', target: '', due: '', weight: 1 });
  const [reviewForm, setReviewForm] = useState<any>({ empId: 0, cycle: '2026 H2', type: 'Manager evaluation', rating: 3, comments: '' });
  const [skillForm, setSkillForm] = useState<any>({ empId: 0, skill: '', level: 'Intermediate' });
  const refresh = () => setDb({ ...getDB() });
  const canEdit = user?.role !== 'Employee';
  const goals = db.goals ?? [];
  const reviews = db.reviews ?? [];
  const avgRating = reviews.filter((r: any) => r.status === 'Completed').reduce((s: number, r: any) => s + (+r.rating || 0), 0) / Math.max(1, reviews.filter((r: any) => r.status === 'Completed').length);

  const saveGoal = () => {
    if (!goalForm.empId || !goalForm.title) return toast('Employee and title required');
    const d = getDB();
    const rec = { id: Date.now(), empId: +goalForm.empId, title: goalForm.title, kpi: goalForm.kpi, target: goalForm.target, due: goalForm.due, weight: +goalForm.weight || 1, progress: 0, status: 'Not Started' };
    d.goals.push(rec);
    saveDB(d); pushRow('goals', rec); logAudit('Goal created', 'Performance', rec.title);
    setShowGoal(false); refresh(); toast('Goal created');
  };

  const saveReview = () => {
    if (!reviewForm.empId) return toast('Employee required');
    const d = getDB();
    const rec = { id: Date.now(), empId: +reviewForm.empId, cycle: reviewForm.cycle, type: reviewForm.type, rating: +reviewForm.rating || 0, comments: reviewForm.comments, status: 'Not Started', reviewer: user?.name ?? '', history: [] };
    d.reviews.push(rec);
    saveDB(d); pushRow('reviews', rec); logAudit('Review started', 'Performance', rec.cycle);
    setShowReview(false); refresh(); toast('Review created');
  };

  const saveSkill = () => {
    if (!skillForm.empId || !skillForm.skill) return toast('Employee and skill required');
    const d = getDB();
    const rec = { id: Date.now(), empId: +skillForm.empId, skill: skillForm.skill, level: skillForm.level, certified: false };
    d.skills.push(rec);
    saveDB(d); pushRow('skills', rec);
    setShowSkill(false); refresh(); toast('Skill added');
  };

  const setProgress = (id: number, p: number) => {
    const d = getDB();
    const g = d.goals.find((x: any) => x.id === id);
    if (!g) return;
    g.progress = Math.max(0, Math.min(100, p));
    g.status = g.progress >= 100 ? 'Completed' : g.progress > 0 ? 'In Progress' : 'Not Started';
    saveDB(d); pushRow('goals', g); refresh();
  };

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {([['Goals', goals.length, 'text-slate-800'], ['Avg rating', reviews.some((r: any) => r.status === 'Completed') ? avgRating.toFixed(1) + ' / 5' : '—', 'text-amber-700'], ['Reviews done', reviews.filter((r: any) => r.status === 'Completed').length + '/' + reviews.length, 'text-emerald-700'], ['Overall completion', goalCompletion(undefined, db) + '%', 'text-blue-700']] as any).map(([l, v, c]: any) => (
          <div key={l} className="card p-4"><p className="text-xs text-slate-500">{l}</p><p className={`text-xl font-extrabold tabular-nums mt-1 ${c}`}>{v}</p></div>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap mb-4">
        {([['goals', 'Goals / KPIs'], ['reviews', 'Reviews'], ['skills', 'Skills']] as any).map(([k, l]: any) => (
          <button key={k} className={`btn btn-outline btn-sm ${tab === k ? '!bg-indigo-50 !text-indigo-700 !border-indigo-200' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
        <div className="flex-1" />
        {canEdit && tab === 'goals' && <button className="btn btn-primary btn-sm" onClick={() => { setGoalForm({ empId: db.employees[0]?.id ?? 0, title: '', kpi: '', target: '', due: '', weight: 1 }); setShowGoal(true); }}>+ Goal</button>}
        {canEdit && tab === 'reviews' && <button className="btn btn-primary btn-sm" onClick={() => { setReviewForm({ empId: db.employees[0]?.id ?? 0, cycle: '2026 H2', type: 'Manager evaluation', rating: 3, comments: '' }); setShowReview(true); }}>+ Review</button>}
        {canEdit && tab === 'skills' && <button className="btn btn-primary btn-sm" onClick={() => { setSkillForm({ empId: db.employees[0]?.id ?? 0, skill: '', level: 'Intermediate' }); setShowSkill(true); }}>+ Skill</button>}
        <button className="btn btn-outline btn-sm" onClick={() => exportCSV(goals.map((g: any) => ({ Employee: empName(db, g.empId), Goal: g.title, Progress: g.progress, Status: g.status })), 'goals')}>Export</button>
      </div>

      {tab === 'goals' && (
        <div className="card overflow-x-auto"><table><thead><tr><th>Employee</th><th>Goal</th><th>Progress</th><th>Status</th></tr></thead>
          <tbody>{goals.slice().reverse().map((g: any) => (
            <tr key={g.id}>
              <td><div className="flex items-center gap-2"><Avatar name={empName(db, g.empId)} /><span className="text-sm">{empName(db, g.empId)}</span></div></td>
              <td className="text-sm">{g.title}<br /><span className="text-[11px] text-slate-400">{g.kpi} · target {g.target}</span></td>
              <td>{canEdit ? <input type="range" min={0} max={100} value={g.progress} onChange={e => setProgress(g.id, +e.target.value)} /> : <span className="tabular-nums">{g.progress}%</span>}<span className="text-xs tabular-nums ml-2">{g.progress}%</span></td>
              <td><Badge status={g.status} /></td>
            </tr>
          ))}
          {!goals.length && <tr><td colSpan={4} className="text-center text-sm text-slate-400 py-6">No goals. Create KPIs with weights and track progress.</td></tr>}</tbody></table></div>
      )}

      {tab === 'reviews' && (
        <div className="card overflow-x-auto"><table><thead><tr><th>Employee</th><th>Cycle</th><th>Rating</th><th>Status</th><th>Next</th></tr></thead>
          <tbody>{reviews.slice().reverse().map((r: any) => (
            <tr key={r.id}>
              <td><div className="flex items-center gap-2"><Avatar name={empName(db, r.empId)} /><span className="text-sm">{empName(db, r.empId)}</span></div></td>
              <td className="text-xs">{r.cycle} · {r.type}</td>
              <td className="tabular-nums">{r.rating} / 5</td>
              <td><Badge status={r.status} /></td>
              <td>{canEdit && r.status !== 'Completed' ? <button className="btn btn-outline btn-sm" onClick={() => { advanceReview(r.id, user); refresh(); }}>Advance → {REVIEW_STATUSES[REVIEW_STATUSES.indexOf(r.status) + 1]}</button> : '—'}</td>
            </tr>
          ))}
          {!reviews.length && <tr><td colSpan={5} className="text-center text-sm text-slate-400 py-6">No reviews. Cycle: {REVIEW_STATUSES.join(' → ')}.</td></tr>}</tbody></table></div>
      )}

      {tab === 'skills' && (
        <div className="card overflow-x-auto"><table><thead><tr><th>Employee</th><th>Skill</th><th>Level</th></tr></thead>
          <tbody>{(db.skills ?? []).slice().reverse().map((s: any) => (
            <tr key={s.id}><td className="text-sm">{empName(db, s.empId)}</td><td className="text-sm font-medium">{s.skill}</td><td className="text-xs">{s.level}</td></tr>
          ))}
          {!(db.skills ?? []).length && <tr><td colSpan={3} className="text-center text-sm text-slate-400 py-6">No skills tracked.</td></tr>}</tbody></table></div>
      )}

      {showGoal && (
        <Modal size="sm" onClose={() => setShowGoal(false)}>
          <h3 className="font-bold mb-4">New Goal</h3>
          <label className="flabel">Employee</label><select value={goalForm.empId} onChange={e => setGoalForm({ ...goalForm, empId: +e.target.value })}>{db.employees.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <label className="flabel mt-3">Title</label><input value={goalForm.title} onChange={e => setGoalForm({ ...goalForm, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div><label className="flabel">KPI</label><input value={goalForm.kpi} onChange={e => setGoalForm({ ...goalForm, kpi: e.target.value })} /></div>
            <div><label className="flabel">Due</label><input type="date" value={goalForm.due} onChange={e => setGoalForm({ ...goalForm, due: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-5"><button className="btn btn-outline" onClick={() => setShowGoal(false)}>Cancel</button><button className="btn btn-primary" onClick={saveGoal}>Create</button></div>
        </Modal>
      )}
      {showReview && (
        <Modal size="sm" onClose={() => setShowReview(false)}>
          <h3 className="font-bold mb-4">New Review</h3>
          <label className="flabel">Employee</label><select value={reviewForm.empId} onChange={e => setReviewForm({ ...reviewForm, empId: +e.target.value })}>{db.employees.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div><label className="flabel">Cycle</label><input value={reviewForm.cycle} onChange={e => setReviewForm({ ...reviewForm, cycle: e.target.value })} /></div>
            <div><label className="flabel">Rating / 5</label><input type="number" min={1} max={5} value={reviewForm.rating} onChange={e => setReviewForm({ ...reviewForm, rating: e.target.value })} /></div>
          </div>
          <label className="flabel mt-3">Comments</label><textarea rows={2} value={reviewForm.comments} onChange={e => setReviewForm({ ...reviewForm, comments: e.target.value })} />
          <p className="text-xs text-slate-400 mt-2">Statuses: {GOAL_STATUSES.join(', ')} for goals.</p>
          <div className="flex justify-end gap-2 mt-4"><button className="btn btn-outline" onClick={() => setShowReview(false)}>Cancel</button><button className="btn btn-primary" onClick={saveReview}>Create</button></div>
        </Modal>
      )}
      {showSkill && (
        <Modal size="sm" onClose={() => setShowSkill(false)}>
          <h3 className="font-bold mb-4">Add Skill</h3>
          <label className="flabel">Employee</label><select value={skillForm.empId} onChange={e => setSkillForm({ ...skillForm, empId: +e.target.value })}>{db.employees.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div><label className="flabel">Skill</label><input value={skillForm.skill} onChange={e => setSkillForm({ ...skillForm, skill: e.target.value })} /></div>
            <div><label className="flabel">Level</label><select value={skillForm.level} onChange={e => setSkillForm({ ...skillForm, level: e.target.value })}><option>Beginner</option><option>Intermediate</option><option>Advanced</option><option>Expert</option></select></div>
          </div>
          <div className="flex justify-end gap-2 mt-5"><button className="btn btn-outline" onClick={() => setShowSkill(false)}>Cancel</button><button className="btn btn-primary" onClick={saveSkill}>Add</button></div>
        </Modal>
      )}
    </>
  );
}
