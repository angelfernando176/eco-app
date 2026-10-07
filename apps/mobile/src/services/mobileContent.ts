import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { mapUploadErrorToSpanish } from './mobileContentLogic'

const NOT_CONFIGURED_MESSAGE = 'La app no está configurada para conectarse a Supabase.'

/** Extracts the edge function's own `{ error }` JSON message, if present. */
async function extractEdgeFunctionError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: string }
      if (body?.error) return body.error
    } catch {
      // Body wasn't JSON; fall through to the generic error.
    }
  }
  return error instanceof Error ? error.message : String(error)
}

export async function fetchMainProductId(businessRemoteId: string): Promise<string | null> {
  if (!supabase) throw new Error(NOT_CONFIGURED_MESSAGE)

  const { data, error } = await supabase
    .from('products')
    .select('id')
    .eq('business_id', businessRemoteId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`No se pudo buscar el producto principal: ${error.message}`)
  return data?.id ?? null
}

export interface MobilePhoto {
  id: string
  url: string
  description: string
}

export async function fetchPhotos(productId: string): Promise<MobilePhoto[]> {
  if (!supabase) throw new Error(NOT_CONFIGURED_MESSAGE)

  const { data, error } = await supabase
    .from('product_images')
    .select('id, url, description')
    .eq('product_id', productId)
    .order('position', { ascending: true })

  if (error) throw new Error(`No se pudieron cargar las fotos: ${error.message}`)
  return (data ?? []).map((row) => ({ id: row.id, url: row.url, description: row.description ?? '' }))
}

export interface MobileVideo {
  id: string
  url: string
}

export async function fetchVideos(businessId: string): Promise<MobileVideo[]> {
  if (!supabase) throw new Error(NOT_CONFIGURED_MESSAGE)

  const { data, error } = await supabase
    .from('videos')
    .select('id, url')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`No se pudieron cargar los videos: ${error.message}`)
  return (data ?? []).map((row) => ({ id: row.id, url: row.url }))
}

export interface MobileSkill {
  id: string
  name: string
}

export async function fetchSkills(businessId: string): Promise<MobileSkill[]> {
  if (!supabase) throw new Error(NOT_CONFIGURED_MESSAGE)

  const { data, error } = await supabase.from('skills').select('id, name').eq('business_id', businessId)

  if (error) throw new Error(`No se pudieron cargar los skills: ${error.message}`)
  return (data ?? []) as MobileSkill[]
}

export interface UploadMediaInput {
  ownerId: string
  businessId: string
  productId: string
  kind: 'photo' | 'video'
  description: string
  fileBase64: string
  mimeType: string
}

export interface UploadMediaResult {
  id: string
  url: string
}

export async function uploadMedia(args: UploadMediaInput): Promise<UploadMediaResult> {
  if (!supabase) throw new Error(NOT_CONFIGURED_MESSAGE)

  const { data, error } = await supabase.functions.invoke('eco-mobile-media-upload', {
    method: 'POST',
    body: {
      ownerId: args.ownerId,
      businessId: args.businessId,
      kind: args.kind,
      productId: args.productId,
      description: args.description,
      fileBase64: args.fileBase64,
      mimeType: args.mimeType,
    },
  })

  if (error) {
    const extracted = await extractEdgeFunctionError(error)
    throw new Error(mapUploadErrorToSpanish(new Error(extracted)))
  }

  return data as UploadMediaResult
}

export interface DeleteMediaInput {
  ownerId: string
  kind: 'photo' | 'video'
  mediaId: string
}

export async function deleteMedia(args: DeleteMediaInput): Promise<void> {
  if (!supabase) throw new Error(NOT_CONFIGURED_MESSAGE)

  const { error } = await supabase.functions.invoke('eco-mobile-media-upload', {
    method: 'DELETE',
    body: { ownerId: args.ownerId, kind: args.kind, mediaId: args.mediaId },
  })

  if (error) {
    const extracted = await extractEdgeFunctionError(error)
    throw new Error(mapUploadErrorToSpanish(new Error(extracted)))
  }
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
