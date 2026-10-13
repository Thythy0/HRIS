import React, { createContext, useContext, useEffect, useState } from 'react';
import { getDB, SEED } from '../data/mock';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { pullDatabase, seedDatabase } from '../lib/sync';

/** App-side user profile. Passwords never touch the client — Supabase Auth owns them. */
export interface User { id: number; name: string; email: string; role: string; empId?: number | null; }
interface AuthCtx { user: User | null; login: (email: string, pass: string) => Promise<User | null>; logout: () => void; dbReady: boolean; }
const Ctx = createContext<AuthCtx>(null as any);

const LOCAL_KEY = 'hrsuite_user';

const profileOf = (row: any): User => ({ id: row.id, name: row.name, email: row.email, role: row.role, empId: row.emp_id ?? null });

/** Fetch the users profile linked to the current Supabase Auth session. */
async function fetchProfile(): Promise<User | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const { data } = await supabase
      .from('users')
      .select('id, name, email, role, emp_id')
      .eq('auth_uid', session.user.id)
      .maybeSingle();
    if (data) return profileOf(data);
    // Pre-migration rows without auth_uid yet: fall back to email match
    const { data: legacy } = await supabase
      .from('users')
      .select('id, name, email, role, emp_id')
      .ilike('email', session.user.email ?? '')
      .limit(1)
      .maybeSingle();
    return legacy ? profileOf(legacy) : null;
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); } catch { return null; }
  });
  const [dbReady, setDbReady] = useState(!isSupabaseConfigured);

  const persist = (u: User | null) => {
    setUser(u);
    if (u) localStorage.setItem(LOCAL_KEY, JSON.stringify(u));
    else localStorage.removeItem(LOCAL_KEY);
  };

  /** (Re)load the local cache with the data the current session may see. */
  const syncData = async () => {
    try {
      const pulled = await pullDatabase();
      if (!pulled) await seedDatabase(SEED);
      else return;
      await pullDatabase();
    } catch (e) {
      console.warn('[supabase sync]', (e as Error).message);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) { setDbReady(true); return; }
    let cancelled = false;
    (async () => {
      try {
        // Restore the cached session first (works offline), then load authorized data
        const profile = await fetchProfile();
        if (!cancelled && profile) persist(profile);
        await syncData();
      } finally {
        if (!cancelled) setDbReady(true);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) { persist(null); return; }
      const profile = await fetchProfile();
      if (!cancelled) persist(profile);
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  /**
   * Sign in. Returns the user profile on success, null on failure.
   * With Supabase configured this goes through Supabase Auth (passwords are
   * verified server-side); the local users table is only consulted in
   * offline demo mode (no Supabase configured).
   */
  const login = async (email: string, pass: string): Promise<User | null> => {
    const em = email.trim().toLowerCase();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: em, password: pass });
        if (error || !data.session) return null;
        const profile = await fetchProfile();
        if (!profile) {
          // Auth succeeded but no HRSuite account is linked to it
          await supabase.auth.signOut().catch(() => {});
          return null;
        }
        persist(profile);
        await syncData(); // refresh local cache to what this role may see
        return profile;
      } catch {
        // Network down: accept a cached session + cached profile
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const cached = (() => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); } catch { return null; } })();
            if (cached) { persist(cached); return cached; }
          }
        } catch { /* fall through */ }
        return null;
      }
    }
    // Offline demo mode (no Supabase configured): local seed login
    const u = getDB().users.find((x: any) => String(x.email).toLowerCase().trim() === em && (x.pass ?? '') === pass);
    if (u) { const { pass: _p, ...safe }: any = u; persist(safe); return safe; }
    return null;
  };

  const logout = () => {
    persist(null);
    if (isSupabaseConfigured && supabase) supabase.auth.signOut().catch(() => {});
  };

  return <Ctx.Provider value={{ user, login, logout, dbReady }}>{children}</Ctx.Provider>;
};
export const useAuth = () => useContext(Ctx);
