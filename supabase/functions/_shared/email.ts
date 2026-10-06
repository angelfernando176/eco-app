// Resend-backed email sending. Never throws on provider failure: callers get
// `{ ok: false, error }` so the caller can decide how to report it (the account/action that
// triggered the email already succeeded and must not be rolled back because mail failed).

const RESEND_API_URL = 'https://api.resend.com/emails'

export interface SendEmailInput {
  to: string
  subject: string
  html: string
  text: string
}

export type SendEmailResult = { ok: true } | { ok: false; error: string }

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('MAIL_FROM')

  if (!apiKey) return { ok: false, error: 'Falta configurar RESEND_API_KEY en el servidor.' }
  if (!from) return { ok: false, error: 'Falta configurar MAIL_FROM en el servidor.' }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      return { ok: false, error: `El proveedor de correo rechazó el envío (${response.status}). ${body}`.trim() }
    }

    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, error: `No se pudo contactar al proveedor de correo: ${message}` }
  }
}

/** Escapes HTML-sensitive characters so interpolated values can never break out of markup. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
