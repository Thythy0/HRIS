import { useState } from 'react';
import { getDB, saveDB } from '../data/mock';
import { toast } from '../components/ui/bits';
import { useAuth } from '../context/AuthContext';
import { ROLES, MODULES, ACTIONS, can, roleSummary } from '../lib/permissions';
import { logAudit } from '../lib/audit';

export default function Users() {
  const { user } = useAuth();
  const [db, setDb] = useState(getDB());
  const refresh = () => setDb({ ...getDB() });
  const isAdmin = user?.role === 'Super Admin';

  const setRole = (id: number, role: string) => {
    if (!isAdmin) return toast('Only Super Admin can change roles');
    const d = getDB();
    const u = d.users.find((x: any) => x.id === id);
    if (!u) return toast('User not found');
    const old = u.role;
    u.role = role;
    saveDB(d); refresh();
    logAudit('User role changed', 'Users', u.email, `${old} → ${role}`);
    toast(`Role updated to ${role}`);
  };

  return (
    <>
      <div className="card p-4 mb-4 flex justify-between items-center flex-wrap gap-2">
        <div><h3 className="font-bold text-sm">Users & Permissions</h3><p className="text-xs text-slate-400 mt-0.5">Roles enforced in UI and workflow steps{isAdmin ? '' : ' · role changes need Super Admin'}</p></div>
        <button className="btn btn-primary btn-sm" onClick={() => toast('Invite link copied')}>+ Invite User</button>
      </div>
      <div className="card overflow-x-auto mb-4"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Access</th></tr></thead>
        <tbody>{db.users.map((u: any) => (
          <tr key={u.id}><td className="font-medium">{u.name}</td><td className="text-xs">{u.email}</td>
            <td>{isAdmin
              ? <select className="!w-auto text-xs font-semibold" value={u.role} onChange={e => setRole(u.id, e.target.value)} aria-label={`Role for ${u.name}`}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              : <span className="badge badge-indigo">{u.role}</span>}</td>
            <td className="text-xs text-slate-500">{roleSummary(u.role)}</td></tr>
        ))}</tbody></table></div>
      <div className="card p-4 overflow-x-auto">
        <h3 className="font-bold text-sm mb-1">Permission matrix</h3>
        <p className="text-xs text-slate-400 mb-3">V = view · C = create · E = edit · D = delete · A = approve · X = export</p>
        <table><thead><tr><th>Role</th>{MODULES.map(m => <th key={m} className="capitalize">{m}</th>)}</tr></thead>
          <tbody>{ROLES.map(r => (
            <tr key={r}><td className="font-medium text-xs whitespace-nowrap">{r}</td>{MODULES.map(m => (
              <td key={m} title={`${r} · ${m}`}>
                <span className="inline-flex gap-[3px]">{ACTIONS.map(a => <span key={a} className={can(r, m as any, a as any) ? 'text-emerald-600 font-bold' : 'text-slate-200'}>●</span>)}</span>
              </td>
            ))}</tr>
          ))}</tbody></table>
      </div>
    </>
  );
}
