// POST { ownerId, businessId, kind, productId?, description?, fileBase64, mimeType } — upload a
// photo or video for a mobile-owned business, only with an active subscription.
// DELETE { ownerId, kind, mediaId } — remove one.
//
// Called by the mobile app without an Auth JWT (the mobile owner has no Supabase Auth account),
// so ownership is validated server-side with the service-role client by matching `ownerId`
// against `eco.businesses.owner_id`, never trusted from the client beyond that lookup.

import { handleCorsPreflight } from '../_shared/cors.ts'
import { adminClient } from '../_shared/auth.ts'
import { json, HttpError, errorResponse } from '../_shared/http.ts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Must match the `eco-media` bucket's `allowed_mime_types` in 0004_catalog_limits_storage.sql.
const ALLOWED_MIME_TYPES: Record<'photo' | 'video', readonly string[]> = {
  photo: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
}

// Must match the `eco-media` bucket's `file_size_limit` in 0004_catalog_limits_storage.sql.
const MAX_FILE_SIZE = 52428800

const PUBLIC_URL_MARKER = '/object/public/eco-media/'

interface UploadInput {
  ownerId: string
  businessId: string
  kind: 'photo' | 'video'
  productId: string
  description: string
  fileBase64: string
  mimeType: string
}

interface DeleteInput {
  ownerId: string
  kind: 'photo' | 'video'
  mediaId: string
}

function parseUuid(value: unknown, message: string): string {
  if (typeof value !== 'string' || !UUID_RE.test(value)) throw new HttpError(400, message)
  return value
}

function parseKind(value: unknown): 'photo' | 'video' {
  if (value !== 'photo' && value !== 'video') throw new HttpError(400, 'El tipo de contenido debe ser "photo" o "video".')
  return value
}

function parseUploadInput(body: unknown): UploadInput {
  if (typeof body !== 'object' || body === null) throw new HttpError(400, 'Cuerpo de la solicitud inválido.')
  const { ownerId, businessId, kind, productId, description, fileBase64, mimeType } = body as Record<string, unknown>

  const parsedKind = parseKind(kind)
  const parsedOwnerId = parseUuid(ownerId, 'El identificador del dueño no es válido.')
  const parsedBusinessId = parseUuid(businessId, 'El identificador del negocio no es válido.')
  const parsedProductId = parseUuid(productId, 'Producto inválido.')

  if (typeof fileBase64 !== 'string' || fileBase64.length === 0) {
    throw new HttpError(400, 'El archivo es obligatorio.')
  }

  if (typeof mimeType !== 'string' || !ALLOWED_MIME_TYPES[parsedKind].includes(mimeType)) {
    throw new HttpError(400, 'El tipo de archivo no corresponde al contenido seleccionado.')
  }

  const parsedDescription = typeof description === 'string' ? description.trim().slice(0, 500) : ''

  return {
    ownerId: parsedOwnerId,
    businessId: parsedBusinessId,
    kind: parsedKind,
    productId: parsedProductId,
    description: parsedDescription,
    fileBase64,
    mimeType,
  }
}

function parseDeleteInput(body: unknown): DeleteInput {
  if (typeof body !== 'object' || body === null) throw new HttpError(400, 'Cuerpo de la solicitud inválido.')
  const { ownerId, kind, mediaId } = body as Record<string, unknown>

  return {
    ownerId: parseUuid(ownerId, 'El identificador del dueño no es válido.'),
    kind: parseKind(kind),
    mediaId: parseUuid(mediaId, 'El identificador del contenido no es válido.'),
  }
}

function decodeBase64(data: string): Uint8Array {
  let binary: string
  try {
    binary = atob(data)
  } catch {
    throw new HttpError(400, 'El archivo no es válido.')
  }
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function extractStoragePath(url: string): string | null {
  const index = url.indexOf(PUBLIC_URL_MARKER)
  if (index === -1) return null
  return url.slice(index + PUBLIC_URL_MARKER.length)
}

/** Maps a Postgres trigger exception (enforce_product_images_limit/enforce_videos_limit, 0004) to a friendly message. */
function mapInsertError(error: unknown): HttpError {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('product image limit exceeded')) {
    return new HttpError(409, 'Este producto ya alcanzó el máximo de 7 fotos.')
  }
  if (message.includes('video limit exceeded')) {
    return new HttpError(409, 'Este negocio ya alcanzó el máximo de 2 videos.')
  }
  return new HttpError(409, 'No se pudo guardar el archivo.')
}

async function handleUpload(req: Request): Promise<Response> {
  const input = parseUploadInput(await req.json().catch(() => null))
  const client = adminClient()

  const { data: business, error: businessError } = await client
    .from('businesses')
    .select('owner_id, status')
    .eq('id', input.businessId)
    .single()
  if (businessError || !business || business.owner_id !== input.ownerId) {
    throw new HttpError(403, 'No sos el dueño de este negocio.')
  }
  if (business.status !== 'active') throw new HttpError(409, 'El negocio está dado de baja.')

  const { data: subscription, error: subscriptionError } = await client
    .from('subscriptions')
    .select('id')
    .eq('user_id', input.ownerId)
    .eq('status', 'active')
    .maybeSingle()
  if (subscriptionError) throw new HttpError(500, 'No se pudo verificar la suscripción.')
  if (!subscription) throw new HttpError(403, 'Se requiere una suscripción activa para gestionar fotos y videos.')

  const { data: product, error: productError } = await client
    .from('products')
    .select('business_id')
    .eq('id', input.productId)
    .single()
  if (productError || !product || product.business_id !== input.businessId) {
    throw new HttpError(400, 'Producto inválido.')
  }

  const bytes = decodeBase64(input.fileBase64)
  if (bytes.length === 0) throw new HttpError(400, 'El archivo está vacío.')
  if (bytes.length > MAX_FILE_SIZE) throw new HttpError(400, 'El archivo supera el tamaño máximo permitido (50MB).')

  const folder = input.kind === 'photo' ? 'products' : 'videos'
  const path = `${folder}/${input.businessId}/${crypto.randomUUID()}.${EXT_BY_MIME[input.mimeType]}`

  const { error: uploadError } = await client.storage.from('eco-media').upload(path, bytes, { contentType: input.mimeType })
  if (uploadError) throw new HttpError(500, 'No se pudo subir el archivo.')

  const publicUrl = client.storage.from('eco-media').getPublicUrl(path).data.publicUrl

  try {
    if (input.kind === 'photo') {
      const { count, error: countError } = await client
        .from('product_images')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', input.productId)
      if (countError) throw countError

      const { data: row, error: insertError } = await client
        .from('product_images')
        .insert({ product_id: input.productId, url: publicUrl, description: input.description, position: count ?? 0 })
        .select('id')
        .single()
      if (insertError) throw insertError

      return json(200, { id: row.id, url: publicUrl })
    }

    const { data: row, error: insertError } = await client
      .from('videos')
      .insert({ business_id: input.businessId, product_id: input.productId, url: publicUrl })
      .select('id')
      .single()
    if (insertError) throw insertError

    return json(200, { id: row.id, url: publicUrl })
  } catch (insertError) {
    const { error: removeError } = await client.storage.from('eco-media').remove([path])
    if (removeError) console.error('No se pudo eliminar el archivo huérfano de Storage:', removeError)
    throw mapInsertError(insertError)
  }
}

async function handleDelete(req: Request): Promise<Response> {
  const input = parseDeleteInput(await req.json().catch(() => null))
  const client = adminClient()

  let url: string
  let ownerId: string | null

  if (input.kind === 'photo') {
    const { data: image, error: imageError } = await client
      .from('product_images')
      .select('url, products(business_id, businesses(owner_id))')
      .eq('id', input.mediaId)
      .single()
    if (imageError || !image) throw new HttpError(403, 'No sos el dueño de este contenido.')
    url = image.url as string
    const product = image.products as unknown as { businesses: { owner_id: string } | null } | null
    ownerId = product?.businesses?.owner_id ?? null
  } else {
    const { data: video, error: videoError } = await client
      .from('videos')
      .select('url, businesses(owner_id)')
      .eq('id', input.mediaId)
      .single()
    if (videoError || !video) throw new HttpError(403, 'No sos el dueño de este contenido.')
    url = video.url as string
    const business = video.businesses as unknown as { owner_id: string } | null
    ownerId = business?.owner_id ?? null
  }

  if (!ownerId || ownerId !== input.ownerId) throw new HttpError(403, 'No sos el dueño de este contenido.')

  const path = extractStoragePath(url)
  if (path) {
    const { error: removeError } = await client.storage.from('eco-media').remove([path])
    if (removeError) console.error('No se pudo eliminar el archivo de Storage:', removeError)
  }

  const table = input.kind === 'photo' ? 'product_images' : 'videos'
  const { error: deleteError } = await client.from(table).delete().eq('id', input.mediaId)
  if (deleteError) throw new HttpError(500, 'No se pudo eliminar el registro.')

  return json(200, { deleted: true })
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  try {
    if (req.method === 'POST') return await handleUpload(req)
    if (req.method === 'DELETE') return await handleDelete(req)
    throw new HttpError(405, 'Método no permitido.')
  } catch (error) {
    return errorResponse(error)
  }
})
