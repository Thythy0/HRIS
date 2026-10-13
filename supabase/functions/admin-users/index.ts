import { withSupabase } from 'npm:@supabase/server@1'

/**
 * HRSuite account provisioning.
 *
 * auth: 'user' — requires a valid signed-in user JWT; the handler additionally
 * requires the caller's users.role to be Super Admin or HR/Admin.
 *
 * Actions (POST JSON body):
 *   create  { email, password, name, role, empId? }
 *   update  { currentEmail, email?, password?, name?, role?, empId? }
 *   delete  { email }
 *
 * Guards:
 *   - only Super Admin may create/modify Super Admin accounts
 *   - Super Admin accounts can never be deleted
 *   - passwords must be >= 8 chars; roles validated against the app's list
 *   - on create, a failed profile insert rolls back the auth user
 */

const ADMIN_ROLES = ['Super Admin', 'HR/Admin']
const ROLES = ['Super Admin', 'HR/Admin', 'Payroll Officer', 'Manager', 'Finance', 'Employee']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const sub = ctx.userClaims?.sub
    if (!sub) return Response.json({ error: 'Not signed in' }, { status: 401 })

    // Caller identity, read through the user-scoped client (RLS applies)
    const { data: caller } = await ctx.supabase
      .from('users')
      .select('role')
      .eq('auth_uid', sub)
      .maybeSingle()
    if (!caller || !ADMIN_ROLES.includes(caller.role)) {
      return Response.json({ error: 'Forbidden — HR/Admin role required' }, { status: 403 })
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: 'JSON body required' }, { status: 400 })
    }

    try {
      switch (body?.action) {
        case 'create': return await createAccount(ctx.supabaseAdmin, body, caller.role)
        case 'update': return await updateAccount(ctx.supabaseAdmin, body, caller.role)
        case 'delete': return await deleteAccount(ctx.supabaseAdmin, body, caller.role)
        default: return Response.json({ error: 'Unknown action' }, { status: 400 })
      }
    } catch (e: any) {
      return Response.json({ error: e?.message ?? 'Internal error' }, { status: 500 })
    }
  }),
}

async function createAccount(admin: any, body: any, callerRole: string) {
  const { email, password, name, role, empId } = body ?? {}
  if (!EMAIL_RE.test(email ?? '')) return Response.json({ error: 'A valid email is required' }, { status: 400 })
  if (typeof password !== 'string' || password.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }
  if (!ROLES.includes(role)) return Response.json({ error: 'Invalid role' }, { status: 400 })
  if (role === 'Super Admin' && callerRole !== 'Super Admin') {
    return Response.json({ error: 'Only Super Admin can create Super Admin accounts' }, { status: 403 })
  }

  const { data: au, error: authErr } = await admin.auth.admin.createUser({
    email: String(email).trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { full_name: name ?? '' },
  })
  if (authErr || !au?.user) {
    return Response.json({ error: authErr?.message ?? 'Failed to create login' }, { status: 400 })
  }

  const { data: profile, error: profileErr } = await admin
    .from('users')
    .insert({
      auth_uid: au.user.id,
      email: au.user.email,
      name: name ?? au.user.email,
      role,
      emp_id: empId ?? null,
    })
    .select()
    .single()

  if (profileErr) {
    // Roll back so we never leave an orphaned login without a profile
    await admin.auth.admin.deleteUser(au.user.id).catch(() => {})
    return Response.json({ error: profileErr.message }, { status: 400 })
  }
  return Response.json({ user: profile })
}

async function updateAccount(admin: any, body: any, callerRole: string) {
  const { currentEmail, email, password, name, role, empId } = body ?? {}
  const target = String(currentEmail ?? '').trim().toLowerCase()
  if (!target) return Response.json({ error: 'currentEmail is required' }, { status: 400 })

  const { data: targetRow } = await admin
    .from('users')
    .select('role, auth_uid')
    .eq('email', target)
    .maybeSingle()
  if (!targetRow?.auth_uid) return Response.json({ error: 'Account not found' }, { status: 404 })

  // Super Admin accounts are only modifiable by Super Admin
  if (targetRow.role === 'Super Admin' && callerRole !== 'Super Admin') {
    return Response.json({ error: 'Only Super Admin can modify Super Admin accounts' }, { status: 403 })
  }
  if (role && role === 'Super Admin' && callerRole !== 'Super Admin') {
    return Response.json({ error: 'Only Super Admin can grant Super Admin' }, { status: 403 })
  }
  if (role && !ROLES.includes(role)) return Response.json({ error: 'Invalid role' }, { status: 400 })
  if (email !== undefined && !EMAIL_RE.test(email)) {
    return Response.json({ error: 'A valid email is required' }, { status: 400 })
  }
  if (password !== undefined && password !== '' && (typeof password !== 'string' || password.length < 8)) {
    return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const authUpdate: Record<string, string> = {}
  if (email && String(email).trim().toLowerCase() !== target) authUpdate.email = String(email).trim().toLowerCase()
  if (password) authUpdate.password = password
  if (Object.keys(authUpdate).length) {
    const { error: e } = await admin.auth.admin.updateUserById(targetRow.auth_uid, authUpdate)
    if (e) return Response.json({ error: e.message }, { status: 400 })
  }

  const dbUpdate: Record<string, unknown> = {}
  if (Object.prototype.hasOwnProperty.call(authUpdate, 'email')) dbUpdate.email = authUpdate.email
  if (name !== undefined) dbUpdate.name = name
  if (role) dbUpdate.role = role
  if (empId !== undefined) dbUpdate.emp_id = empId ?? null
  if (Object.keys(dbUpdate).length) {
    const { error: e } = await admin.from('users').update(dbUpdate).eq('auth_uid', targetRow.auth_uid)
    if (e) return Response.json({ error: e.message }, { status: 400 })
  }

  const { data: updated } = await admin
    .from('users')
    .select()
    .eq('auth_uid', targetRow.auth_uid)
    .maybeSingle()
  return Response.json({ user: updated })
}

async function deleteAccount(admin: any, body: any, callerRole: string) {
  const target = String(body?.email ?? '').trim().toLowerCase()
  if (!target) return Response.json({ error: 'email is required' }, { status: 400 })

  const { data: targetRow } = await admin
    .from('users')
    .select('role, auth_uid')
    .eq('email', target)
    .maybeSingle()
  if (!targetRow?.auth_uid) return Response.json({ error: 'Account not found' }, { status: 404 })

  // Super Admin accounts can never be deleted
  if (targetRow.role === 'Super Admin') {
    return Response.json({ error: 'Super Admin accounts cannot be deleted' }, { status: 403 })
  }

  await admin.auth.admin.deleteUser(targetRow.auth_uid)
  await admin.from('users').delete().eq('auth_uid', targetRow.auth_uid)
  return Response.json({ ok: true })
}
