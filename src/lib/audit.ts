import { getDB, saveDB } from '../data/mock';
import { supabase, isSupabaseConfigured } from './supabaseClient';

function actor() {
  try { return JSON.parse(localStorage.getItem('hrsuite_user') || 'null')?.name || 'System'; } catch { return 'System'; }
}

/**
 * Audit trail. Local activity feed always updates (offline-safe); the
 * authoritative log is written through the `audit-log` Edge Function
 * (auth: 'user'), which resolves the actor server-side — clients cannot
 * forge entries, and RLS makes the table append-only.
 */
export function logAudit(action: string, module: string, record: string, detail = '') {
  const who = actor();
  const time = new Date().toLocaleString('en-PH');
  try {
    const d = getDB();
    if (Array.isArray(d.activity)) {
      d.activity.unshift({ text: `${who}: ${action} (${record})`, time, type: 'audit' });
      d.activity = d.activity.slice(0, 100);
      saveDB(d);
    }
  } catch { /* offline-safe */ }
  if (isSupabaseConfigured && supabase) {
    supabase.functions.invoke('audit-log', { body: { action, module, record, detail } })
      .then(({ error }: any) => { if (error) console.warn('[audit]', error.message); })
      .catch((e: any) => console.warn('[audit]', e?.message ?? e));
  }
}
