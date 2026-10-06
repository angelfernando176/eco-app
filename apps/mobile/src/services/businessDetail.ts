import { supabase } from '../lib/supabase'
import {
  mapProducts,
  mapRatingSummary,
  mapRatings,
  mapVideos,
  type Product,
  type ProductImageRow,
  type ProductRow,
  type Rating,
  type RatingRow,
  type RatingSummary,
  type Video,
  type VideoRow,
} from './businessDetailLogic'

const RATINGS_PAGE_SIZE = 20

export async function fetchMenu(businessId: string): Promise<Product[]> {
  if (!supabase) {
    throw new Error('La app no está configurada para conectarse a Supabase.')
  }

  const { data: productRows, error: productError } = await supabase
    .from('products')
    .select('id, business_id, name, description, price, is_primary, is_secondary')
    .eq('business_id', businessId)

  if (productError) {
    throw new Error(`No se pudo cargar el menú: ${productError.message}`)
  }

  const products = (productRows ?? []) as ProductRow[]
  const productIds = products.map((row) => row.id)

  let imageRows: ProductImageRow[] = []
  if (productIds.length > 0) {
    const { data, error: imageError } = await supabase
      .from('product_images')
      .select('id, product_id, url, description, position')
      .in('product_id', productIds)
      .order('position', { ascending: true })

    if (imageError) {
      throw new Error(`No se pudieron cargar las imágenes del menú: ${imageError.message}`)
    }
    imageRows = (data ?? []) as ProductImageRow[]
  }

  return mapProducts(products, imageRows)
}

export async function fetchVideos(businessId: string): Promise<Video[]> {
  if (!supabase) {
    throw new Error('La app no está configurada para conectarse a Supabase.')
  }

  const { data: videoRows, error: videoError } = await supabase
    .from('videos')
    .select('id, business_id, product_id, url, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (videoError) {
    throw new Error(`No se pudieron cargar los videos: ${videoError.message}`)
  }

  const videos = (videoRows ?? []) as VideoRow[]
  const productIds = [...new Set(videos.map((row) => row.product_id))]

  let productNameById = new Map<string, string>()
  if (productIds.length > 0) {
    const { data: productRows, error: productError } = await supabase
      .from('products')
      .select('id, name')
      .in('id', productIds)

    if (productError) {
      throw new Error(`No se pudieron cargar los videos: ${productError.message}`)
    }

    productNameById = new Map((productRows ?? []).map((row: { id: string; name: string }) => [row.id, row.name]))
  }

  return mapVideos(videos, productNameById)
}

export async function fetchRatingSummary(businessId: string): Promise<RatingSummary> {
  if (!supabase) {
    throw new Error('La app no está configurada para conectarse a Supabase.')
  }

  const { data, error } = await supabase.rpc('business_rating_summary', { p_business_id: businessId })
  if (error) {
    throw new Error(`No se pudo cargar el resumen de calificaciones: ${error.message}`)
  }

  const row = Array.isArray(data) ? data[0] : data
  return mapRatingSummary(row ?? null)
}

export interface FetchRatingsInput {
  businessId: string
  page: number
}

export async function fetchRatings({ businessId, page }: FetchRatingsInput): Promise<Rating[]> {
  if (!supabase) {
    throw new Error('La app no está configurada para conectarse a Supabase.')
  }

  const { data, error } = await supabase.rpc('list_business_ratings', {
    p_business_id: businessId,
    p_limit: RATINGS_PAGE_SIZE,
    p_offset: page * RATINGS_PAGE_SIZE,
  })

  if (error) {
    throw new Error(`No se pudieron cargar las calificaciones: ${error.message}`)
  }

  return mapRatings((data ?? []) as RatingRow[])
}

export { RATINGS_PAGE_SIZE }
