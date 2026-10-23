# ECO móvil — cuentas de usuario (email + clave) y verificación de rol

## Requerimiento (usuario, 2026-10-23)
Primera entrega resuelta aparte (sin tracking, cambios triviales):
- Mensaje de bienvenida "Hola {NombreUsuario}, bienvenido a ECO." en
  `SecondAccessScreen`.
- Quitar el botón "Ver negocios (admin)" siempre visible; el acceso admin
  se integra más adelante al flujo único de "Ver negocio" vía detección de
  rol (esta feature).

Esta feature cubre la base de cuentas que las siguientes features
(listado de negocios por rol, menú Salir, sincronización de estatus/clave)
van a necesitar:

- Alta de cuenta (primer acceso) pide nombre + rango de edad (ya existe) +
  **email + clave**.
- La cuenta móvil no mantiene una sesión de Supabase Auth persistente: cada
  vez que hace falta saber el rol/suscripción, la app llama "como un web
  service" a Supabase (RPC/Edge Function) con el email+clave guardados en
  SQLite, y Supabase devuelve el tipo de suscripción/servicio actual.
- Primera vez que se necesita el dato (p. ej. al entrar a "Ver negocio")
  pide la clave una sola vez; si ya está en SQLite, no la vuelve a pedir
  (la futuras llamadas de verificación usan la clave cacheada en
  background, sin mostrar el formulario de nuevo) — salvo que el usuario
  haya cerrado sesión explícitamente (feature de menú Salir, aparte).
- En fase de desarrollo: no hay que migrar negocios/usuarios de prueba
  existentes (confirmado por el usuario).

## Decisión de arquitectura (arquitecto, confirmada con el usuario)
- **Un solo mecanismo de verificación para los 3 roles**, consistente con
  el patrón ya usado en el móvil (usuario `anon` + RPC `SECURITY DEFINER`,
  nunca Auth JWT persistente en el dispositivo):
  - Nueva Edge Function `eco-mobile-verify-account` (service role, puede
    consultar tanto `ECO.users`/`ECO.subscriptions` como `auth.users` vía
    Admin API) recibe `{ email, password }` y devuelve:
    `{ ok, userId, firstName, role: 'none' | 'subscribed' | 'admin' }`.
  - Resolución interna:
    1. Si existe una cuenta de Supabase Auth con ese email, intenta
       `signInWithPassword` server-side; si entra, `role = 'admin'` cuando
       `app_metadata.role === 'admin'`, si no `role = 'subscribed'` cuando
       hay una fila en `ECO.subscriptions` activa para ese `ECO.users.id`
       (vía `auth_user_id`), si no `role = 'none'`.
    2. Si no hay cuenta de Auth con ese email, busca en `ECO.users` con
       `type = 2` (móvil) y compara `password_hash` (columna nueva,
       `extensions.crypt`); si coincide, `role = 'subscribed'` si tiene
       suscripción activa, si no `'none'`. Nunca es `'admin'` por esta vía
       (admin siempre es cuenta Auth real).
  - Esto reutiliza el patrón existente de `register_mobile_business`
    (password hasheada server-side, nunca se confía en el cliente) y no
    exige que la cuenta de negocio-sin-suscripción tenga cuenta de Auth.
- **Alta de cuenta** (`register_mobile_account`, RPC nueva que reemplaza a
  `register_mobile_user` para altas nuevas): recibe
  `(first_name, age_range, email, password)`, valida formato de email y
  política de clave (mismo patrón de `register_mobile_business`: mínimo 6
  caracteres, letras y números), hashea la clave y crea la fila en
  `ECO.users` (`type = 2`). Si el email ya existe (en `ECO.users` o en
  `auth.users`), la RPC rechaza el alta — ese caso usa el flujo de login,
  no de alta, dentro de la misma pantalla.
- **SQLite**: `ingreso` gana columnas `email`, `password` (clave en texto
  plano local — mismo trade-off ya aceptado hoy para `negocio.password`
  antes de sincronizar; nunca se sube en claro, el hash se calcula
  server-side), `role`, `subscription_checked_at`. La clave local es la que
  se reenvía en cada verificación "silenciosa" contra
  `eco-mobile-verify-account`.
- **Cierre de sesión** (pedir clave de nuevo) es responsabilidad de la
  feature de menú Salir (aparte): borra `password` de `ingreso` sin borrar
  `email`/`nombre`.

## Tareas
- [x] T1 — Supabase: migración `0008_mobile_accounts.sql` —
      `ECO.users.password_hash` (nullable, solo para `type = 2`),
      `ECO.users.email` ya es `unique` (reusar), RPC
      `register_mobile_account(p_first_name, p_age_range, p_email,
      p_password)` (valida y hashea, rechaza email duplicado en
      `ECO.users` o `auth.users`), permisos `anon`/`authenticated`.
- [x] T2 — Edge Function `eco-mobile-verify-account` (`supabase/functions`):
      recibe `{ email, password }`, implementa la resolución de rol
      descrita arriba usando `adminClient()` (ya existe en `_shared/auth.ts`
      para otras funciones), devuelve `{ ok, userId, firstName, role }` o
      `{ ok: false }` con mensaje genérico (no filtrar si el email existe).
- [x] T3 — SQLite: migración v6 (`migrations.ts`) — columnas `email`,
      `password`, `role`, `subscription_checked_at` en `ingreso`; helpers
      en `ingreso.ts` (`guardarCredenciales`, `actualizarRol`,
      `limpiarPassword`).
- [x] T4 — Servicio `services/accountAuth.ts`: `registerAccount(nombre,
      rangoEdad, email, password)` (llama a la RPC T1) y
      `verifyAccount(email, password)` (llama a la Edge Function T2),
      ambos con manejo de error en español (mismo patrón que
      `mapSyncErrorToSpanish`).
- [x] T5 — `FirstAccessScreen.tsx`: agrega campos email + clave (con
      confirmación de clave) al alta; al enviar, llama
      `registerAccount`; guarda email+clave+rol en `ingreso` vía T3.
- [x] T6 — Verificación: `npm run typecheck --workspaces` (0 errores),
      `npx expo export --platform android` (711 módulos, éxito). pgTAP
      para 0008 NO se corrió: no hay stack local de Supabase inicializado
      (`supabase/config.toml` no existe) y levantarlo es un esfuerzo aparte
      no pedido en esta feature; revisión manual del SQL contra el estilo
      de 0005/0006 en su lugar. Pendiente si se quiere cobertura pgTAP real.
      Bug encontrado y corregido en revisión: `accountAuth.ts` buscaba
      "ya existe|correo" (español) para detectar el error de email
      duplicado, pero la RPC devuelve el mensaje en inglés ("already
      exists") — corregido a `/already exists/i` y agregado el caso
      "invalid email".
- [x] T7 — Generar APK (EAS build) para pruebas del usuario.

### T7 — APK generado (2026-10-23)
- Build EAS `ed3d61fa-37a9-4f64-acc8-07630c537fdb` (perfil `preview`, commit
  `747f82b`): **FINISHED**. Descargado a
  `C:\data\data\eco\apk\application-eco.apk` (74.9 MB).
  Link directo: https://expo.dev/artifacts/eas/WpB6pp7q1Fx_aAGi9iZBhg1pO8khlb59bCWALtK85ig.apk

## Commits
- 747f82b feat(mobile): email+password accounts for owner/admin role verification

## Fuera de alcance (features siguientes)
- Listado de negocios por rol (sin suscripción/con suscripción/admin) y
  botón "Activar suscripción" con envío de correo.
- Menú "Salir" con 3 opciones y comportamiento de "Cerrar sesión".
- Sincronización de cambios de estatus (upgrade/downgrade) y de clave en
  ambos sentidos web↔móvil.
