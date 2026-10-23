// POST { email, password } — called by the mobile app (no Auth JWT device) to resolve a
// stateless role for an email+password it caches locally (never a persistent Auth session).
// Tries Supabase Auth first (web/admin accounts), then ECO.users.type = 2 (mobile accounts,
// password_hash from 0008_mobile_accounts.sql). Never reveals whether an email exists: any
// failed/unmatched case returns { ok: false } with HTTP 200, not an error.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleCorsPreflight } from '../_shared/cors.ts'
import { adminClient } from '../_shared/auth.ts'
import { json, HttpError, errorResponse } from '../_shared/http.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

interface VerifyInput {
  email: string
  password: string
}

type Role = 'none' | 'subscribed' | 'admin'

function parseInput(body: unknown): VerifyInput {
  if (typeof body !== 'object' || body === null) throw new HttpError(400, 'Invalid request body.')
  const { email, password } = body as Record<string, unknown>

  if (typeof email !== 'string' || email.trim().length === 0) {
    throw new HttpError(400, 'Email is required.')
  }
  if (typeof password !== 'string' || password.length === 0) {
    throw new HttpError(400, 'Password is required.')
  }

  return { email: email.trim().toLowerCase(), password }
}

async function findAuthUserByEmail(email: string) {
  const client = adminClient()
  const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error || !data) return null
  return data.users.find((u) => (u.email ?? '').toLowerCase() === email) ?? null
}

async function resolveRoleForAuthUser(authUserId: string, isAdmin: boolean): Promise<{ role: Role; userId: string; firstName: string }> {
  const client = adminClient()
  const { data: profile } = await client
    .from('users')
    .select('id, first_name')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  if (isAdmin) {
    return { role: 'admin', userId: profile?.id ?? authUserId, firstName: profile?.first_name ?? '' }
  }

  if (!profile) {
    return { role: 'none', userId: authUserId, firstName: '' }
  }

  const { data: subscription } = await client
    .from('subscriptions')
    .select('id')
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .maybeSingle()

  return { role: subscription ? 'subscribed' : 'none', userId: profile.id, firstName: profile.first_name }
}

async function verifyAuthPassword(email: string, password: string): Promise<{ role: Role; userId: string; firstName: string } | null> {
  const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data, error } = await tempClient.auth.signInWithPassword({ email, password })

  if (error || !data.user) return null

  const isAdmin = (data.user.app_metadata as Record<string, unknown> | undefined)?.role === 'admin'
  const result = await resolveRoleForAuthUser(data.user.id, isAdmin)

  await tempClient.auth.signOut().catch(() => undefined)

  return result
}

async function verifyMobilePassword(email: string, password: string): Promise<{ role: Role; userId: string; firstName: string } | null> {
  const client = adminClient()
  const { data, error } = await client.rpc('verify_mobile_password', { p_email: email, p_password: password })
  if (error || !data || data.length === 0) return null

  const row = data[0] as { id: string; first_name: string; matched: boolean }
  if (!row.matched) return null

  const { data: subscription } = await client
    .from('subscriptions')
    .select('id')
    .eq('user_id', row.id)
    .eq('status', 'active')
    .maybeSingle()

  return { role: subscription ? 'subscribed' : 'none', userId: row.id, firstName: row.first_name }
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.')

    const input = parseInput(await req.json().catch(() => null))

    const authUser = await findAuthUserByEmail(input.email)
    if (authUser) {
      const result = await verifyAuthPassword(input.email, input.password)
      if (!result) return json(200, { ok: false })
      return json(200, { ok: true, userId: result.userId, firstName: result.firstName, role: result.role })
    }

    const mobileResult = await verifyMobilePassword(input.email, input.password)
    if (!mobileResult) return json(200, { ok: false })
    return json(200, { ok: true, userId: mobileResult.userId, firstName: mobileResult.firstName, role: mobileResult.role })
  } catch (error) {
    return errorResponse(error)
  }
})
