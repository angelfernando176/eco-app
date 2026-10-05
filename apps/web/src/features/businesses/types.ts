/** Business search fields exposed by the list screen (per-field `ilike` filters). */
export type SearchableField =
  | 'trade_name'
  | 'ruc'
  | 'phone'
  | 'representative_email'
  | 'main_street'
  | 'secondary_street'
  | 'number'
  | 'reference'

/** Editable business fields shared by create and update (no logo: deferred to Storage feature). */
export interface BusinessInput {
  tradeName: string
  ruc: string
  phone: string
  representativeEmail: string
  latitude: number
  longitude: number
  mainStreet: string
  secondaryStreet: string
  number: string
  reference: string
}

/** Create requires an explicit owner (admin picks it; web users default to their own profile id). */
export interface CreateBusinessInput extends BusinessInput {
  ownerId: string
}

/** Web user option for the admin's owner picker when creating a business. */
export interface WebUserOption {
  id: string
  firstName: string
  lastName: string
  email: string
}
