/**
 * Dependency-free photo/video/skill management logic (mime inference, skill
 * name validation, upload error mapping) so it can be sanity-checked outside
 * of Expo/React Native. Mirrors mobileBusinessLogic.ts.
 */

export { mapSyncErrorToSpanish } from './syncLogic'

// Must match ALLOWED_MIME_TYPES/EXT_BY_MIME in supabase/functions/eco-mobile-media-upload/index.ts.
const EXT_TO_MIME_BY_KIND: Record<'photo' | 'video', Record<string, string>> = {
  photo: {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
  },
  video: {
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
  },
}

/** Derives the MIME type from a file's extension when the picker result doesn't expose one reliably. */
export function inferMimeType(uriOrFileName: string, kind: 'photo' | 'video'): string | null {
  const match = /\.([a-zA-Z0-9]+)(?:\?.*)?$/.exec(uriOrFileName)
  if (!match) return null
  const ext = match[1].toLowerCase()
  return EXT_TO_MIME_BY_KIND[kind][ext] ?? null
}

/** Mirrors the exact rule enforced server-side in eco.add_mobile_skill (0006). */
export function validateSkillName(name: string): string | null {
  const trimmed = name.trim()
  if (trimmed.length < 1 || trimmed.length > 50) {
    return 'El nombre del skill debe tener entre 1 y 50 caracteres.'
  }
  return null
}

/**
 * Maps an already-extracted error message (edge function `{ error }` body, RPC
 * error, or raw Error) to Spanish. Pure/sync: the caller is responsible for
 * extracting the response body from a FunctionsHttpError before calling this.
 */
export function mapUploadErrorToSpanish(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)

  if (message.includes('skill limit exceeded')) {
    return 'Ya alcanzaste el máximo de skills para tu plan.'
  }

  if (/network|fetch|timeout/i.test(message)) {
    return 'Sin conexión a internet. Intentá nuevamente.'
  }

  // The edge function/RPC already returns its own Spanish message; surface it verbatim.
  return message
}
