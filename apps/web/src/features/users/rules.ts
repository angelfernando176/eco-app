import { isValidEmail } from '../businesses/rules'
import { AGE_RANGES } from './ageRanges'
import { USER_FIELD_LIMITS } from './limits'
import type { CreateUserInput, UserInput } from './types'

export type UserFieldErrors = Partial<Record<keyof UserInput, string>>
export type CreateUserFieldErrors = Partial<Record<keyof CreateUserInput, string>>

function validateLength(value: string, min: number, max: number, label: string, errors: UserFieldErrors, key: keyof UserInput) {
  const length = value.trim().length
  if (length < min || length > max) {
    errors[key] = `${label} debe tener entre ${min} y ${max} caracteres.`
  }
}

export function validateUserInput(input: UserInput): UserFieldErrors {
  const errors: UserFieldErrors = {}
  const limits = USER_FIELD_LIMITS

  validateLength(input.firstName, limits.firstName.min, limits.firstName.max, 'El nombre', errors, 'firstName')
  validateLength(input.lastName, limits.lastName.min, limits.lastName.max, 'El apellido', errors, 'lastName')

  if (!AGE_RANGES.includes(input.ageRange)) {
    errors.ageRange = 'Seleccioná un rango de edad válido.'
  }

  return errors
}

/** Admins never deactivate their own profile from this screen (keeps at least one active admin session). */
export function canDeactivateUser({ isSelf }: { isSelf: boolean }): boolean {
  return !isSelf
}

export function validateCreateUserInput(input: CreateUserInput): CreateUserFieldErrors {
  const errors: CreateUserFieldErrors = validateUserInput(input)
  if (!isValidEmail(input.email)) {
    errors.email = 'Ingresá un correo válido.'
  }
  return errors
}
