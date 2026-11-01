import { supabase } from '../lib/supabase'

export type AccountVerifyResult =
  | { ok: true; userId: string; firstName: string; role: 'none' | 'subscribed' | 'admin' }
  | { ok: false }

const DUPLICATE_EMAIL_MESSAGE = 'Ese correo ya tiene una cuenta registrada.'
const NETWORK_ERROR_MESSAGE = 'No hay conexión con el servidor. Revisa tu internet e intenta nuevamente.'

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message
  }
  return String(error)
}

function mapRegisterErrorToSpanish(error: unknown): string {
  const message = extractErrorMessage(error)
  if (/already exists/i.test(message)) {
    return DUPLICATE_EMAIL_MESSAGE
  }
  if (/invalid email/i.test(message)) {
    return 'El correo ingresado no es válido.'
  }
  if (/invalid gender/i.test(message)) {
    return 'Selecciona un género válido.'
  }
  if (/password/i.test(message)) {
    return 'La clave debe tener al menos 6 caracteres, con letras y números.'
  }
  if (/fetch failed|network|timeout|NetworkError/i.test(message)) {
    return NETWORK_ERROR_MESSAGE
  }
  // Error sin clasificar: no lo silenciamos sin rastro, el usuario no tiene
  // forma de resolverlo si no queda registrado en algún lado para diagnosticar.
  console.error('[accountAuth] registro fallido con error no reconocido:', error)
  return `No se pudo crear la cuenta. Intenta nuevamente. (${message.slice(0, 120)})`
}

export async function registerAccount(
  firstName: string,
  ageRange: string,
  email: string,
  password: string,
  gender: 1 | 2 | 3
): Promise<{ ok: true; remoteUserId: string } | { ok: false; message: string }> {
  if (!supabase) {
    return { ok: false, message: 'La app no está configurada para conectarse a Supabase.' }
  }

  const { data, error } = await supabase.rpc('register_mobile_account', {
    p_first_name: firstName,
    p_age_range: ageRange,
    p_email: email,
    p_password: password,
    p_gender: gender,
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

export async function registerOrLogin(
  firstName: string,
  ageRange: string,
  email: string,
  password: string,
  gender: 1 | 2 | 3
): Promise<{ ok: true; remoteUserId: string; role: 'none' | 'subscribed' | 'admin' } | { ok: false; message: string }> {
  const result = await registerAccount(firstName, ageRange, email, password, gender)
  if (result.ok) {
    return { ok: true, remoteUserId: result.remoteUserId, role: 'none' }
  }

  if (result.message !== DUPLICATE_EMAIL_MESSAGE) {
    return result
  }

  const verifyResult = await verifyAccount(email, password)
  if (!verifyResult.ok) {
    return {
      ok: false,
      message: 'Ese correo ya tiene una cuenta y la clave no coincide. Si ya tenés cuenta en la web, usá la misma clave.',
    }
  }

  return { ok: true, remoteUserId: verifyResult.userId, role: verifyResult.role }
}
