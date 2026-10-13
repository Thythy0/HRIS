import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getDB } from '../data/mock';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export default function AuditLog() {
  const { user } = useAuth();
  const [remote, setRemote] = useState<any[] | null>(null);
  if (user?.role !== 'Super Admin') return <Navigate to="/dashboard" replace />;
  const local = getDB().activity ?? [];

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    supabase.from('audit_logs').select('*').order('id', { ascending: false }).limit(100).then(({ data, error }) => {
      if (!error && data) setRemote(data);
    });
  }, []);

  return (
    <div className="card p-4">
      <div className="flex justify-between items-center mb-1 flex-wrap gap-2">
        <h3 className="font-bold text-sm">Audit Log</h3>
        <span className="text-[11px] text-slate-400">Append-only · {remote ? `shared database (${remote.length})` : 'local activity feed'} · not editable</span>
      </div>
      <div className="overflow-x-auto"><table><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Module</th><th>Record</th></tr></thead>
        <tbody>
          {(remote ?? []).map((r: any) => (
            <tr key={r.id}><td className="text-xs whitespace-nowrap">{r.created_at ? new Date(r.created_at).toLocaleString('en-PH') : '—'}</td><td className="text-sm font-medium">{r.actor}</td><td className="text-sm">{r.action}</td><td className="text-xs text-slate-500">{r.module}</td><td className="text-xs text-slate-500">{r.record} {r.detail ? `· ${r.detail}` : ''}</td></tr>
          ))}
          {!remote && local.map((a: any, i: number) => (
            <tr key={i}><td className="text-xs whitespace-nowrap">{a.time}</td><td className="text-sm font-medium">{String(a.text).split(':')[0]}</td><td className="text-sm">{a.text}</td><td className="text-xs text-slate-500">{a.type}</td><td className="text-xs text-slate-400">—</td></tr>
          ))}
          {!remote && !local.length && <tr><td colSpan={5} className="text-center text-sm text-slate-400 py-6">No audited actions yet. Salary, status, leave, and user changes are logged here.</td></tr>}
        </tbody></table></div>
    </div>
  );
}
