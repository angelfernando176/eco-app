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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateBusinessInput(input: BusinessInput): BusinessFieldErrors {
  const errors: BusinessFieldErrors = {}

  if (!input.tradeName.trim()) errors.tradeName = 'Ingresá el nombre comercial.'
  if (!input.ruc.trim()) errors.ruc = 'Ingresá el RUC.'
  if (!input.phone.trim()) errors.phone = 'Ingresá el teléfono.'

  if (!input.representativeEmail.trim()) {
    errors.representativeEmail = 'Ingresá el correo del representante.'
  } else if (!EMAIL_PATTERN.test(input.representativeEmail)) {
    errors.representativeEmail = 'Ingresá un correo válido.'
  }

  if (!input.mainStreet.trim()) errors.mainStreet = 'Ingresá la calle principal.'
  if (!input.secondaryStreet.trim()) errors.secondaryStreet = 'Ingresá la calle secundaria.'
  if (!input.number.trim()) errors.number = 'Ingresá el número.'
  if (!input.reference.trim()) errors.reference = 'Ingresá una referencia.'

  if (Number.isNaN(input.latitude) || input.latitude < -90 || input.latitude > 90) {
    errors.latitude = 'La latitud debe estar entre -90 y 90.'
  }
  if (Number.isNaN(input.longitude) || input.longitude < -180 || input.longitude > 180) {
    errors.longitude = 'La longitud debe estar entre -180 y 180.'
  }

  return errors
}
