/**
 * Dependency-free mapping and formatting for the business detail screen
 * (menu, videos, ranking, contact), so it can be sanity-checked outside of
 * Expo/React Native/Supabase.
 */

export interface ProductRow {
  id: string
  business_id: string
  name: string
  description: string
  price: number
  is_primary: boolean
  is_secondary: boolean
}

export interface Product {
  id: string
  businessId: string
  name: string
  description: string
  price: number
  isPrimary: boolean
  isSecondary: boolean
  images: ProductImage[]
}

export interface ProductImageRow {
  id: string
  product_id: string
  url: string
  description: string
  position: number
}

export interface ProductImage {
  id: string
  productId: string
  url: string
  description: string
  position: number
}

export interface VideoRow {
  id: string
  business_id: string
  product_id: string
  url: string
  created_at: string
}

export interface Video {
  id: string
  businessId: string
  productId: string
  url: string
  createdAt: string
  productName: string
}

export interface RatingSummaryRow {
  average: number
  total: number
}

export interface RatingSummary {
  average: number
  total: number
}

export interface RatingRow {
  rating: number
  comment: string
  created_at: string
  reviewer_name: string
}

export interface Rating {
  rating: number
  comment: string
  createdAt: string
  reviewerName: string
}

export function mapProductImageRow(row: ProductImageRow): ProductImage {
  return {
    id: row.id,
    productId: row.product_id,
    url: row.url,
    description: row.description,
    position: row.position,
  }
}

/**
 * Orders products primary first, then secondary, then alphabetically by
 * name, attaching each product's images (already grouped/sorted by
 * position) from a single id-keyed lookup.
 */
export function mapProducts(rows: ProductRow[], imageRows: ProductImageRow[]): Product[] {
  const imagesByProduct = groupImagesByProduct(imageRows)

  return rows
    .map((row) => ({
      id: row.id,
      businessId: row.business_id,
      name: row.name,
      description: row.description,
      price: row.price,
      isPrimary: row.is_primary,
      isSecondary: row.is_secondary,
      images: imagesByProduct.get(row.id) ?? [],
    }))
    .sort(compareProducts)
}

function compareProducts(a: { isPrimary: boolean; isSecondary: boolean; name: string }, b: { isPrimary: boolean; isSecondary: boolean; name: string }): number {
  if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
  if (a.isSecondary !== b.isSecondary) return a.isSecondary ? -1 : 1
  return a.name.localeCompare(b.name, 'es')
}

export function groupImagesByProduct(rows: ProductImageRow[]): Map<string, ProductImage[]> {
  const byProduct = new Map<string, ProductImage[]>()

  for (const row of rows) {
    const image = mapProductImageRow(row)
    const existing = byProduct.get(image.productId)
    if (existing) {
      existing.push(image)
    } else {
      byProduct.set(image.productId, [image])
    }
  }

  for (const images of byProduct.values()) {
    images.sort((a, b) => a.position - b.position)
  }

  return byProduct
}

export function mapVideo(row: VideoRow, productNameById: Map<string, string>): Video {
  return {
    id: row.id,
    businessId: row.business_id,
    productId: row.product_id,
    url: row.url,
    createdAt: row.created_at,
    productName: productNameById.get(row.product_id) ?? '',
  }
}

export function mapVideos(rows: VideoRow[], productNameById: Map<string, string>): Video[] {
  return rows.map((row) => mapVideo(row, productNameById))
}

export function mapRatingSummary(row: RatingSummaryRow | null | undefined): RatingSummary {
  return {
    average: row ? clampRating(row.average) : 0,
    total: row?.total ?? 0,
  }
}

export function mapRating(row: RatingRow): Rating {
  return {
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
    reviewerName: row.reviewer_name,
  }
}

export function mapRatings(rows: RatingRow[]): Rating[] {
  return rows.map(mapRating)
}

/** Clamps to the valid [0, 5] rating range (the summary RPC can return 0 with no ratings). */
export function clampRating(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(5, Math.max(0, value))
}

/** "4,5 de 5 estrellas" for accessibility labels. */
export function starsLabel(average: number): string {
  const clamped = clampRating(average)
  return `${formatRatingNumber(clamped)} de 5 estrellas`
}

function formatRatingNumber(value: number): string {
  return value.toFixed(1).replace('.', ',')
}

/** "$12,50" (es, two decimals, comma separator). Rounds to the nearest cent. */
export function formatPrice(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return `$${rounded.toFixed(2).replace('.', ',')}`
}

/** "dd/mm/yyyy" (es) from an ISO timestamp. */
export function formatDate(iso: string): string {
  const date = new Date(iso)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export interface GoogleMapsUrls {
  directionsUrl: string
  searchUrl: string
}

export function buildGoogleMapsUrls(latitude: number, longitude: number, label: string): GoogleMapsUrls {
  const destination = `${latitude},${longitude}`
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
  const searchQuery = label ? `${destination}(${label})` : destination
  const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`
  return { directionsUrl, searchUrl }
}
