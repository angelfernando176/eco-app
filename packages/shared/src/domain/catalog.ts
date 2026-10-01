import type { ID } from './common'

export interface ProductImage {
  id: ID
  url: string
  description: string
}

export interface Product {
  id: ID
  businessId: ID
  name: string
  description: string
  price: number
  images: ProductImage[]
  isPrimary: boolean
  isSecondary: boolean
  createdAt: string
  updatedAt: string
}

export interface Video {
  id: ID
  businessId: ID
  productId: ID
  url: string
  createdAt: string
}
