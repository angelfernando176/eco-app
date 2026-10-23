// Pure email template builders. No side effects, no I/O: easy to unit-test in isolation.
// Every interpolated value is HTML-escaped before being placed in markup.

import { escapeHtml } from './email.ts'

const BRAND_COLOR = '#059669'

interface EmailContent {
  subject: string
  html: string
  text: string
}

function layout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f5f4; font-family:Arial, Helvetica, sans-serif; color:#1f2937;">
    <div style="max-width:480px; margin:0 auto; padding:32px 24px;">
      <h1 style="color:${BRAND_COLOR}; font-size:22px; margin:0 0 16px;">ECO</h1>
      <div style="background-color:#ffffff; border-radius:8px; padding:24px; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        ${bodyHtml}
      </div>
      <p style="font-size:12px; color:#6b7280; margin-top:24px;">Este es un mensaje automático de ECO, no respondas a este correo.</p>
    </div>
  </body>
</html>`
}

function button(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block; background-color:${BRAND_COLOR}; color:#ffffff; text-decoration:none; padding:12px 24px; border-radius:6px; font-weight:bold; margin-top:16px;">${escapeHtml(label)}</a>`
}

export function accountInvitationTemplate(params: { firstName: string; actionLink: string }): EmailContent {
  const { firstName, actionLink } = params
  const name = escapeHtml(firstName)
  const subject = 'Activá tu cuenta en ECO'
  const html = layout(
    subject,
    `
      <p style="font-size:16px; margin:0 0 12px;">Hola ${name},</p>
      <p style="font-size:14px; line-height:1.5; margin:0 0 12px;">
        Un administrador creó tu cuenta en ECO. Hacé clic en el siguiente enlace para activarla y
        definí tu contraseña:
      </p>
      ${button(actionLink, 'Activar mi cuenta')}
      <p style="font-size:12px; color:#6b7280; margin-top:16px;">
        Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br />
        <span style="word-break:break-all;">${escapeHtml(actionLink)}</span>
      </p>
    `,
  )
  const text = `Hola ${firstName},\n\nUn administrador creó tu cuenta en ECO. Abrí el siguiente enlace para activarla y definí tu contraseña:\n${actionLink}\n\nSi no esperabas este correo, podés ignorarlo.`
  return { subject, html, text }
}

export function subscriptionActivatedTemplate(params: { firstName: string; activatedAt: Date; siteUrl: string }): EmailContent {
  const { firstName, activatedAt, siteUrl } = params
  const name = escapeHtml(firstName)
  const formattedDate = new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Guayaquil',
  }).format(activatedAt)
  const subject = 'Tu suscripción de ECO fue activada'
  const html = layout(
    subject,
    `
      <p style="font-size:16px; margin:0 0 12px;">Hola ${name},</p>
      <p style="font-size:14px; line-height:1.5; margin:0 0 12px;">
        Tu suscripción en ECO fue activada el <strong>${escapeHtml(formattedDate)}</strong>. Ya podés
        disfrutar de los beneficios de tu plan.
      </p>
      ${button(siteUrl, 'Ir a ECO')}
    `,
  )
  const text = `Hola ${firstName},\n\nTu suscripción en ECO fue activada el ${formattedDate}. Ya podés disfrutar de los beneficios de tu plan.\n\n${siteUrl}`
  return { subject, html, text }
}

export function subscriptionActivationRequestTemplate(params: { ownerFirstName: string; ownerEmail: string; businessTradeName: string }): EmailContent {
  const { ownerFirstName, ownerEmail, businessTradeName } = params
  const name = escapeHtml(ownerFirstName)
  const email = escapeHtml(ownerEmail)
  const businessName = escapeHtml(businessTradeName)
  const subject = 'Solicitud de activación de suscripción — ECO'
  const html = layout(
    subject,
    `
      <p style="font-size:16px; margin:0 0 12px;">Hola,</p>
      <p style="font-size:14px; line-height:1.5; margin:0 0 12px;">
        <strong>${name}</strong> (correo: <strong>${email}</strong>) solicitó activar la suscripción
        del negocio <strong>${businessName}</strong>. El equipo de administración puede dar
        seguimiento a esta solicitud.
      </p>
    `,
  )
  const text = `Hola,\n\n${ownerFirstName} (correo: ${ownerEmail}) solicitó activar la suscripción del negocio ${businessTradeName}. El equipo de administración puede dar seguimiento a esta solicitud.`
  return { subject, html, text }
}
