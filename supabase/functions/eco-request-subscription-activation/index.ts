// POST { businessId } — called by the anonymous mobile app (no requireAdmin: any device can
// request activation for a business it can see). Sends a notification email to the fixed
// address administracion@exxasoft.com with the business/owner data; the caller cannot pick the
// recipient, so this is not an open mailer.

import { handleCorsPreflight } from '../_shared/cors.ts'
import { adminClient } from '../_shared/auth.ts'
import { json, HttpError, errorResponse } from '../_shared/http.ts'
import { sendEmail } from '../_shared/email.ts'
import { subscriptionActivationRequestTemplate } from '../_shared/templates.ts'

const ADMIN_EMAIL = 'administracion@exxasoft.com'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function parseBusinessId(body: unknown): string {
  if (typeof body !== 'object' || body === null) throw new HttpError(400, 'Cuerpo de la solicitud inválido.')
  const { businessId } = body as Record<string, unknown>
  if (typeof businessId !== 'string' || !UUID_RE.test(businessId)) throw new HttpError(400, 'El identificador del negocio no es válido.')
  return businessId
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Método no permitido.')

    const businessId = parseBusinessId(await req.json().catch(() => null))
    const client = adminClient()

    const { data: business, error: businessError } = await client
      .from('businesses')
      .select('trade_name, owner_id')
      .eq('id', businessId)
      .single()
    if (businessError || !business) throw new HttpError(404, 'No se encontró el negocio.')

    const { data: owner, error: ownerError } = await client
      .from('users')
      .select('first_name, email')
      .eq('id', business.owner_id)
      .single()
    if (ownerError || !owner) throw new HttpError(404, 'No se encontró el usuario.')

    const template = subscriptionActivationRequestTemplate({
      ownerFirstName: owner.first_name,
      ownerEmail: owner.email,
      businessTradeName: business.trade_name,
    })

    const sendResult = await sendEmail({ to: ADMIN_EMAIL, subject: template.subject, html: template.html, text: template.text })

    if (!sendResult.ok) return json(502, { ok: false, error: sendResult.error })
    return json(200, { ok: true })
  } catch (error) {
    return errorResponse(error)
  }
})
