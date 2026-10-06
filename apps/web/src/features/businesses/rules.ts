import { BUSINESS_FIELD_LIMITS } from './limits'
import type { BusinessInput } from './types'

export interface CanCreateBusinessParams {
  isAdmin: boolean
  hasActiveSubscription: boolean
  ownedCount: number
}

/** Admin: unlimited. Web user: active subscription, or fewer than 1 owned business. */
export function canCreateBusiness({ isAdmin, hasActiveSubscription, ownedCount }: CanCreateBusinessParams): boolean {
  if (isAdmin) return true
  return hasActiveSubscription || ownedCount < 1
}

export interface CanDeleteBusinessParams {
  isAdmin: boolean
}

/** Only admins delete businesses (web users create/edit their own but never delete). */
export function canDeleteBusiness({ isAdmin }: CanDeleteBusinessParams): boolean {
  return isAdmin
}

export type BusinessFieldErrors = Partial<Record<keyof BusinessInput, string>>

const EMAIL_PATTERN = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/
const RUC_PATTERN = /^\d+$/
const PHONE_ALLOWED_PATTERN = /^[0-9+\-() ]+$/

function validateLength(value: string, min: number, max: number, label: string, errors: BusinessFieldErrors, key: keyof BusinessInput) {
  const length = value.trim().length
  if (length < min || length > max) {
    errors[key] = `${label} debe tener entre ${min} y ${max} caracteres.`
  }
}

/** Normalizes a coordinate string (comma or dot decimal separator) into a finite number, or NaN when invalid. */
export function parseCoordinate(value: string): number {
  const normalized = value.trim().replace(',', '.')
  if (normalized === '') return Number.NaN
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

export function validateBusinessInput(input: BusinessInput): BusinessFieldErrors {
  const errors: BusinessFieldErrors = {}
  const limits = BUSINESS_FIELD_LIMITS

  validateLength(input.tradeName, limits.tradeName.min, limits.tradeName.max, 'El nombre comercial', errors, 'tradeName')

  const ruc = input.ruc.trim()
  if (!RUC_PATTERN.test(ruc) || ruc.length < limits.ruc.min || ruc.length > limits.ruc.max) {
    errors.ruc = `El RUC debe contener solo dígitos, entre ${limits.ruc.min} y ${limits.ruc.max}.`
  }

  const phone = input.phone.trim()
  const phoneDigits = phone.replace(/\D/g, '')
  if (!PHONE_ALLOWED_PATTERN.test(phone)) {
    errors.phone = 'El teléfono solo admite dígitos y los símbolos + - ( ) espacio.'
  } else if (phoneDigits.length < limits.phone.minDigits || phone.length > limits.phone.max) {
    errors.phone = `El teléfono debe tener al menos ${limits.phone.minDigits} dígitos y máximo ${limits.phone.max} caracteres.`
  }

  const email = input.representativeEmail.trim()
  if (email.length > limits.representativeEmail.max || !EMAIL_PATTERN.test(email)) {
    errors.representativeEmail = 'Ingresá un correo válido.'
  }

  validateLength(input.mainStreet, limits.mainStreet.min, limits.mainStreet.max, 'La calle principal', errors, 'mainStreet')
  validateLength(input.secondaryStreet, limits.secondaryStreet.min, limits.secondaryStreet.max, 'La calle secundaria', errors, 'secondaryStreet')
  validateLength(input.number, limits.number.min, limits.number.max, 'El número', errors, 'number')
  validateLength(input.reference, limits.reference.min, limits.reference.max, 'La referencia', errors, 'reference')

  if (!Number.isFinite(input.latitude) || input.latitude < limits.latitude.min || input.latitude > limits.latitude.max) {
    errors.latitude = `La latitud debe ser un número entre ${limits.latitude.min} y ${limits.latitude.max}.`
  }
  if (!Number.isFinite(input.longitude) || input.longitude < limits.longitude.min || input.longitude > limits.longitude.max) {
    errors.longitude = `La longitud debe ser un número entre ${limits.longitude.min} y ${limits.longitude.max}.`
  }

  return errors
}
