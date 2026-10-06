# Edge Functions de ECO

Funciones serverless (Deno, TypeScript) para las dos operaciones que requieren la
service role de Supabase y no pueden ejecutarse desde el navegador: crear cuentas
de usuario web/escritorio y enviar el correo de activación de suscripción.

> **No usar el nombre `smart-api`.** Esa función pertenece a **LINGO**, otro
> proyecto que comparte el mismo proyecto de Supabase. No se reutiliza, no se
> pisa, no se despliega nada con ese nombre desde este repositorio.

## `_shared/`

Helpers comunes, importados con rutas relativas (no se despliegan como función):

- `cors.ts` — encabezados CORS y manejo de `OPTIONS`.
- `auth.ts` — `requireAdmin(req)` (valida el JWT y el claim `app_metadata.role = 'admin'`)
  y `adminClient()` (cliente con la service role, esquema `eco`).
- `http.ts` — `json(status, body)`, `HttpError`, `errorResponse(error)`.
- `email.ts` — `sendEmail({ to, subject, html, text })` vía SMTP o Resend (según `EMAIL_PROVIDER`); nunca lanza, devuelve
  `{ ok: true } | { ok: false, error }`. También expone `escapeHtml`.
- `templates.ts` — plantillas puras (`accountInvitationTemplate`, `subscriptionActivatedTemplate`)
  con branding ECO (verde `#059669`), HTML responsive simple y texto plano.

## `eco-admin-create-user`

Crea una cuenta de Auth (web/escritorio, `type = 1`) y envía el correo de invitación.
El perfil en `eco.users` lo crea el trigger `handle_new_user` (`0002_auth.sql`).

**Request** (requiere `Authorization: Bearer <JWT de un administrador>`):

```json
POST /functions/v1/eco-admin-create-user
{
  "email": "persona@ejemplo.com",
  "firstName": "Ana",
  "lastName": "Pérez",
  "ageRange": "25-34"
}
```

`ageRange` debe ser uno de: `18-24`, `25-34`, `35-44`, `45-54`, `55-64`, `65+`
(debe coincidir con `apps/web/src/features/users/ageRanges.ts`).

**Response** (200 incluso si falla el envío del correo; la cuenta ya existe):

```json
{ "created": true, "userId": "<uuid en eco.users>", "emailSent": true }
```

```json
{ "created": true, "userId": "<uuid en eco.users>", "emailSent": false, "emailError": "..." }
```

Errores: `401` sin sesión válida, `403` sin rol admin, `400` datos inválidos,
`409` correo ya registrado.

## `eco-notify-subscription`

Envía el correo de "suscripción activada". El destinatario, el nombre y la fecha
de activación se leen únicamente de la base de datos (no es un mailer abierto).

**Request** (requiere `Authorization: Bearer <JWT de un administrador>`):

```json
POST /functions/v1/eco-notify-subscription
{ "userId": "<uuid en eco.users>" }
```

**Response**:

```json
{ "sent": true }
```

```json
{ "sent": false, "error": "..." }
```

Errores: `401`/`403` como arriba, `400` `userId` inválido, `404` usuario o
suscripción inexistente, `409` si la suscripción no está activa.

## Secretos requeridos

Inyectados automáticamente por Supabase en cada función: `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Hay que configurar además:

| Secreto | Descripción |
| --- | --- |
| `EMAIL_PROVIDER` | `smtp` o `resend` (por defecto `resend`). |
| `MAIL_FROM` | Remitente, ej. `ECO <cuenta@gmail.com>`. Con Gmail el remitente real siempre es la cuenta autenticada. |
| `SITE_URL` | URL pública de la app web (link de invitación y de "Ir a ECO"). |
| `ALLOWED_ORIGIN` | (opcional) origen permitido para CORS; por defecto `*`. |

Proveedor `smtp` (Gmail temporal, Google Workspace, Microsoft 365, etc.):

| Secreto | Descripción |
| --- | --- |
| `SMTP_HOST` | Ej. `smtp.gmail.com`. |
| `SMTP_PORT` | `465` (TLS implícito, por defecto) o `587` (STARTTLS). El puerto 25 está bloqueado en Edge Functions. |
| `SMTP_USER` | Usuario de la cuenta de correo. |
| `SMTP_PASS` | Contraseña. En Gmail es una **contraseña de aplicación** (requiere verificación en dos pasos). |

Proveedor `resend`: `RESEND_API_KEY` (API key de [Resend](https://resend.com)).

> **Nunca** escribas `SMTP_PASS` ni `RESEND_API_KEY` en archivos del repositorio. Se cargan solo
> como secretos de Supabase. Para pasar de Gmail a la cuenta corporativa basta con cambiar
> `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` y `MAIL_FROM`; el código no cambia.

## Despliegue

Con la CLI de Supabase instalada:

```bash
supabase link --project-ref jtrrqbnxhxxqjcpizjuy

supabase secrets set EMAIL_PROVIDER=smtp SMTP_HOST=smtp.gmail.com SMTP_PORT=465 \
  SMTP_USER=<cuenta> SMTP_PASS=<contraseña-de-aplicación> \
  MAIL_FROM="ECO <cuenta@gmail.com>" SITE_URL=https://tu-app.com

supabase functions deploy eco-admin-create-user
supabase functions deploy eco-notify-subscription
```

Si la CLI no está disponible, se puede crear cada función desde el **Dashboard de
Supabase** (Edge Functions → Create function) pegando el contenido de
`index.ts` y los archivos de `_shared/`, y configurando los secretos en
Project Settings → Edge Functions → Secrets.

## Notas sobre Gmail (uso temporal)

- Usá una cuenta dedicada a ECO, con verificación en dos pasos y contraseña de aplicación.
- Límite aproximado de 500 correos por día; los mensajes pueden caer en spam al no salir de un
  dominio propio con SPF/DKIM.
- Se recomienda el puerto **465**. El 587 usa STARTTLS y no pudo verificarse en este entorno.
- Si la contraseña de aplicación se expuso, revocala en la cuenta de Google y generá otra.

## Notas sobre Resend

- Hay que verificar un dominio o remitente en Resend antes de producción.
- Mientras se prueba sin dominio verificado, el remitente de prueba
  `onboarding@resend.dev` **solo envía correos a la cuenta propietaria** de la
  API key de Resend; para probar con otros destinatarios hay que verificar un
  dominio propio.

## Recordatorio de configuración de Auth

`SITE_URL` debe estar en **Authentication → URL Configuration → Redirect URLs**
del proyecto de Supabase; de lo contrario `generateLink` puede rechazar el
`redirectTo` o el enlace de invitación no redirigirá correctamente.
