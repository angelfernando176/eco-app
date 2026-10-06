// Email sending with a swappable provider, selected by the EMAIL_PROVIDER secret:
//   - 'smtp'   : any SMTP server (Gmail with an app password, Google Workspace, Microsoft 365...)
//   - 'resend' : Resend REST API (default when EMAIL_PROVIDER is not set)
// Never throws on provider failure: callers get `{ ok: false, error }` so the caller can decide
// how to report it (the account/action that triggered the email already succeeded and must not
// be rolled back because mail failed).

import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const RESEND_API_URL = 'https://api.resend.com/emails'

export interface SendEmailInput {
  to: string
  subject: string
  html: string
  text: string
}

export type SendEmailResult = { ok: true } | { ok: false; error: string }

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const provider = (Deno.env.get('EMAIL_PROVIDER') ?? 'resend').toLowerCase()
  if (provider === 'smtp') return sendViaSmtp(input)
  if (provider === 'resend') return sendViaResend(input)
  return { ok: false, error: `EMAIL_PROVIDER no es válido ("${provider}"). Usá "smtp" o "resend".` }
}

/**
 * SMTP delivery. Secrets: SMTP_HOST, SMTP_PORT (default 465), SMTP_USER, SMTP_PASS, MAIL_FROM.
 * Port 465 uses implicit TLS; any other port (e.g. 587) starts plain and upgrades via STARTTLS.
 * Edge Functions block outbound port 25, so use 465 or 587.
 */
async function sendViaSmtp(input: SendEmailInput): Promise<SendEmailResult> {
  const hostname = Deno.env.get('SMTP_HOST')
  const username = Deno.env.get('SMTP_USER')
  const password = Deno.env.get('SMTP_PASS')
  const from = Deno.env.get('MAIL_FROM')
  const port = Number(Deno.env.get('SMTP_PORT') ?? '465')

  if (!hostname) return { ok: false, error: 'Falta configurar SMTP_HOST en el servidor.' }
  if (!username) return { ok: false, error: 'Falta configurar SMTP_USER en el servidor.' }
  if (!password) return { ok: false, error: 'Falta configurar SMTP_PASS en el servidor.' }
  if (!from) return { ok: false, error: 'Falta configurar MAIL_FROM en el servidor.' }
  if (!Number.isInteger(port) || port <= 0) return { ok: false, error: 'SMTP_PORT no es válido.' }

  const client = new SMTPClient({
    connection: { hostname, port, tls: port === 465, auth: { username, password } },
  })

  try {
    await client.send({ from, to: input.to, subject: input.subject, content: input.text, html: input.html })
    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, error: `No se pudo enviar el correo por SMTP: ${message}` }
  } finally {
    await client.close().catch(() => {})
  }
}

async function sendViaResend(input: SendEmailInput): Promise<SendEmailResult> {
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
