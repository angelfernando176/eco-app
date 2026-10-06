/**
 * Dependency-free sync decisions (validation, payload building, error
 * mapping) so they can be sanity-checked outside of Expo/React Native.
 */

export interface RatingInput {
  businessId: string
  rating: number
  comentario: string
}

export interface RatingValidationError {
  field: 'businessId' | 'rating' | 'comentario'
  message: string
}

export function validateRatingInput(input: RatingInput): RatingValidationError | null {
  if (!input.businessId.trim()) {
    return { field: 'businessId', message: 'El negocio es obligatorio.' }
  }
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { field: 'rating', message: 'La calificación debe ser un número entre 1 y 5.' }
  }
  if (input.comentario.trim().length > 500) {
    return { field: 'comentario', message: 'El comentario debe tener como máximo 500 caracteres.' }
  }
  return null
}

export interface RatingPayload {
  p_mobile_user_id: string
  p_business_id: string
  p_rating: number
  p_comment: string
}

export function buildRatingPayload(mobileUserId: string, input: RatingInput): RatingPayload {
  return {
    p_mobile_user_id: mobileUserId,
    p_business_id: input.businessId,
    p_rating: input.rating,
    p_comment: input.comentario.trim().slice(0, 500),
  }
}

export interface SyncState {
  hasRemoteUserId: boolean
  pendingCount: number
}

export interface SyncDecision {
  needsRegister: boolean
  canPushRatings: boolean
  skipReason: string | null
}

export function decideSyncActions(state: SyncState): SyncDecision {
  const needsRegister = !state.hasRemoteUserId

  if (state.pendingCount === 0) {
    return { needsRegister, canPushRatings: false, skipReason: null }
  }

  if (!state.hasRemoteUserId) {
    return {
      needsRegister,
      canPushRatings: false,
      skipReason: 'No se pudieron enviar las calificaciones: falta registrar el usuario.',
    }
  }

  return { needsRegister, canPushRatings: true, skipReason: null }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}

/**
 * True when the server explicitly rejected the request (a Postgres error carries a non-empty
 * `code`, e.g. P0001 for a RAISE EXCEPTION). Retrying will never succeed, so one such item must
 * not block the rest of the queue. Network failures have no code and stay retryable.
 */
export function isPermanentRejection(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false
  const code = (error as { code: unknown }).code
  return typeof code === 'string' && code.length > 0 && !/network|fetch|timeout/i.test(errorMessage(error))
}

export function mapSyncErrorToSpanish(error: unknown): string {
  const message = errorMessage(error)
  if (/network|fetch|timeout/i.test(message)) {
    return 'Sin conexión a internet. Se reintentará más adelante.'
  }
  return `No se pudo sincronizar: ${message}`
}
