// CORS headers shared by all ECO edge functions, plus an OPTIONS preflight helper.

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? '*'

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Returns the preflight response for an OPTIONS request, or null if the request is not OPTIONS. */
export function handleCorsPreflight(req: Request): Response | null {
  if (req.method !== 'OPTIONS') return null
  return new Response('ok', { headers: corsHeaders })
}
