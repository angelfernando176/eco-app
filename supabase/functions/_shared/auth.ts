// Authorization helpers: validates the caller's JWT and the admin claim, and builds the
// service-role client used to act on the `eco` schema with elevated privileges.

import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2'
import { HttpError } from './http.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

/** Validates the Authorization bearer JWT and requires the `app_metadata.role = 'admin'` claim. */
export async function requireAdmin(req: Request): Promise<User> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) throw new HttpError(401, 'Falta el encabezado de autorización.')

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })

  const { data, error } = await client.auth.getUser()
  if (error || !data.user) throw new HttpError(401, 'Sesión inválida o expirada.')

  const role = (data.user.app_metadata as Record<string, unknown> | undefined)?.role
  if (role !== 'admin') throw new HttpError(403, 'Se requiere rol de administrador.')

  return data.user
}

/** Service-role client scoped to the `eco` schema, for server-side writes outside RLS. */
export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    db: { schema: 'eco' },
  })
}
