import type { Address, Coordinates, ID } from './common'

export interface Business {
  id: ID
  ownerId: ID
  tradeName: string
  ruc: string
  phone: string
  representativeEmail: string
  logoUrl: string | null
  coordinates: Coordinates
  address: Address
  createdAt: string
  updatedAt: string
}
