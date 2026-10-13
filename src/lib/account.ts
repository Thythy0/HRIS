import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Login account management.
 *
 * Passwords live in Supabase Auth only — the users table holds the profile
 * (name / email / role / auth_uid / emp_id). All mutations go through the
 * `admin-users` Edge Function, which requires a signed-in Super Admin or
 * HR/Admin caller. The publishable key in the browser can never create,
 * change, or remove logins directly.
 */

async function invokeAdminUsers(action: string, payload: Record<string, unknown>) {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.functions.invoke('admin-users', { body: { action, ...payload } });
  if (error) throw new Error(error.message);
  if (data && (data as any).error) throw new Error((data as any).error);
  return (data as any)?.user ?? null;
}

/** Provision a login for an employee (HR/Admin only). Returns the users row. */
export const provisionLogin = (p: {
  email: string; password: string; name: string; role: string; empId?: number | null;
}) => invokeAdminUsers('create', p);

/** Update an existing login (email, password, name, role, employee link). */
export const updateLogin = (p: {
  currentEmail: string; email?: string; password?: string; name?: string; role?: string; empId?: number | null;
}) => invokeAdminUsers('update', p);

/** Remove a login (never allowed for Super Admin — enforced server-side). */
export const removeLogin = (email: string) => invokeAdminUsers('delete', { email });

/** Signed-in user changes their own password. */
export async function changePassword(newPassword: string) {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');
  if (newPassword.length < 8) throw new Error('Password must be at least 8 characters');
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

/** Send a password reset email (login page "Forgot" tab). */
export async function sendPasswordReset(email: string) {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/login`,
  });
  if (error) throw new Error(error.message);
}
