import type { ID, Product as SharedProduct, Video as SharedVideo } from '@eco/shared'

/** `images` is always `[]` here; load images separately with `listProductImages`. */
export type Product = SharedProduct

export interface ProductInput {
  name: string
  description: string
  price: number
}

/** `isPrimary`/`isSecondary` are only honored for admin callers (DB trigger enforces it). */
export interface ProductPatch {
  name?: string
  description?: string
  price?: number
  isPrimary?: boolean
  isSecondary?: boolean
}

export interface ProductImage {
  id: ID
  productId: ID
  url: string
  description: string
  position: number
}

export type Video = SharedVideo

export interface Skill {
  id: ID
  businessId: ID
  name: string
}
