/** Identificador de entidad. UUID en Supabase; string en la capa de dominio. */
export type ID = string

export interface Coordinates {
  latitude: number
  longitude: number
}

export interface Address {
  mainStreet: string
  secondaryStreet: string
  number: string
  reference: string
}
