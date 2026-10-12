import { supabase } from '../lib/supabase'

export interface AdminSession {
  email: string
}

export type AdminSignInResult = { ok: true; session: AdminSession } | { ok: false; message: string }

export async function signInAsAdmin(email: string, password: string): Promise<AdminSignInResult> {
  if (!supabase) {
    return { ok: false, message: 'La app no está configurada para conectarse a Supabase.' }
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) {
    return { ok: false, message: 'Usuario o contraseña incorrectos.' }
  }

  const role = data.user.app_metadata?.role
  if (role !== 'admin') {
    await supabase.auth.signOut()
    return { ok: false, message: 'Esta cuenta no tiene permisos de administrador.' }
  }

  return { ok: true, session: { email } }
}

export async function signOutAdmin(): Promise<void> {
  try {
    await supabase?.auth.signOut()
  } catch {
    // best-effort
  }
}
