// POST { email, firstName, lastName, ageRange } — admin only.
// Creates a Supabase Auth user via `generateLink({ type: 'invite' })` (no Supabase email is
// sent); the `handle_new_user` trigger in 0002_auth.sql creates the matching eco.users profile
// (type=1). The invitation email is then sent by this function through Resend.

import { handleCorsPreflight } from '../_shared/cors.ts'
import { requireAdmin, adminClient } from '../_shared/auth.ts'
import { json, HttpError, errorResponse } from '../_shared/http.ts'
import { sendEmail } from '../_shared/email.ts'
import { accountInvitationTemplate } from '../_shared/templates.ts'

// Must match apps/web/src/features/users/ageRanges.ts (AGE_RANGES).
const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'] as const

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_EMAIL_LENGTH = 254

interface CreateUserInput {
  email: string
  firstName: string
  lastName: string
  ageRange: string
}

function parseInput(body: unknown): CreateUserInput {
  if (typeof body !== 'object' || body === null) throw new HttpError(400, 'Cuerpo de la solicitud inválido.')
  const { email, firstName, lastName, ageRange } = body as Record<string, unknown>

  if (typeof email !== 'string' || email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
    throw new HttpError(400, 'El correo electrónico no es válido.')
  }

  const trimmedFirstName = typeof firstName === 'string' ? firstName.trim() : ''
  if (trimmedFirstName.length < 2 || trimmedFirstName.length > 50) {
    throw new HttpError(400, 'El nombre debe tener entre 2 y 50 caracteres.')
  }

  const trimmedLastName = typeof lastName === 'string' ? lastName.trim() : ''
  if (trimmedLastName.length < 2 || trimmedLastName.length > 50) {
    throw new HttpError(400, 'El apellido debe tener entre 2 y 50 caracteres.')
  }

  if (typeof ageRange !== 'string' || !AGE_RANGES.includes(ageRange as (typeof AGE_RANGES)[number])) {
    throw new HttpError(400, 'El rango de edad no es válido.')
  }

  return { email, firstName: trimmedFirstName, lastName: trimmedLastName, ageRange }
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Método no permitido.')

    await requireAdmin(req)
    const input = parseInput(await req.json().catch(() => null))
    const client = adminClient()
    const siteUrl = Deno.env.get('SITE_URL') ?? ''

    const { data, error } = await client.auth.admin.generateLink({
      type: 'invite',
      email: input.email,
      options: {
        data: { first_name: input.firstName, last_name: input.lastName, age_range: input.ageRange },
        redirectTo: siteUrl,
      },
    })

    if (error) {
      const message = error.message.toLowerCase()
      if (message.includes('already') || message.includes('registered') || message.includes('exists')) {
        throw new HttpError(409, 'Ya existe una cuenta con ese correo electrónico.')
      }
      throw new HttpError(500, 'No se pudo crear la cuenta de usuario.')
    }

    const authUserId = data.user?.id
    if (!authUserId) throw new HttpError(500, 'No se pudo crear la cuenta de usuario.')

    const { data: profile, error: profileError } = await client
      .from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single()

    if (profileError || !profile) throw new HttpError(500, 'La cuenta se creó pero no se encontró el perfil.')

    const actionLink = data.properties?.action_link
    if (!actionLink) {
      return json(200, { created: true, userId: profile.id, emailSent: false, emailError: 'No se generó el enlace de invitación.' })
    }

    const template = accountInvitationTemplate({ firstName: input.firstName, actionLink })
    const sendResult = await sendEmail({ to: input.email, subject: template.subject, html: template.html, text: template.text })

    if (!sendResult.ok) {
      return json(200, { created: true, userId: profile.id, emailSent: false, emailError: sendResult.error })
    }

    return json(200, { created: true, userId: profile.id, emailSent: true })
  } catch (error) {
    return errorResponse(error)
  }
})
