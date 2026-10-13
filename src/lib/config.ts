// Dynamic runtime config — every tunable lives in .env, code reads from here.
// Copy .env.example to .env and change values per machine (local / staging / prod).
const env = import.meta.env as Record<string, string | undefined>;

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return v == null || v === '' || isNaN(n) ? fallback : n;
};

export const config = {
  appName: env.VITE_APP_NAME || 'HRSuite',
  apiUrl: env.VITE_API_URL || 'http://localhost:3000/api',
  supabaseUrl: env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY || '',
  /** Monthly hours target shown on the employee dashboard. */
  targetHours: num(env.VITE_TARGET_HOURS, 160),
  /** Shift length used for session progress. */
  shiftHours: num(env.VITE_SHIFT_HOURS, 8),
  /** Grace period (minutes after 8:00 AM) before clock-in counts as late. */
  graceMinutes: num(env.VITE_GRACE_MINUTES, 10),
};

export const isSupabaseConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey);
