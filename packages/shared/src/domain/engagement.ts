import type { ID } from './common'

/** Palabra clave asociada a un negocio (skills). */
export interface Skill {
  id: ID
  businessId: ID
  name: string
}

export type RatingValue = 1 | 2 | 3 | 4 | 5

export interface Rating {
  id: ID
  businessId: ID
  mobileUserId: ID
  rating: RatingValue
  comment: string
  createdAt: string
}
