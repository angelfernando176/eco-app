# ECO — Autenticación

## Objetivo
Implementar la autenticación del proyecto ECO según el prompt original, con alcance "backend + UI completa":
- Autenticación web/escritorio (Administrador y Usuario web/escritorio) con Supabase Auth.
- RLS (Row Level Security) por rol.
- UI web de login/registro.
- Onboarding móvil (primer/segundo acceso).

## Esquema: `ECO` (decisión crítica)
Todo el modelo de datos vive en el esquema **`ECO`**. El esquema **`public` pertenece a
OTRO proyecto** y **no debe leerse ni modificarse** bajo ninguna circunstancia. Las
migraciones y los tests fueron reescritos para apuntar únicamente a `ECO`, con GRANTs
propios (`anon`, `authenticated`, `service_role`) sobre `ECO`.

## Spec (del prompt original, sección Autenticación)
Común a Administrador y Usuario web/escritorio:
- Iniciar sesión.
- Registrarse con nombre, apellido, correo electrónico y rango de edad.
- Confirmar la creación de la cuenta mediante enlace enviado por correo.
- Recuperar credenciales mediante enlace enviado por correo.

App móvil:
- Primer acceso: nombre + rango de edad.
- Segundo acceso: mensaje "Bienvenido a ECO…" + botones Registrar (abre web) / Continuar.

## Decisiones de diseño
- **Rol `admin` sin columna nueva**: `auth.users.raw_app_meta_data.role = 'admin'`
  (claim JWT), leído en RLS vía `auth.jwt() -> 'app_metadata'`. `web_user` = autenticado
  sin ese claim; `mobile_user` = `ECO.users.type = 2`.
- **Confirmación por correo / recuperación**: configuración nativa de Supabase Auth
  (email confirmations + reset password). Documentado en `supabase/README.md`.
- **Trigger de perfil**: al sign up se crea la fila en `ECO.users` (`type=1`,
  `status='active'`) enlazando `auth_user_id` desde `auth.users`.
- **Cliente web con esquema explícito**: `createClient(url, key, { db: { schema: 'ECO' } })`.
- **Credenciales**: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` en `apps/web/.env`
  (creado manualmente; la política de seguridad bloquea escribir archivos `.env`).
- **Sincronización móvil → Supabase** y **calificación desde el móvil** quedan fuera de
  esta iteración (features posteriores); RLS de `ratings` queda preparado.

## RLS por rol (resumen)
- `users`: SELECT/UPDATE = admin o sí mismo; sin política DELETE (fuerza soft-delete).
- `businesses`: SELECT público; INSERT/UPDATE = admin o dueño; DELETE = solo admin.
- `products`/`product_images`/`videos`: SELECT público; escritura = admin o dueño con suscripción activa.
- `skills`: SELECT público; escritura = admin o dueño (límites 1/10 ya en triggers).
- `ratings`: SELECT público; INSERT para el móvil (pendiente feature móvil).
- `subscriptions`: SELECT = admin o propio; INSERT/UPDATE = solo admin.

## Tareas
- [x] Migración `0002_auth.sql` (trigger perfil + helpers + RLS)
- [x] Tests pgTAP `0002_auth_test.sql`
- [x] Cliente Supabase en `@eco/web`
- [x] UI web (login/registro/confirmación/recuperación)
- [x] Onboarding móvil (SQLite + primer/segundo acceso)
- [x] Verificación (typecheck web/mobile/shared + build web)
- [ ] Commits por work-unit + review RDD

## Configuración pendiente del lado del usuario (dashboard)
- Exponer el esquema `ECO` en Settings → API → *Exposed schemas*.
- Auth → Email: habilitar *Confirm email*; fijar Site URL y Redirect URLs.
- Crear `apps/web/.env` con las credenciales.
- **Aplicar las migraciones desde el SQL Editor (decisión del usuario):** ejecutar
  `supabase/migrations/0001_init.sql` y luego `0002_auth.sql`, en orden.

## Commits
- `8937cc6` refactor(supabase): move ECO schema out of public
- `139fac2` feat(supabase): add auth profile trigger and RLS by role
- `0c38dfd` feat(web): add Supabase client and auth UI
- `685e9ed` feat(mobile): add first and second access onboarding
- `7e579db` docs(supabase): document ECO schema and dashboard setup

## Review nativa (RDD)
- Lineage: `review-7b65ed26630551a3` (creada) · tier **high** · 4 lenses
  (`review-risk`, `review-resilience`, `review-readability`, `review-reliability`)
  · 13 archivos · budget 200.
- Estado: **detenida por timeout** — `operation_timeout` (context deadline exceeded),
  `retry_safe: false`, `next_action: stop`, `manual_action_required`.
- **Decisión del usuario: diferir el review al pull request** (no se reintenta ahora).
- Nota: `package-lock.json` (~9k líneas) infló el diff (13 309 líneas) y probablemente
  contribuyó al agotamiento del presupuesto de tiempo.
