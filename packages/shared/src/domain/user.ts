import type { ID } from './common'

/** Roles definidos por el proyecto. */
export type Role = 'admin' | 'web_user' | 'mobile_user'

/**
 * Tipo de usuario (columna "tipo" de la gestión de usuarios).
 * 1 = Usuario web/escritorio; 2 = Usuario móvil.
 */
export const UserType = {
  Web: 1,
  Mobile: 2,
} as const
export type UserTypeValue = (typeof UserType)[keyof typeof UserType]

export type UserStatus = 'active' | 'inactive'

/** Rango de edad declarado por el usuario. */
export type AgeRange = string

export interface User {
  id: ID
  firstName: string
  lastName: string
  ageRange: AgeRange
  email: string
  type: UserTypeValue
  status: UserStatus
  createdAt: string
}
