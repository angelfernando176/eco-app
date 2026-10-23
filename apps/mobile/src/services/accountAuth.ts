import { supabase } from '../lib/supabase'

export type AccountVerifyResult =
  | { ok: true; userId: string; firstName: string; role: 'none' | 'subscribed' | 'admin' }
  | { ok: false }

function mapRegisterErrorToSpanish(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/already exists/i.test(message)) {
    return 'Ese correo ya tiene una cuenta registrada.'
  }
  if (/invalid email/i.test(message)) {
    return 'El correo ingresado no es válido.'
  }
  if (/password/i.test(message)) {
    return 'La clave debe tener al menos 6 caracteres, con letras y números.'
  }
  return 'No se pudo crear la cuenta. Intenta nuevamente.'
}

export async function registerAccount(
  firstName: string,
  ageRange: string,
  email: string,
  password: string
): Promise<{ ok: true; remoteUserId: string } | { ok: false; message: string }> {
  if (!supabase) {
    return { ok: false, message: 'La app no está configurada para conectarse a Supabase.' }
  }

  const { data, error } = await supabase.rpc('register_mobile_account', {
    p_first_name: firstName,
    p_age_range: ageRange,
    p_email: email,
    p_password: password,
  })

  if (error) {
    return { ok: false, message: mapRegisterErrorToSpanish(error) }
  }

  return { ok: true, remoteUserId: data as string }
}

export async function verifyAccount(email: string, password: string): Promise<AccountVerifyResult> {
  if (!supabase) {
    return { ok: false }
  }

  const { data, error } = await supabase.functions.invoke('eco-mobile-verify-account', {
    body: { email, password },
  })

  if (error || !data || data.ok !== true) {
    return { ok: false }
  }

  return { ok: true, userId: data.userId, firstName: data.firstName, role: data.role }
}
