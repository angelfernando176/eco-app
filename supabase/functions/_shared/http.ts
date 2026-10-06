// Small HTTP helpers shared by all ECO edge functions.

import { corsHeaders } from './cors.ts'

export class HttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** Maps a caught error to an HTTP response, defaulting to 500 for unexpected failures. */
export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) return json(error.status, { error: error.message })
  console.error('Unexpected error:', error)
  return json(500, { error: 'Error interno del servidor.' })
}
