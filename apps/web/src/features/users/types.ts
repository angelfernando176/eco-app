import type { UserTypeValue } from '@eco/shared'

/** User search fields exposed by the list screen (per-field `ilike` filters). */
export type SearchableField = 'first_name' | 'last_name' | 'age_range' | 'email'

/** Editable user fields (email and type are read-only on edit: email is the Auth identity
 * and type is assigned at sign-up — see rules.ts). */
export interface UserInput {
  firstName: string
  lastName: string
  ageRange: string
}

/** Optional type filter for the list screen (1 = web/escritorio, 2 = móvil). */
export type TypeFilter = UserTypeValue | ''

export interface UserListFilters extends Partial<Record<SearchableField, string>> {
  type?: UserTypeValue
}

/** Per-row subscription state shown as a badge in the user list (avoids N+1 queries). */
export type SubscriptionBadgeState = 'active' | 'none'
