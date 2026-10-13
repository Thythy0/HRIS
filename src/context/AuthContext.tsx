import React, { createContext, useContext, useEffect, useState } from 'react';
import { getDB, SEED } from '../data/mock';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { pullDatabase, seedDatabase } from '../lib/sync';

interface User { id: number; name: string; email: string; role: string; pass?: string; }
interface AuthCtx { user: User | null; login: (email: string, pass: string) => Promise<boolean>; logout: () => void; dbReady: boolean; }
const Ctx = createContext<AuthCtx>(null as any);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem('hrsuite_user') || 'null'); } catch { return null; }
  });
  const [dbReady, setDbReady] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    (async () => {
      try {
        const pulled = await pullDatabase();
        if (!pulled) await seedDatabase(SEED);
        else return;
        await pullDatabase();
      } catch (e) {
        console.warn('[supabase sync]', (e as Error).message);
      } finally {
        setDbReady(true);
      }
    })();
  }, []);

  const login = async (email: string, pass: string) => {
    const em = email.trim().toLowerCase();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('users').select('*').ilike('email', em).limit(1).maybeSingle();
        if (!error && data && (data as any).pass === pass) {
          const { pass: _p, ...safe }: any = data;
          setUser(safe); localStorage.setItem('hrsuite_user', JSON.stringify(safe));
          return true;
        }
      } catch { /* fall through to local */ }
    }
    const u = getDB().users.find((x: any) => String(x.email).toLowerCase().trim() === em && x.pass === pass);
    if (u) { const { pass: _p, ...safe }: any = u; setUser(safe); localStorage.setItem('hrsuite_user', JSON.stringify(safe)); return true; }
    return false;
  };
  const logout = () => { setUser(null); localStorage.removeItem('hrsuite_user'); };
  return <Ctx.Provider value={{ user, login, logout, dbReady }}>{children}</Ctx.Provider>;
};
export const useAuth = () => useContext(Ctx);
