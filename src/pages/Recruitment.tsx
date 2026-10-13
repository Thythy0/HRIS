import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getDB, saveDB, fmtDate, peso, deptName, posName } from '../data/mock';
import { Avatar, Badge, toast } from '../components/ui/bits';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { pushRow } from '../lib/sync';
import { getChain, canActOn, stepLabel, decideOffer } from '../lib/workflows';
import { APPLICANT_STAGES, moveApplicant, hireApplicant } from '../lib/lifecycle';
import { logAudit } from '../lib/audit';

export default function Recruitment() {
  const { user } = useAuth();
  if (user && !['Super Admin', 'HR/Admin', 'Manager'].includes(user.role)) return <Navigate to="/dashboard" replace />;
  const [db, setDb] = useState(getDB());
  const [tab, setTab] = useState<'openings' | 'applicants' | 'interviews' | 'offers'>('openings');
  const [stageFilter, setStageFilter] = useState('All');
  const [showJob, setShowJob] = useState(false);
  const [showApplicant, setShowApplicant] = useState(false);
  const [showInterview, setShowInterview] = useState<number | null>(null);
  const [showOffer, setShowOffer] = useState<number | null>(null);
  const [jobForm, setJobForm] = useState<any>({ title: '', dept: 7, position: 1, type: 'Regular', location: 'BGC, Taguig', salaryMin: 30000, salaryMax: 45000, description: '', requirements: '', openings: 1 });
  const [appForm, setAppForm] = useState<any>({ name: '', email: '', phone: '', openingId: 0, source: 'Job portal', notes: '' });
  const [ivForm, setIvForm] = useState<any>({ interviewer: '', date: '', time: '10:00', type: 'Panel', notes: '' });
  const [offerForm, setOfferForm] = useState<any>({ salary: 30000, startDate: '', type: 'Probationary', details: '' });
  const refresh = () => setDb({ ...getDB() });
  const canEdit = user?.role === 'Super Admin' || user?.role === 'HR/Admin' || user?.role === 'Manager';
  const offerChain = getChain('recruitment');

  const openings = db.jobOpenings ?? [];
  const applicants = db.applicants ?? [];
  const openCount = openings.filter((j: any) => j.status === 'Open').length;

  const createJob = () => {
    if (!jobForm.title) return toast('Job title required');
    const d = getDB();
    const rec = { id: Date.now(), ...jobForm, salaryMin: +jobForm.salaryMin || 0, salaryMax: +jobForm.salaryMax || 0, openings: +jobForm.openings || 1, status: 'Open', created: new Date().toISOString().slice(0, 10) };
    d.jobOpenings.push(rec);
    saveDB(d); pushRow('job_openings', rec); logAudit('Job opened', 'Recruitment', rec.title);
    setShowJob(false); refresh(); toast('Job opening created');
  };

  const toggleJob = (id: number) => {
    const d = getDB();
    const j = d.jobOpenings.find((x: any) => x.id === id);
    if (!j) return;
    j.status = j.status === 'Open' ? 'Closed' : 'Open';
    saveDB(d); pushRow('job_openings', j); refresh();
  };

  const createApplicant = () => {
    if (!appForm.name || !appForm.openingId) return toast('Name and opening required');
    const d = getDB();
    const rec = { id: Date.now(), ...appForm, openingId: +appForm.openingId, status: 'Applied', appliedDate: new Date().toISOString().slice(0, 10), history: [], doc: '', resume: '' };
    d.applicants.push(rec);
    saveDB(d); pushRow('applicants', rec); logAudit('Applicant added', 'Recruitment', `${rec.name}`);
    setShowApplicant(false); refresh(); toast('Applicant added to pipeline');
  };

  const advance = (id: number, to: string) => {
    if (moveApplicant(id, to, user)) refresh();
    else toast('Could not move applicant');
  };

  const scheduleInterview = () => {
    if (showInterview == null || !ivForm.interviewer || !ivForm.date) return toast('Interviewer and date required');
    const d = getDB();
    const rec = { id: Date.now(), applicantId: showInterview, ...ivForm, rating: 0, result: 'Pending' };
    d.interviews.push(rec);
    const a = d.applicants.find((x: any) => x.id === showInterview);
    if (a && a.status === 'Screening') { a.status = 'Interview'; a.history.push({ by: user?.name, from: 'Screening', to: 'Interview', note: 'Interview scheduled', date: new Date().toISOString().slice(0, 10) }); pushRow('applicants' as any, a); }
    saveDB(d); pushRow('interviews', rec);
    setShowInterview(null); refresh(); toast('Interview scheduled');
  };

  const createOffer = () => {
    if (showOffer == null || !offerForm.startDate) return toast('Start date required');
    const d = getDB();
    const rec = { id: Date.now(), applicantId: showOffer, salary: +offerForm.salary || 0, startDate: offerForm.startDate, type: offerForm.type, details: offerForm.details, status: 'Pending', stage: 0, history: [] };
    d.offers.push(rec);
    const a = d.applicants.find((x: any) => x.id === showOffer);
    if (a) { a.status = 'Offer'; a.history.push({ by: user?.name, from: a.status, to: 'Offer', note: 'Offer created', date: new Date().toISOString().slice(0, 10) }); pushRow('applicants' as any, a); }
    saveDB(d); pushRow('job_offers', rec);
    setShowOffer(null); refresh(); toast('Offer sent for approval');
  };

  const decide = (id: number, dec: 'approve' | 'reject') => {
    if (decideOffer(id, dec, '', user)) refresh();
    else toast('Could not update — check role/step');
  };

  const hire = (applicantId: number) => {
    if (!confirm('Hire this applicant? This creates an employee record and onboarding checklist.')) return;
    const id = hireApplicant(applicantId, user);
    if (id) { refresh(); toast('Hired — employee + onboarding created'); }
    else toast('Already hired or could not hire');
  };

  const filteredApplicants = applicants.filter((a: any) => stageFilter === 'All' || a.status === stageFilter).slice().reverse();

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {([['Open roles', openCount, 'text-emerald-700'], ['Applicants', applicants.length, 'text-slate-800'], ['In interview', applicants.filter((a: any) => ['Interview', 'Assessment', 'Final Interview'].includes(a.status)).length, 'text-blue-700'], ['Pending offers', (db.offers ?? []).filter((o: any) => o.status === 'Pending').length, 'text-amber-700']] as any).map(([l, v, c]: any) => (
          <div key={l} className="card p-4"><p className="text-xs text-slate-500">{l}</p><p className={`text-xl font-extrabold tabular-nums mt-1 ${c}`}>{v}</p></div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        {([['openings', 'Job Openings'], ['applicants', 'Applicants'], ['interviews', 'Interviews'], ['offers', 'Offers']] as any).map(([k, l]: any) => (
          <button key={k} className={`btn btn-outline btn-sm ${tab === k ? '!bg-indigo-50 !text-indigo-700 !border-indigo-200' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
        <div className="flex-1" />
        {tab === 'openings' && canEdit && <button className="btn btn-primary btn-sm" onClick={() => setShowJob(true)}>+ New Opening</button>}
        {tab === 'applicants' && canEdit && <button className="btn btn-primary btn-sm" onClick={() => { setAppForm({ ...appForm, openingId: openings[0]?.id ?? 0 }); setShowApplicant(true); }}>+ Add Applicant</button>}
      </div>

      {tab === 'openings' && (
        <div className="card overflow-x-auto"><table><thead><tr><th>Role</th><th>Dept / Position</th><th>Salary</th><th>Applicants</th><th>Status</th><th></th></tr></thead>
          <tbody>{openings.map((j: any) => (
            <tr key={j.id}>
              <td><p className="text-sm font-medium">{j.title}</p><p className="text-[11px] text-slate-400">{j.location} · {j.type} · {j.openings} head{j.openings === 1 ? '' : 's'}</p></td>
              <td className="text-xs">{deptName(db, j.dept)} · {posName(db, j.position)}</td>
              <td className="text-xs tabular-nums">{peso(j.salaryMin)} – {peso(j.salaryMax)}</td>
              <td className="tabular-nums">{applicants.filter((a: any) => a.openingId === j.id).length}</td>
              <td><Badge status={j.status} /></td>
              <td>{canEdit && <button className="btn btn-outline btn-sm" onClick={() => toggleJob(j.id)}>{j.status === 'Open' ? 'Close' : 'Reopen'}</button>}</td>
            </tr>
          ))}
          {!openings.length && <tr><td colSpan={6} className="text-center text-sm text-slate-400 py-6">No openings. Create one to start the pipeline.</td></tr>}</tbody></table></div>
      )}

      {tab === 'applicants' && (
        <>
          <div className="flex gap-2 flex-wrap mb-3">{['All', ...APPLICANT_STAGES].map(s => (
            <button key={s} className={`btn btn-outline btn-sm ${stageFilter === s ? '!bg-indigo-50 !text-indigo-700 !border-indigo-200' : ''}`} onClick={() => setStageFilter(s)}>{s}</button>
          ))}</div>
          <div className="card overflow-x-auto"><table><thead><tr><th>Applicant</th><th>Applied for</th><th>Stage</th><th>Applied</th><th>Move</th><th>Actions</th></tr></thead>
            <tbody>{filteredApplicants.map((a: any) => (
              <tr key={a.id}>
                <td><div className="flex items-center gap-2"><Avatar name={a.name} /><div><p className="text-sm font-medium">{a.name}</p><p className="text-[11px] text-slate-400">{a.email} · {a.source}</p></div></div></td>
                <td className="text-xs">{openings.find((j: any) => j.id === a.openingId)?.title ?? '—'}</td>
                <td><Badge status={a.status} /></td>
                <td className="text-xs whitespace-nowrap">{fmtDate(a.appliedDate)}</td>
                <td>{canEdit ? (
                  <select className="!w-auto !py-1 text-xs" value={a.status} onChange={e => advance(a.id, e.target.value)}>
                    {APPLICANT_STAGES.map(s => <option key={s}>{s}</option>)}
                  </select>
                ) : <span className="text-xs">—</span>}</td>
                <td>{canEdit ? (
                  <div className="flex gap-2">
                    <button className="btn btn-outline btn-sm" onClick={() => { setIvForm({ interviewer: '', date: '', time: '10:00', type: 'Panel', notes: '' }); setShowInterview(a.id); }}>Interview</button>
                    <button className="btn btn-outline btn-sm" onClick={() => { setOfferForm({ salary: openings.find((j: any) => j.id === a.openingId)?.salaryMin ?? 30000, startDate: '', type: 'Probationary', details: '' }); setShowOffer(a.id); }}>Offer</button>
                    {(a.status === 'Offer' || (db.offers ?? []).some((o: any) => o.applicantId === a.id && o.status === 'Approved')) && a.status !== 'Hired' && (
                      <button className="btn btn-sm bg-emerald-50 text-emerald-700 border border-emerald-100" onClick={() => hire(a.id)}>Hire</button>
                    )}
                  </div>
                ) : '—'}</td>
              </tr>
            ))}
            {!filteredApplicants.length && <tr><td colSpan={6} className="text-center text-sm text-slate-400 py-6">No applicants in this stage.</td></tr>}</tbody></table></div>
        </>
      )}

      {tab === 'interviews' && (
        <div className="card overflow-x-auto"><table><thead><tr><th>Applicant</th><th>Interviewer</th><th>Schedule</th><th>Type</th><th>Result</th></tr></thead>
          <tbody>{(db.interviews ?? []).slice().reverse().map((v: any) => (
            <tr key={v.id}>
              <td className="text-sm">{(db.applicants ?? []).find((a: any) => a.id === v.applicantId)?.name ?? '—'}</td>
              <td className="text-sm">{v.interviewer}</td>
              <td className="text-xs whitespace-nowrap">{fmtDate(v.date)} · {v.time}</td>
              <td className="text-xs">{v.type}</td>
              <td><Badge status={v.result} /></td>
            </tr>
          ))}
          {!(db.interviews ?? []).length && <tr><td colSpan={5} className="text-center text-sm text-slate-400 py-6">No interviews scheduled. Use Applicants → Interview.</td></tr>}</tbody></table></div>
      )}

      {tab === 'offers' && (
        <div className="card overflow-x-auto"><table><thead><tr><th>Applicant</th><th>Salary</th><th>Start</th><th>Status</th><th>Stage</th><th>Actions</th></tr></thead>
          <tbody>{(db.offers ?? []).slice().reverse().map((o: any) => (
            <tr key={o.id}>
              <td className="text-sm">{(db.applicants ?? []).find((a: any) => a.id === o.applicantId)?.name ?? '—'}</td>
              <td className="tabular-nums">{peso(o.salary)}</td>
              <td className="text-xs">{fmtDate(o.startDate)} · {o.type}</td>
              <td><Badge status={o.status} /></td>
              <td><span className="text-xs text-slate-500">{o.status === 'Pending' ? stepLabel(o, offerChain) : '—'}</span></td>
              <td>{o.status === 'Pending' && canActOn(user, o, offerChain) ? (
                <div className="flex gap-2">
                  <button className="btn btn-sm bg-emerald-50 text-emerald-700 border border-emerald-100" onClick={() => decide(o.id, 'approve')}>Approve</button>
                  <button className="btn btn-sm bg-red-50 text-red-700 border border-red-100" onClick={() => decide(o.id, 'reject')}>Reject</button>
                </div>
              ) : o.status === 'Approved' ? <button className="btn btn-outline btn-sm" onClick={() => hire(o.applicantId)}>Hire</button> : '—'}</td>
            </tr>
          ))}
          {!(db.offers ?? []).length && <tr><td colSpan={6} className="text-center text-sm text-slate-400 py-6">No offers. Create one from Applicants → Offer.</td></tr>}</tbody></table></div>
      )}

      {showJob && (
        <Modal size="sm" onClose={() => setShowJob(false)}>
          <h3 className="font-bold mb-4">New Job Opening</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="flabel">Title</label><input value={jobForm.title} onChange={e => setJobForm({ ...jobForm, title: e.target.value })} placeholder="Software Engineer" /></div>
            <div><label className="flabel">Department</label><select value={jobForm.dept} onChange={e => setJobForm({ ...jobForm, dept: +e.target.value })}>{db.departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
            <div><label className="flabel">Position</label><select value={jobForm.position} onChange={e => setJobForm({ ...jobForm, position: +e.target.value })}>{db.positions.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className="flabel">Min salary</label><input type="number" value={jobForm.salaryMin} onChange={e => setJobForm({ ...jobForm, salaryMin: e.target.value })} /></div>
            <div><label className="flabel">Max salary</label><input type="number" value={jobForm.salaryMax} onChange={e => setJobForm({ ...jobForm, salaryMax: e.target.value })} /></div>
            <div className="col-span-2"><label className="flabel">Description</label><textarea rows={2} value={jobForm.description} onChange={e => setJobForm({ ...jobForm, description: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-5"><button className="btn btn-outline" onClick={() => setShowJob(false)}>Cancel</button><button className="btn btn-primary" onClick={createJob}>Create</button></div>
        </Modal>
      )}

      {showApplicant && (
        <Modal size="sm" onClose={() => setShowApplicant(false)}>
          <h3 className="font-bold mb-4">Add Applicant</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="flabel">Name</label><input value={appForm.name} onChange={e => setAppForm({ ...appForm, name: e.target.value })} /></div>
            <div><label className="flabel">Email</label><input value={appForm.email} onChange={e => setAppForm({ ...appForm, email: e.target.value })} /></div>
            <div><label className="flabel">Phone</label><input value={appForm.phone} onChange={e => setAppForm({ ...appForm, phone: e.target.value })} /></div>
            <div className="col-span-2"><label className="flabel">Opening</label><select value={appForm.openingId} onChange={e => setAppForm({ ...appForm, openingId: +e.target.value })}><option value={0}>Select…</option>{openings.filter((j: any) => j.status === 'Open').map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}</select></div>
            <div className="col-span-2"><label className="flabel">Notes</label><textarea rows={2} value={appForm.notes} onChange={e => setAppForm({ ...appForm, notes: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-5"><button className="btn btn-outline" onClick={() => setShowApplicant(false)}>Cancel</button><button className="btn btn-primary" onClick={createApplicant}>Add</button></div>
        </Modal>
      )}

      {showInterview != null && (
        <Modal size="sm" onClose={() => setShowInterview(null)}>
          <h3 className="font-bold mb-4">Schedule Interview</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="flabel">Interviewer</label><input value={ivForm.interviewer} onChange={e => setIvForm({ ...ivForm, interviewer: e.target.value })} placeholder="John Reyes" /></div>
            <div><label className="flabel">Date</label><input type="date" value={ivForm.date} onChange={e => setIvForm({ ...ivForm, date: e.target.value })} /></div>
            <div><label className="flabel">Time</label><input type="time" value={ivForm.time} onChange={e => setIvForm({ ...ivForm, time: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-5"><button className="btn btn-outline" onClick={() => setShowInterview(null)}>Cancel</button><button className="btn btn-primary" onClick={scheduleInterview}>Schedule</button></div>
        </Modal>
      )}

      {showOffer != null && (
        <Modal size="sm" onClose={() => setShowOffer(null)}>
          <h3 className="font-bold mb-4">Create Offer</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="flabel">Salary</label><input type="number" value={offerForm.salary} onChange={e => setOfferForm({ ...offerForm, salary: e.target.value })} /></div>
            <div><label className="flabel">Start date</label><input type="date" value={offerForm.startDate} onChange={e => setOfferForm({ ...offerForm, startDate: e.target.value })} /></div>
            <div className="col-span-2"><label className="flabel">Details</label><textarea rows={2} value={offerForm.details} onChange={e => setOfferForm({ ...offerForm, details: e.target.value })} /></div>
          </div>
          <p className="text-xs text-slate-400 mt-3">Goes through the recruitment chain (HR → Manager). Hire after approval.</p>
          <div className="flex justify-end gap-2 mt-4"><button className="btn btn-outline" onClick={() => setShowOffer(null)}>Cancel</button><button className="btn btn-primary" onClick={createOffer}>Send offer</button></div>
        </Modal>
      )}
    </>
  );
}

