// POST { userId } — admin only. Recipient, name and activation date come only from the
// database; the caller cannot supply any email content, so this is not an open mailer.

import { handleCorsPreflight } from '../_shared/cors.ts'
import { requireAdmin, adminClient } from '../_shared/auth.ts'
import { json, HttpError, errorResponse } from '../_shared/http.ts'
import { sendEmail } from '../_shared/email.ts'
import { subscriptionActivatedTemplate } from '../_shared/templates.ts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function parseUserId(body: unknown): string {
  if (typeof body !== 'object' || body === null) throw new HttpError(400, 'Cuerpo de la solicitud inválido.')
  const { userId } = body as Record<string, unknown>
  if (typeof userId !== 'string' || !UUID_RE.test(userId)) throw new HttpError(400, 'El identificador de usuario no es válido.')
  return userId
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Método no permitido.')

    await requireAdmin(req)
    const userId = parseUserId(await req.json().catch(() => null))
    const client = adminClient()

    const { data: user, error: userError } = await client
      .from('users')
      .select('first_name, email')
      .eq('id', userId)
      .single()
    if (userError || !user) throw new HttpError(404, 'No se encontró el usuario.')

    const { data: subscription, error: subscriptionError } = await client
      .from('subscriptions')
      .select('status, activated_at')
      .eq('user_id', userId)
      .single()
    if (subscriptionError || !subscription) throw new HttpError(404, 'No se encontró la suscripción del usuario.')

    if (subscription.status !== 'active') throw new HttpError(409, 'La suscripción no está activa.')
    if (!subscription.activated_at) throw new HttpError(409, 'La suscripción no tiene fecha de activación.')

    const siteUrl = Deno.env.get('SITE_URL') ?? ''
    const template = subscriptionActivatedTemplate({
      firstName: user.first_name,
      activatedAt: new Date(subscription.activated_at),
      siteUrl,
    })

    const sendResult = await sendEmail({ to: user.email, subject: template.subject, html: template.html, text: template.text })

    if (!sendResult.ok) return json(200, { sent: false, error: sendResult.error })
    return json(200, { sent: true })
  } catch (error) {
    return errorResponse(error)
  }
})
