import { getDB, saveDB } from '../data/mock';
import { supabase, isSupabaseConfigured } from './supabaseClient';

function actor() {
  try { return JSON.parse(localStorage.getItem('hrsuite_user') || 'null')?.name || 'System'; } catch { return 'System'; }
}

/** Immutable-ish audit trail: local activity feed + Supabase audit_logs (fire-and-forget). */
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
    (supabase as any).from('audit_logs').insert({
      actor: who, action, module, record, detail,
      created_at: new Date().toISOString(),
    }).then(({ error }: any) => { if (error) console.warn('[audit]', error.message); });
  }
}
