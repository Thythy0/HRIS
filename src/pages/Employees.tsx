import React, { useState } from 'react';
import { getDB, saveDB, deptName, posName, fmtDate, peso } from '../data/mock';
import { Avatar, Badge, exportCSV, toast } from '../components/ui/bits';
import { pushRow } from '../lib/sync';
import { logAudit } from '../lib/audit';
import { Eye, Pencil, Archive, Trash2 } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { ROLES } from '../lib/permissions';

export default function Employees() {
  const [db, setDb] = useState(getDB());
  const [q, setQ] = useState(''); const [dept, setDept] = useState(''); const [type, setType] = useState('');
  const [view, setView] = useState<any>(null); const [edit, setEdit] = useState<any>(null);
  const types: string[] = Array.from(new Set<string>(db.employees.map((e: any) => e.type as string)));
  const rows = (db.employees ?? []).filter((e: any) =>
    (!q || (e.name ?? '').toLowerCase().includes(q.toLowerCase()) || (e.code ?? '').toLowerCase().includes(q.toLowerCase()) || (e.email ?? '').toLowerCase().includes(q.toLowerCase())) &&
    (!dept || e.dept === +dept) && (!type || e.type === type));
  const refresh = () => setDb({ ...getDB() });
  const linkedLogin = (empEmail: string) => getDB().users.find((x: any) => String(x.email || '').toLowerCase() === String(empEmail || '').toLowerCase().trim());
  const editLogin = edit && edit.id ? linkedLogin(edit.email) : null;
  const save = (e: any, login?: { email: string; pass: string; role: string }) => {
    if (!e.name) return toast('Name required');
    const d = getDB();
    const loginEmail = (login?.email || '').trim();
    const loginEmailLower = loginEmail.toLowerCase();
    let oldEmailLower = '';
    if (e.id) {
      const found = d.employees.find((x: any) => x.id === e.id);
      if (!found) return toast('Record not found');
      oldEmailLower = String(found.email || '').toLowerCase();
    }
    if (loginEmailLower) {
      const clash = d.users.find((x: any) => String(x.email || '').toLowerCase() === loginEmailLower && String(x.email || '').toLowerCase() !== oldEmailLower);
      if (clash) return toast('Login email already used by another user');
    } else if (!e.id) {
      return toast('Login email required');
    }
    if (!e.id && !login?.pass) return toast('Set a login password');
    let saved: any;
    if (e.id) {
      const found = d.employees.find((x: any) => x.id === e.id);
      if (!found) return toast('Record not found');
      if (Number(e.salary) !== Number(found.salary)) {
        d.salaryHistory.push({ id: Date.now(), empId: e.id, date: new Date().toISOString().slice(0, 10), oldSalary: found.salary, newSalary: +e.salary || 0, reason: 'Updated in employee profile', by: 'HR' });
      }
      if (e.status && e.status !== found.status) {
        d.statusHistory.push({ id: Date.now() + 1, empId: e.id, date: new Date().toISOString().slice(0, 10), oldStatus: found.status, newStatus: e.status, reason: 'Updated in employee profile', by: 'HR' });
      }
      Object.assign(found, e); saved = found;
    }
    else { saved = { id: Date.now(), code: `EMP-${String(d.employees.length + 1).padStart(3, '0')}`, status: 'Active', dob: '', address: '', salaryType: 'Monthly', schedule: 1, allowances: 0, bank: '', ...e }; d.employees.push(saved); }
    saveDB(d); if (saved) pushRow('employees', saved);
    if (loginEmailLower) {
      let u = d.users.find((x: any) => String(x.email || '').toLowerCase() === oldEmailLower && oldEmailLower) || d.users.find((x: any) => String(x.email || '').toLowerCase() === loginEmailLower);
      if (u) {
        u.name = saved.name; u.email = loginEmail; u.role = login?.role || u.role;
        if (login?.pass) u.pass = login.pass;
      } else {
        u = { id: Date.now(), name: saved.name, email: loginEmail, role: login?.role || 'Employee', pass: login?.pass || '' };
        d.users.push(u);
      }
      saveDB(d); pushRow('users', u);
      logAudit('Login account synced', 'Employees', `${saved.code} · ${loginEmail}`, `role=${u.role}`);
    }
    logAudit(e.id ? 'Employee updated' : 'Employee created', 'Employees', `${saved.code} · ${saved.name}`, `salary=${saved.salary} status=${saved.status}`);
    setEdit(null); refresh(); toast('Employee saved');
  };
  const archive = (e: any) => { const d = getDB(); const x = d.employees.find((y: any) => y.id === e.id); if (!x) return toast('Record not found'); const old = x.status; x.status = x.status === 'Archived' ? 'Active' : 'Archived'; d.statusHistory.push({ id: Date.now(), empId: x.id, date: new Date().toISOString().slice(0, 10), oldStatus: old, newStatus: x.status, reason: 'Archived toggle', by: 'HR' }); saveDB(d); pushRow('employees', x); logAudit(old === 'Archived' ? 'Employee restored' : 'Employee archived', 'Employees', `${x.code} · ${x.name}`); refresh(); toast('Updated'); };
  const del = (e: any) => { if (!confirm('Delete employee?')) return; const d = getDB(); d.employees = d.employees.filter((y: any) => y.id !== e.id); const mail = String(e.email || '').toLowerCase(); const ui = d.users.findIndex((u: any) => String(u.email || '').toLowerCase() === mail && mail && u.role !== 'Super Admin'); if (ui >= 0) { const [removed] = d.users.splice(ui, 1); logAudit('Login account removed', 'Employees', `${e.code} · ${removed.email}`); } saveDB(d); logAudit('Employee deleted', 'Employees', `${e.code} · ${e.name}`); refresh(); toast('Deleted'); };

  return (
    <>
      <div className="card p-4 mb-4 flex flex-wrap gap-3 items-center">
        <input placeholder="Search name, ID, email..." className="!w-auto flex-1 min-w-[200px]" value={q} onChange={e => setQ(e.target.value)} />
        <select className="!w-auto" value={dept} onChange={e => setDept(e.target.value)}><option value="">All Departments</option>{db.departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        <select className="!w-auto" value={type} onChange={e => setType(e.target.value)}><option value="">All Types</option>{types.map((t: string) => <option key={t}>{t}</option>)}</select>
        <button className="btn btn-primary btn-sm" onClick={() => setEdit({})}>+ Add Employee</button>
        <button className="btn btn-outline btn-sm" onClick={() => exportCSV(db.employees.map((e: any) => ({ ID: e.code, Name: e.name, Department: deptName(db, e.dept), Position: posName(db, e.position), Type: e.type, Status: e.status, Hired: e.hired, Salary: e.salary })), 'employees')}>Export CSV</button>
      </div>
      <div className="card overflow-x-auto"><table className="table-sticky"><thead><tr><th>Name</th><th>Department</th><th>Position</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{rows.map((e: any) => (
          <tr key={e.id}>
            <td><div className="flex items-center gap-2"><Avatar name={e.name} /><span className="font-medium">{e.name}</span></div></td>
            <td>{deptName(db, e.dept)}</td><td>{posName(db, e.position)}</td><td>{e.type}</td>
            <td><Badge status={e.status} /></td>
            <td><div className="flex gap-1">
              <button className="icon-btn" title="View" onClick={() => setView(e)}><Eye size={16} /></button>
              <button className="icon-btn" title="Edit" onClick={() => setEdit(e)}><Pencil size={16} /></button>
            </div></td>
          </tr>
        ))}</tbody></table></div>

      {view && <Modal onClose={() => setView(null)}><EmployeeProfile e={view} db={db} onArchive={() => { archive(view); setView(null); }} onDelete={() => { del(view); setView(null); }} /></Modal>}
      {edit && (
        <Modal onClose={() => setEdit(null)}>
          <h3 className="font-bold mb-4">{edit.id ? 'Edit Employee' : 'Add Employee'}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="flabel">Name</label><input defaultValue={edit.name} id="f_name" /></div>
            <div><label className="flabel">Email</label><input defaultValue={edit.email} id="f_email" /></div>
            <div><label className="flabel">Personal mobile</label><input defaultValue={edit.personalMobile} id="f_pmobile" /></div>
            <div><label className="flabel">Contact</label><input defaultValue={edit.contact} id="f_contact" /></div>
            <div><label className="flabel">Gender</label><select defaultValue={edit.gender || ''} id="f_gender"><option value="">—</option>{['Male','Female'].map(t => <option key={t}>{t}</option>)}</select></div>
            <div><label className="flabel">Civil status</label><select defaultValue={edit.civilStatus || ''} id="f_civil"><option value="">—</option>{['Single','Married','Widowed','Separated'].map(t => <option key={t}>{t}</option>)}</select></div>
            <div><label className="flabel">Department</label><select defaultValue={edit.dept} id="f_dept">{db.departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
            <div><label className="flabel">Position</label><select defaultValue={edit.position} id="f_pos">{db.positions.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className="flabel">Supervisor</label><select defaultValue={edit.supervisor || ''} id="f_sup"><option value="">None</option>{db.employees.filter((x: any) => x.id !== edit.id).map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
            <div><label className="flabel">Work location</label><input defaultValue={edit.workLocation} id="f_wloc" placeholder="BGC, Taguig" /></div>
            <div><label className="flabel">Type</label><select defaultValue={edit.type || 'Regular'} id="f_type">{['Regular','Probationary','Fixed-term','Contractual','Part-time'].map(t => <option key={t}>{t}</option>)}</select></div>
            <div><label className="flabel">Status</label><select defaultValue={edit.status || 'Active'} id="f_estatus">{['Active','Archived'].map(t => <option key={t}>{t}</option>)}</select></div>
            <div><label className="flabel">Salary</label><input type="number" defaultValue={edit.salary} id="f_sal" /></div>
            <div><label className="flabel">Pay frequency</label><select defaultValue={edit.payFrequency || 'Semi-monthly'} id="f_payfreq">{['Semi-monthly','Monthly','Weekly','Bi-weekly'].map(t => <option key={t}>{t}</option>)}</select></div>
            <div><label className="flabel">Date Hired</label><input type="date" defaultValue={edit.hired} id="f_hired" /></div>
            <div><label className="flabel">Regularization date</label><input type="date" defaultValue={edit.regularizationDate} id="f_reg" /></div>
            <div><label className="flabel">SSS</label><input defaultValue={edit.sss} id="f_sss" /></div>
            <div><label className="flabel">PhilHealth</label><input defaultValue={edit.philhealth} id="f_ph" /></div>
            <div><label className="flabel">Pag-IBIG</label><input defaultValue={edit.pagibig} id="f_pagibig" /></div>
            <div><label className="flabel">TIN</label><input defaultValue={edit.tin} id="f_tin" /></div>
            <div><label className="flabel">Bank</label><input defaultValue={edit.bank} id="f_bank" /></div>
            <div><label className="flabel">Account number</label><input defaultValue={edit.bankAccount} id="f_bankacc" /></div>
            <div><label className="flabel">Account name</label><input defaultValue={edit.bankAccountName} id="f_bankname" /></div>
            <div><label className="flabel">Emergency contact</label><input defaultValue={edit.emergencyName} id="f_emg" placeholder="Name" /></div>
            <div><label className="flabel">Emergency phone</label><input defaultValue={edit.emergencyPhone} id="f_emgphone" /></div>
            <div className="col-span-2 mt-2 pt-3 border-t border-slate-100">
              <h4 className="font-bold text-sm">System login</h4>
              <p className="text-xs text-slate-400 mt-0.5">Account the employee uses to sign in. {edit.id ? 'Leave the password blank to keep the current one.' : 'Required for new employees.'}</p>
            </div>
            <div><label className="flabel">Login email</label><input defaultValue={editLogin?.email || edit.email || ''} id="f_login" placeholder="name@company.ph" autoComplete="off" /></div>
            <div><label className="flabel">Password{edit.id ? ' (blank = keep current)' : ''}</label><input type="password" id="f_pass" placeholder={edit.id ? '••••••' : 'Set password'} autoComplete="new-password" /></div>
            <div><label className="flabel">System role</label><select defaultValue={editLogin?.role || 'Employee'} id="f_role">{ROLES.map(r => <option key={r}>{r}</option>)}</select></div>
            <div className="text-xs text-slate-400 self-end">Signed in as {editLogin ? `${editLogin.email} · ${editLogin.role}` : 'no login yet'}</div>
          </div>
          <div className="flex justify-end gap-2 mt-5"><button className="btn btn-outline" onClick={() => setEdit(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => { const v = (id: string) => (document.getElementById(id) as any)?.value; save({ ...edit, name: v('f_name'), email: v('f_email'), personalMobile: v('f_pmobile'), contact: v('f_contact') || v('f_pmobile'), gender: v('f_gender'), civilStatus: v('f_civil'), dept: +v('f_dept'), position: +v('f_pos'), supervisor: v('f_sup') ? +v('f_sup') : null, workLocation: v('f_wloc'), type: v('f_type'), status: v('f_estatus'), salary: +v('f_sal'), payFrequency: v('f_payfreq'), hired: v('f_hired'), regularizationDate: v('f_reg'), sss: v('f_sss'), philhealth: v('f_ph'), pagibig: v('f_pagibig'), tin: v('f_tin'), bank: v('f_bank'), bankAccount: v('f_bankacc'), bankAccountName: v('f_bankname'), emergencyName: v('f_emg'), emergencyPhone: v('f_emgphone') }, { email: v('f_login'), pass: v('f_pass'), role: v('f_role') }); }}>Save</button></div>
        </Modal>
      )}
    </>
  );
}

function EmployeeProfile({ e, db, onArchive, onDelete }: any) {
  const [tab, setTab] = useState('Personal');
  const [tick, setTick] = useState(0);
  const [docForm, setDocForm] = useState<any>({ name: '', category: 'Contracts', expiry: '' });
  void tick;
  const fresh = getDB();
  const att = fresh.attendance.filter((a: any) => a.empId === e.id).slice(-10).reverse();
  const leaves = fresh.leaveRequests.filter((l: any) => l.empId === e.id);
  const slips = fresh.payrollRecords.filter((r: any) => r.empId === e.id);
  const docs = (fresh.documents ?? []).filter((d: any) => d.empId === e.id);
  const salHist = (fresh.salaryHistory ?? []).filter((s: any) => s.empId === e.id).slice().reverse();
  const statHist = (fresh.statusHistory ?? []).filter((s: any) => s.empId === e.id).slice().reverse();
  const supName = fresh.employees.find((x: any) => x.id === e.supervisor)?.name || '—';
  const addDoc = () => {
    if (!docForm.name) return toast('Document name required');
    const d = getDB();
    const rec = { id: Date.now(), empId: e.id, name: docForm.name, category: docForm.category, file: docForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.pdf', expiry: docForm.expiry || '', status: 'Active' };
    d.documents.push(rec); saveDB(d);
    logAudit('Document added', 'Employees', `${e.code} · ${docForm.name}`);
    setDocForm({ name: '', category: 'Contracts', expiry: '' }); setTick(t => t + 1); toast('Document added');
  };
  const delDoc = (id: number) => { const d = getDB(); d.documents = d.documents.filter((x: any) => x.id !== id); saveDB(d); setTick(t => t + 1); toast('Document removed'); };
  return (
    <>
      <div className="flex items-center gap-3 mb-4"><Avatar name={e.name} /><div><h3 className="font-bold">{e.name}</h3><p className="text-xs text-slate-400">{e.code} · {e.email}</p></div><span className="ml-auto"><Badge status={e.status} /></span></div>
      <div className="flex gap-2 mb-4 overflow-x-auto">{['Personal','Employment','Government','Banking','Payroll','Documents','Attendance','Leave','Payslips','Performance','Training','History'].map(t => <button key={t} className={`tab-btn whitespace-nowrap ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>)}</div>
      {tab === 'Personal' && <div className="grid grid-cols-2 gap-3 text-sm"><div><label className="flabel">Full Name</label>{e.name}</div><div><label className="flabel">DOB</label>{fmtDate(e.dob)}</div><div><label className="flabel">Gender</label>{e.gender || '—'}</div><div><label className="flabel">Civil status</label>{e.civilStatus || '—'}</div><div><label className="flabel">Nationality</label>{e.nationality || '—'}</div><div><label className="flabel">Personal mobile</label>{e.personalMobile || e.contact}</div><div><label className="flabel">Address</label>{e.address}</div><div><label className="flabel">Work email</label>{e.email}</div><div><label className="flabel">Emergency contact</label>{e.emergencyName ? `${e.emergencyName} (${e.emergencyRelation || '—'})` : '—'}</div><div><label className="flabel">Emergency phone</label>{e.emergencyPhone || '—'}</div></div>}
      {tab === 'Employment' && <div className="grid grid-cols-2 gap-3 text-sm"><div><label className="flabel">ID</label>{e.code}</div><div><label className="flabel">Department</label>{deptName(db, e.dept)}</div><div><label className="flabel">Position</label>{posName(db, e.position)}</div><div><label className="flabel">Type</label>{e.type}</div><div><label className="flabel">Supervisor</label>{supName}</div><div><label className="flabel">Work location</label>{e.workLocation || '—'}</div><div><label className="flabel">Date Hired</label>{fmtDate(e.hired)}</div><div><label className="flabel">Regularization</label>{e.regularizationDate ? fmtDate(e.regularizationDate) : '—'}</div><div><label className="flabel">Resignation</label>{e.resignationDate ? fmtDate(e.resignationDate) : '—'}</div><div><label className="flabel">Termination</label>{e.terminationDate ? fmtDate(e.terminationDate) : '—'}</div></div>}
      {tab === 'Government' && <div className="grid grid-cols-2 gap-3 text-sm"><div><label className="flabel">SSS</label>{e.sss || '—'}</div><div><label className="flabel">PhilHealth</label>{e.philhealth || '—'}</div><div><label className="flabel">Pag-IBIG</label>{e.pagibig || '—'}</div><div><label className="flabel">TIN</label>{e.tin || '—'}</div></div>}
      {tab === 'Banking' && <div className="grid grid-cols-2 gap-3 text-sm"><div><label className="flabel">Bank</label>{e.bank || '—'}</div><div><label className="flabel">Account number</label>{e.bankAccount || '—'}</div><div><label className="flabel">Account name</label>{e.bankAccountName || '—'}</div><div><label className="flabel">Payment method</label>{e.paymentMethod || '—'}</div></div>}
      {tab === 'Payroll' && <div className="grid grid-cols-2 gap-3 text-sm"><div><label className="flabel">Salary Type</label>{e.salaryType}</div><div><label className="flabel">Pay frequency</label>{e.payFrequency || '—'}</div><div><label className="flabel">Basic Salary</label>{peso(e.salary)}</div><div><label className="flabel">Allowances</label>{peso(e.allowances)}</div><div className="col-span-2"><label className="flabel">Benefits</label>{e.benefits || '—'}</div></div>}
      {tab === 'Documents' && (
        <div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="col-span-2"><label className="flabel">Document name</label><input value={docForm.name} onChange={ev => setDocForm({ ...docForm, name: ev.target.value })} placeholder="Employment contract" /></div>
            <div><label className="flabel">Category</label><select value={docForm.category} onChange={ev => setDocForm({ ...docForm, category: ev.target.value })}>{['Contracts','Government IDs','Certificates','Policies','Payroll','Resignation','Other'].map(c => <option key={c}>{c}</option>)}</select></div>
            <div><label className="flabel">Expiry</label><input type="date" value={docForm.expiry} onChange={ev => setDocForm({ ...docForm, expiry: ev.target.value })} /></div>
          </div>
          <button className="btn btn-outline btn-sm mb-3" onClick={addDoc}>+ Add document</button>
          {docs.length ? docs.map((d: any) => (
            <div key={d.id} className="flex justify-between items-center border border-slate-100 rounded-lg p-3 mb-2">
              <div><p className="text-sm font-medium">{d.name}</p><p className="text-xs text-slate-400">{d.category}{d.expiry ? ` · expires ${fmtDate(d.expiry)}` : ''}</p></div>
              <button className="btn btn-outline btn-sm" onClick={() => delDoc(d.id)}>Remove</button>
            </div>
          )) : <p className="text-sm text-slate-400">No documents yet. Add the first one above.</p>}
        </div>
      )}
      {tab === 'Attendance' && (att.length ? <table><thead><tr><th>Date</th><th>In</th><th>Out</th><th>Hours</th><th>Status</th></tr></thead><tbody>{att.map((a: any) => <tr key={a.id}><td>{fmtDate(a.date)}</td><td>{a.timeIn}</td><td>{a.timeOut}</td><td>{a.hours}</td><td><Badge status={a.status} /></td></tr>)}</tbody></table> : <p className="text-sm text-slate-400">No records</p>)}
      {tab === 'Leave' && (leaves.length ? <table><thead><tr><th>Type</th><th>Dates</th><th>Days</th><th>Status</th></tr></thead><tbody>{leaves.map((l: any) => <tr key={l.id}><td>{db.leaveTypes.find((t: any) => t.id === l.typeId)?.name}</td><td>{fmtDate(l.start)} – {fmtDate(l.end)}</td><td>{l.days}</td><td><Badge status={l.status} /></td></tr>)}</tbody></table> : <p className="text-sm text-slate-400">No leave history</p>)}
      {tab === 'Payslips' && (slips.length ? slips.map((r: any) => <div key={r.id} className="flex justify-between items-center border border-slate-100 rounded-lg p-3 mb-2"><span className="text-sm">Period #{r.periodId} · {r.daysWorked} days</span><b className="text-sm">{peso(r.net)}</b></div>) : <p className="text-sm text-slate-400">No payslips</p>)}
      {tab === 'Performance' && (
        <div className="space-y-3">
          {(fresh.goals ?? []).filter((g: any) => g.empId === e.id).map((g: any) => (
            <div key={g.id} className="flex justify-between text-sm border border-slate-100 rounded-lg p-3"><span>{g.title}<br /><span className="text-xs text-slate-400">{g.status}</span></span><b className="tabular-nums">{g.progress}%</b></div>
          ))}
          {(fresh.reviews ?? []).filter((r: any) => r.empId === e.id).map((r: any) => (
            <div key={r.id} className="flex justify-between text-sm border border-slate-100 rounded-lg p-3"><span>{r.cycle} · {r.type}</span><span><Badge status={r.status} /> <b className="tabular-nums ml-2">{r.rating}/5</b></span></div>
          ))}
          {!(fresh.goals ?? []).some((g: any) => g.empId === e.id) && !(fresh.reviews ?? []).some((r: any) => r.empId === e.id) && <p className="text-sm text-slate-400">No goals or reviews yet.</p>}
        </div>
      )}
      {tab === 'Training' && (
        <div className="space-y-2">
          {(fresh.trainingRecords ?? []).filter((r: any) => r.empId === e.id && r.attended).map((r: any) => {
            const p = (fresh.trainings ?? []).find((t: any) => t.id === r.programId);
            return <div key={r.id} className="flex justify-between text-sm border border-slate-100 rounded-lg p-3"><span>{p?.title ?? 'Program'}</span><span className="text-xs text-slate-400">{r.date}</span></div>;
          })}
          {!(fresh.trainingRecords ?? []).some((r: any) => r.empId === e.id && r.attended) && <p className="text-sm text-slate-400">No completed training.</p>}
        </div>
      )}
      {tab === 'History' && (
        <div className="space-y-4">
          <div><h4 className="font-bold text-xs uppercase text-slate-400 mb-2">Salary history</h4>
            {salHist.length ? salHist.map((s: any) => <div key={s.id} className="flex justify-between py-2 border-b border-slate-50 text-sm"><span>{fmtDate(s.date)} · {s.reason}</span><b>{peso(s.oldSalary)} → {peso(s.newSalary)}</b></div>) : <p className="text-sm text-slate-400">No salary changes recorded.</p>}</div>
          <div><h4 className="font-bold text-xs uppercase text-slate-400 mb-2">Status history</h4>
            {statHist.length ? statHist.map((s: any) => <div key={s.id} className="flex justify-between py-2 border-b border-slate-50 text-sm"><span>{fmtDate(s.date)} · {s.reason}</span><span><Badge status={s.oldStatus || '—'} /> → <Badge status={s.newStatus} /></span></div>) : <p className="text-sm text-slate-400">No status changes recorded.</p>}</div>
          <div><h4 className="font-bold text-xs uppercase text-slate-400 mb-2">Activity totals</h4>
            <div className="flex gap-4 text-sm text-slate-500"><span>Attendance: <b>{fresh.attendance.filter((a: any) => a.empId === e.id).length}</b></span><span>Leave: <b>{leaves.length}</b></span><span>Payslips: <b>{slips.length}</b></span></div></div>
        </div>
      )}
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
        <button className="btn btn-outline btn-sm" onClick={onArchive}><Archive size={14} /> Archive</button>
        <button className="btn btn-danger btn-sm" onClick={onDelete}><Trash2 size={14} /> Delete</button>
      </div>
    </>
  );
}
