import { supabase } from '../lib/supabase'
import { mapReadErrorToSpanish, mapUploadErrorToSpanish } from './mobileContentLogic'

const NOT_CONFIGURED_MESSAGE = 'La app no está configurada para conectarse a Supabase.'

export interface CatalogSkill {
  id: string
  name: string
}

export async function fetchSkills(businessId: string): Promise<CatalogSkill[]> {
  if (!supabase) throw new Error(NOT_CONFIGURED_MESSAGE)

  const { data, error } = await supabase.from('skills').select('id, name').eq('business_id', businessId)

  if (error) throw mapReadErrorToSpanish('No se pudieron cargar los skills', error)
  return (data ?? []) as CatalogSkill[]
}

export interface AddSkillInput {
  businessId: string
  ownerId: string
  name: string
}

export async function addSkill(args: AddSkillInput): Promise<string> {
  if (!supabase) throw new Error(NOT_CONFIGURED_MESSAGE)

  const { data, error } = await supabase.rpc('add_mobile_skill', {
    p_business_id: args.businessId,
    p_owner_id: args.ownerId,
    p_name: args.name,
  })

  if (error) throw new Error(mapUploadErrorToSpanish(error))
  return data as string
}

export interface RemoveSkillInput {
  skillId: string
  ownerId: string
}

export async function removeSkill(args: RemoveSkillInput): Promise<void> {
  if (!supabase) throw new Error(NOT_CONFIGURED_MESSAGE)

  const { error } = await supabase.rpc('delete_mobile_skill', {
    p_skill_id: args.skillId,
    p_owner_id: args.ownerId,
  })

  if (error) throw new Error(mapUploadErrorToSpanish(error))
}

export interface CatalogProduct {
  id: string
  name: string
}

export async function fetchProducts(businessId: string): Promise<CatalogProduct[]> {
  if (!supabase) throw new Error(NOT_CONFIGURED_MESSAGE)

  const { data, error } = await supabase
    .from('products')
    .select('id, name')
    .eq('business_id', businessId)
    .order('created_at')

  if (error) throw mapReadErrorToSpanish('No se pudieron cargar los productos', error)
  return (data ?? []) as CatalogProduct[]
}

export interface AddProductInput {
  businessId: string
  ownerId: string
  name: string
}

export async function addProduct(args: AddProductInput): Promise<string> {
  if (!supabase) throw new Error(NOT_CONFIGURED_MESSAGE)

  const { data, error } = await supabase.rpc('add_mobile_product', {
    p_business_id: args.businessId,
    p_owner_id: args.ownerId,
    p_name: args.name,
  })

  if (error) throw new Error(mapUploadErrorToSpanish(error))
  return data as string
}

export interface RemoveProductInput {
  productId: string
  ownerId: string
}

export async function removeProduct(args: RemoveProductInput): Promise<void> {
  if (!supabase) throw new Error(NOT_CONFIGURED_MESSAGE)

  const { error } = await supabase.rpc('delete_mobile_product', {
    p_product_id: args.productId,
    p_owner_id: args.ownerId,
  })

  if (error) throw new Error(mapUploadErrorToSpanish(error))
}

export interface CatalogVideo {
  id: string
  url: string
}

export async function fetchVideosReadOnly(businessId: string): Promise<CatalogVideo[]> {
  if (!supabase) throw new Error(NOT_CONFIGURED_MESSAGE)

  const { data, error } = await supabase
    .from('videos')
    .select('id, url')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (error) throw mapReadErrorToSpanish('No se pudieron cargar los videos', error)
  return (data ?? []) as CatalogVideo[]
}
