import { withSupabase } from 'npm:@supabase/server@1'

/**
 * HRSuite audit log writer.
 *
 * auth: 'user' — requires a valid signed-in user JWT. The actor name is
 * resolved server-side from the users table, so clients cannot forge audit
 * entries. Combined with the RLS policy on audit_logs (insert only, actor
 * pinned to the caller; no update/delete policies) this makes the trail
 * tamper-resistant.
 *
 * Body: { action, module, record?, detail? }
 */

// Best-effort per-user rate limit (per function instance, per rolling minute)
const LIMIT = 120
const WINDOW_MS = 60_000
const hits = new Map<string, { count: number; reset: number }>()

function rateLimited(sub: string): boolean {
  const now = Date.now()
  const state = hits.get(sub)
  if (state && now < state.reset) {
    if (state.count >= LIMIT) return true
    state.count += 1
  } else {
    hits.set(sub, { count: 1, reset: now + WINDOW_MS })
  }
  // Prune stale entries so the map cannot grow unbounded
  if (hits.size > 1000) {
    for (const [key, val] of hits) {
      if (now >= val.reset) hits.delete(key)
    }
  }
  return false
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const sub = ctx.userClaims?.sub
    if (!sub) return Response.json({ error: 'Not signed in' }, { status: 401 })
    if (rateLimited(sub)) return Response.json({ error: 'Rate limit exceeded' }, { status: 429 })

    let body: any
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: 'JSON body required' }, { status: 400 })
    }

    const action = String(body?.action ?? '').slice(0, 120)
    const module = String(body?.module ?? '').slice(0, 60)
    const record = String(body?.record ?? '').slice(0, 200)
    const detail = String(body?.detail ?? '').slice(0, 1000)
    if (!action || !module) {
      return Response.json({ error: 'action and module are required' }, { status: 400 })
    }

    // Resolve actor server-side — the client cannot choose who is logged
    const { data: me } = await ctx.supabase
      .from('users')
      .select('name')
      .eq('auth_uid', sub)
      .maybeSingle()
    if (!me) {
      return Response.json({ error: 'No HRSuite account linked to this login' }, { status: 403 })
    }

    const { error } = await ctx.supabase
      .from('audit_logs')
      .insert({ actor: me.name, action, module, record, detail })
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ ok: true })
  }),
}
