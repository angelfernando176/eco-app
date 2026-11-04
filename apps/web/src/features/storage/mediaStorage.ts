import { supabase } from '../../lib/supabase'

export type MediaKind = 'logos' | 'products' | 'videos'

const BUCKET = 'eco-media'

const LOGO_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const PRODUCT_IMAGE_MIME_TYPES = ['image/webp', 'image/jpeg', 'image/png', 'image/avif']
const VIDEO_MIME_TYPES = ['video/mp4']

/** Per-kind max file size, in bytes. */
export const MEDIA_SIZE_LIMITS_BYTES = {
  logo: 5 * 1024 * 1024,
  image: 0.3 * 1024 * 1024,
  video: 20 * 1024 * 1024,
} as const

function requireClient() {
  if (!supabase) throw new Error('Supabase no está configurado.')
  return supabase
}

function mapStorageError(error: { message: string }): Error {
  if (/row-level security|permission|policy/i.test(error.message)) {
    return new Error('No tenés permiso para subir este archivo con tu plan actual.')
  }
  return new Error(error.message)
}

function sanitizeExtension(fileName: string): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(fileName)
  const extension = match?.[1]
  if (!extension) return ''
  return extension.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** `<kind>/<businessId>/<uuid>.<ext>`. The extension is derived from the file name. */
export function buildMediaPath(kind: MediaKind, businessId: string, fileName: string): string {
  const ext = sanitizeExtension(fileName)
  const id = crypto.randomUUID()
  return `${kind}/${businessId}/${ext ? `${id}.${ext}` : id}`
}

/** Pure check (no network): mime type + size per kind. Returns a Spanish error, or `null` when valid. */
export function validateMediaFile(kind: MediaKind, file: File): string | null {
  if (kind === 'videos') {
    if (!VIDEO_MIME_TYPES.includes(file.type)) {
      return 'El video debe ser MP4.'
    }
    if (file.size > MEDIA_SIZE_LIMITS_BYTES.video) {
      return `El video no puede superar los ${MEDIA_SIZE_LIMITS_BYTES.video / (1024 * 1024)} MB.`
    }
    return null
  }

  const allowedImageTypes = kind === 'logos' ? LOGO_IMAGE_MIME_TYPES : PRODUCT_IMAGE_MIME_TYPES
  if (!allowedImageTypes.includes(file.type)) {
    return kind === 'logos'
      ? 'La imagen debe ser JPEG, PNG, WebP o GIF.'
      : 'La imagen debe ser WebP, JPEG, PNG o AVIF.'
  }
  const maxSizeBytes = kind === 'logos' ? MEDIA_SIZE_LIMITS_BYTES.logo : MEDIA_SIZE_LIMITS_BYTES.image
  if (file.size > maxSizeBytes) {
    return `La imagen no puede superar los ${maxSizeBytes / (1024 * 1024)} MB.`
  }
  return null
}

export interface UploadedMedia {
  path: string
  publicUrl: string
}

export async function uploadMedia(kind: MediaKind, businessId: string, file: File): Promise<UploadedMedia> {
  const client = requireClient()
  const path = buildMediaPath(kind, businessId, file.name)
  const { error } = await client.storage.from(BUCKET).upload(path, file, { contentType: file.type })
  if (error) throw mapStorageError(error)
  const { data } = client.storage.from(BUCKET).getPublicUrl(path)
  return { path, publicUrl: data.publicUrl }
}

/** Derives the object path from a public URL (or returns the input unchanged if it already is a path). */
export function derivePathFromPublicUrl(publicUrlOrPath: string): string {
  const marker = `/object/public/${BUCKET}/`
  const index = publicUrlOrPath.indexOf(marker)
  if (index === -1) return publicUrlOrPath
  return decodeURIComponent(publicUrlOrPath.slice(index + marker.length))
}

export async function removeMedia(publicUrlOrPath: string): Promise<void> {
  const client = requireClient()
  const path = derivePathFromPublicUrl(publicUrlOrPath)
  const { error } = await client.storage.from(BUCKET).remove([path])
  if (error) throw mapStorageError(error)
}
