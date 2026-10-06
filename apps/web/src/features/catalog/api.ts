import { supabase } from '../../lib/supabase'
import { removeMedia, uploadMedia, validateMediaFile } from '../storage/mediaStorage'
import { mapCatalogError } from './errors'
import type { Product, ProductImage, ProductInput, ProductPatch, Skill, Video } from './types'

interface ProductRow {
  id: string
  business_id: string
  name: string
  description: string
  price: number
  is_primary: boolean
  is_secondary: boolean
  created_at: string
  updated_at: string
}

interface ProductImageRow {
  id: string
  product_id: string
  url: string
  description: string
  position: number
}

interface VideoRow {
  id: string
  business_id: string
  product_id: string
  url: string
  created_at: string
}

interface SkillRow {
  id: string
  business_id: string
  name: string
}

function requireClient() {
  if (!supabase) throw new Error('Supabase no está configurado.')
  return supabase
}

function mapProductRow(row: ProductRow): Product {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    images: [],
    isPrimary: row.is_primary,
    isSecondary: row.is_secondary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapProductImageRow(row: ProductImageRow): ProductImage {
  return {
    id: row.id,
    productId: row.product_id,
    url: row.url,
    description: row.description,
    position: row.position,
  }
}

function mapVideoRow(row: VideoRow): Video {
  return {
    id: row.id,
    businessId: row.business_id,
    productId: row.product_id,
    url: row.url,
    createdAt: row.created_at,
  }
}

function mapSkillRow(row: SkillRow): Skill {
  return { id: row.id, businessId: row.business_id, name: row.name }
}

// ---------- productos ----------

export async function listProducts(businessId: string): Promise<Product[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('products')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
  if (error) throw mapCatalogError(error)
  return (data ?? []).map((row) => mapProductRow(row as ProductRow))
}

export async function createProduct(businessId: string, input: ProductInput): Promise<Product> {
  const client = requireClient()
  const { data, error } = await client
    .from('products')
    .insert({ business_id: businessId, name: input.name, description: input.description, price: input.price })
    .select('*')
    .single()
  if (error) throw mapCatalogError(error)
  return mapProductRow(data as ProductRow)
}

export async function updateProduct(id: string, patch: ProductPatch): Promise<Product> {
  const client = requireClient()
  const updates: Record<string, unknown> = {}
  if (patch.name !== undefined) updates.name = patch.name
  if (patch.description !== undefined) updates.description = patch.description
  if (patch.price !== undefined) updates.price = patch.price
  if (patch.isPrimary !== undefined) updates.is_primary = patch.isPrimary
  if (patch.isSecondary !== undefined) updates.is_secondary = patch.isSecondary

  const { data, error } = await client.from('products').update(updates).eq('id', id).select('*').single()
  if (error) throw mapCatalogError(error)
  return mapProductRow(data as ProductRow)
}

/** Best-effort removes the product's images/videos storage objects before deleting the row
 * (the row delete cascades to `product_images`/`videos`, but storage objects don't). */
export async function deleteProduct(id: string): Promise<void> {
  const client = requireClient()
  const [{ data: images }, { data: videos }] = await Promise.all([
    client.from('product_images').select('url').eq('product_id', id),
    client.from('videos').select('url').eq('product_id', id),
  ])

  const { error } = await client.from('products').delete().eq('id', id)
  if (error) throw mapCatalogError(error)

  await Promise.all([
    ...(images ?? []).map((row) => removeMedia((row as { url: string }).url).catch(() => {})),
    ...(videos ?? []).map((row) => removeMedia((row as { url: string }).url).catch(() => {})),
  ])
}

// ---------- imágenes de producto ----------

export async function listProductImages(productIds: string | string[]): Promise<ProductImage[]> {
  const client = requireClient()
  const ids = Array.isArray(productIds) ? productIds : [productIds]
  const { data, error } = await client
    .from('product_images')
    .select('*')
    .in('product_id', ids)
    .order('position', { ascending: true })
  if (error) throw mapCatalogError(error)
  return (data ?? []).map((row) => mapProductImageRow(row as ProductImageRow))
}

export async function addProductImage(
  productId: string,
  businessId: string,
  file: File,
  description: string,
): Promise<ProductImage> {
  const validationError = validateMediaFile('products', file)
  if (validationError) throw new Error(validationError)

  const client = requireClient()
  const { count } = await client
    .from('product_images')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId)

  const uploaded = await uploadMedia('products', businessId, file)
  const { data, error } = await client
    .from('product_images')
    .insert({ product_id: productId, url: uploaded.publicUrl, description, position: count ?? 0 })
    .select('*')
    .single()
  if (error) {
    await removeMedia(uploaded.publicUrl).catch(() => {})
    throw mapCatalogError(error)
  }
  return mapProductImageRow(data as ProductImageRow)
}

export async function updateProductImage(
  id: string,
  patch: { description?: string; file?: File },
): Promise<ProductImage> {
  const client = requireClient()
  const { data: current, error: fetchError } = await client
    .from('product_images')
    .select('id, product_id, url, description, position, products(business_id)')
    .eq('id', id)
    .single()
  if (fetchError) throw mapCatalogError(fetchError)
  const row = current as unknown as ProductImageRow & { products: { business_id: string } }

  const updates: Record<string, unknown> = {}
  if (patch.description !== undefined) updates.description = patch.description

  let uploadedUrl: string | null = null
  if (patch.file) {
    const validationError = validateMediaFile('products', patch.file)
    if (validationError) throw new Error(validationError)
    const uploaded = await uploadMedia('products', row.products.business_id, patch.file)
    uploadedUrl = uploaded.publicUrl
    updates.url = uploaded.publicUrl
  }

  const { data, error } = await client.from('product_images').update(updates).eq('id', id).select('*').single()
  if (error) {
    if (uploadedUrl) await removeMedia(uploadedUrl).catch(() => {})
    throw mapCatalogError(error)
  }
  if (uploadedUrl) await removeMedia(row.url).catch(() => {})
  return mapProductImageRow(data as ProductImageRow)
}

export async function deleteProductImage(id: string): Promise<void> {
  const client = requireClient()
  const { data, error: fetchError } = await client.from('product_images').select('url').eq('id', id).single()
  if (fetchError) throw mapCatalogError(fetchError)

  const { error } = await client.from('product_images').delete().eq('id', id)
  if (error) throw mapCatalogError(error)

  await removeMedia((data as { url: string }).url).catch(() => {})
}

// ---------- videos ----------

export async function listVideos(businessId: string): Promise<Video[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('videos')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
  if (error) throw mapCatalogError(error)
  return (data ?? []).map((row) => mapVideoRow(row as VideoRow))
}

export async function addVideo(businessId: string, productId: string, file: File): Promise<Video> {
  const validationError = validateMediaFile('videos', file)
  if (validationError) throw new Error(validationError)

  const client = requireClient()
  const uploaded = await uploadMedia('videos', businessId, file)
  const { data, error } = await client
    .from('videos')
    .insert({ business_id: businessId, product_id: productId, url: uploaded.publicUrl })
    .select('*')
    .single()
  if (error) {
    await removeMedia(uploaded.publicUrl).catch(() => {})
    throw mapCatalogError(error)
  }
  return mapVideoRow(data as VideoRow)
}

export async function replaceVideo(id: string, file: File): Promise<Video> {
  const client = requireClient()
  const { data: current, error: fetchError } = await client.from('videos').select('*').eq('id', id).single()
  if (fetchError) throw mapCatalogError(fetchError)
  const row = current as VideoRow

  const validationError = validateMediaFile('videos', file)
  if (validationError) throw new Error(validationError)

  const uploaded = await uploadMedia('videos', row.business_id, file)
  const { data, error } = await client.from('videos').update({ url: uploaded.publicUrl }).eq('id', id).select('*').single()
  if (error) {
    await removeMedia(uploaded.publicUrl).catch(() => {})
    throw mapCatalogError(error)
  }
  await removeMedia(row.url).catch(() => {})
  return mapVideoRow(data as VideoRow)
}

export async function deleteVideo(id: string): Promise<void> {
  const client = requireClient()
  const { data, error: fetchError } = await client.from('videos').select('url').eq('id', id).single()
  if (fetchError) throw mapCatalogError(fetchError)

  const { error } = await client.from('videos').delete().eq('id', id)
  if (error) throw mapCatalogError(error)

  await removeMedia((data as { url: string }).url).catch(() => {})
}

// ---------- skills ----------

export async function listSkills(businessId: string): Promise<Skill[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('skills')
    .select('*')
    .eq('business_id', businessId)
    .order('name', { ascending: true })
  if (error) throw mapCatalogError(error)
  return (data ?? []).map((row) => mapSkillRow(row as SkillRow))
}

export async function addSkill(businessId: string, name: string): Promise<Skill> {
  const client = requireClient()
  const { data, error } = await client
    .from('skills')
    .insert({ business_id: businessId, name: name.trim() })
    .select('*')
    .single()
  if (error) throw mapCatalogError(error)
  return mapSkillRow(data as SkillRow)
}

export async function deleteSkill(id: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('skills').delete().eq('id', id)
  if (error) throw mapCatalogError(error)
}

// ---------- logo ----------

export async function setBusinessLogo(businessId: string, file: File): Promise<string> {
  const validationError = validateMediaFile('logos', file)
  if (validationError) throw new Error(validationError)

  const client = requireClient()
  const { data: current, error: fetchError } = await client
    .from('businesses')
    .select('logo_url')
    .eq('id', businessId)
    .single()
  if (fetchError) throw mapCatalogError(fetchError)
  const previousUrl = (current as { logo_url: string | null }).logo_url

  const uploaded = await uploadMedia('logos', businessId, file)
  const { error } = await client.from('businesses').update({ logo_url: uploaded.publicUrl }).eq('id', businessId)
  if (error) {
    await removeMedia(uploaded.publicUrl).catch(() => {})
    throw mapCatalogError(error)
  }
  if (previousUrl) await removeMedia(previousUrl).catch(() => {})
  return uploaded.publicUrl
}

export async function removeBusinessLogo(businessId: string): Promise<void> {
  const client = requireClient()
  const { data: current, error: fetchError } = await client
    .from('businesses')
    .select('logo_url')
    .eq('id', businessId)
    .single()
  if (fetchError) throw mapCatalogError(fetchError)
  const previousUrl = (current as { logo_url: string | null }).logo_url

  const { error } = await client.from('businesses').update({ logo_url: null }).eq('id', businessId)
  if (error) throw mapCatalogError(error)

  if (previousUrl) await removeMedia(previousUrl).catch(() => {})
}
