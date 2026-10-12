# ECO móvil — Administrador: ver y editar todos los negocios

## Requerimiento (usuario, 2026-10-12)
Al entrar a la app y elegir "ver negocios": si quien ingresa es el
administrador, debe ver el listado completo de negocios (igual que en la app
web/escritorio); al elegir un negocio, debe poder editar: ubicación, nombre
de negocio, producto principal, precio, teléfono, RUC, password, skill, etc.

## Decisión de diseño (arquitecto, confirmada con el usuario)
- La app móvil hoy no tiene ningún login (ni admin ni negocio); las RPCs
  móviles existentes (`update_mobile_business`, etc.) solo validan que
  `owner_id` coincida con el negocio — no verifican rol admin real. Por
  pedido del usuario: el admin inicia sesión con **email + password** usando
  el mismo Supabase Auth que la app web (`auth.jwt().app_metadata.role =
  'admin'`, ya implementado en `ECO.is_admin()`).
- Con sesión admin autenticada, las políticas RLS ya existentes
  (`businesses_select_public`, `businesses_update_own_or_admin`,
  `skills_*_owner_or_admin`, `products_*_owner_or_admin`) permiten leer y
  editar **todos** los negocios directamente — no hace falta duplicar
  `update_mobile_business`. Solo falta una RPC nueva, mínima, para el reseteo
  de password (requiere `pgcrypto`/`crypt`, no se puede hacer con un UPDATE
  plano): `ECO.admin_set_business_password(business_id uuid, new_password
  text)`, `security definer`, con guarda explícita `if not ECO.is_admin()
  then raise exception`.
- Entrada: en `SecondAccessScreen` (home) se agrega un enlace discreto "Ver
  negocios (admin)". Si no hay sesión admin, abre `AdminLoginScreen`
  (email/password); si el login resuelve con rol admin, navega a
  `BusinessListScreen`. Si el usuario no es admin, se muestra error y no se
  entra.
- `BusinessListScreen.tsx`: lista todos los negocios (select directo a
  `ECO.businesses`, ya permitido por RLS), con buscador por nombre; tocar un
  ítem abre `BusinessAdminEditScreen.tsx`.
- `BusinessAdminEditScreen.tsx`: reutiliza la lógica de validación de
  `mobileBusinessLogic.ts` (ya usada por `BusinessFormScreen`) para los
  mismos campos (nombre, RUC, teléfono, ubicación, producto principal,
  precio, password opcional) + gestión de skill (reusa `add_mobile_skill` /
  `delete_mobile_skill`, cuyo chequeo de ownership se satisface pasando el
  `owner_id` real del negocio, ya visible para el admin vía RLS). Guarda los
  campos de negocio/producto con `UPDATE` directo vía Supabase JS (RLS admin
  ya lo permite) y el password, si se cambia, vía la nueva RPC.
- Cliente Supabase móvil (`lib/supabase.ts`): se habilita `autoRefreshToken:
  true` para sesiones admin de uso prolongado; se mantiene
  `persistSession: false` (el admin vuelve a iniciar sesión en cada arranque
  de la app, a propósito, mismo nivel de fricción que el login web).

## Tareas
- [x] T1 — Migración `0007_admin_mobile_password.sql`:
      `ECO.admin_set_business_password(business_id, new_password)` con
      guarda `is_admin()`, mismas reglas de validación de password que
      `update_mobile_business`; `grant execute` a `authenticated` únicamente
      (no `anon`, para que solo una sesión autenticada pueda invocarla).
- [ ] T2 — `lib/supabase.ts`: habilitar `autoRefreshToken`; nuevo
      `services/adminAuth.ts` (signIn, signOut, `getAdminSession` que lee
      `app_metadata.role` del JWT de la sesión activa).
- [ ] T3 — `AdminLoginScreen.tsx` (email/password) + enlace "Ver negocios
      (admin)" en `SecondAccessScreen.tsx`, wireado en `App.tsx` (nueva fase
      `adminLogin`).
- [ ] T4 — `BusinessListScreen.tsx` (listado + buscador) + fase `adminLista`
      en `App.tsx`.
- [ ] T5 — `BusinessAdminEditScreen.tsx` (edición completa: ubicación,
      nombre, producto principal, precio, teléfono, RUC, password, skill) +
      fase `adminEditar` en `App.tsx`.
- [ ] T6 — Encabezado compartido (`AppHeader`, de `mobile-shared-header`) en
      las 3 pantallas nuevas, con "Volver" hacia el listado/segundo según
      corresponda.
- [ ] T7 — Verificación: `npm run typecheck --workspaces`,
      `npx expo export --platform android`, y (si hay entorno) pruebas de la
      RPC nueva vía pgTAP si el proyecto ya tiene arnés de pruebas para
      0006/0005.
- [ ] T8 — Generar APK (EAS build) para pruebas del usuario.

## Commits
(pendiente, se registran al cerrar la feature completa)

## Verificación
- pgTAP (harness Docker local, migraciones 0001..0007): 119 ok, 0 not ok
  (incluye los 7 nuevos tests de `admin_set_business_password`).
- Migración `0007_admin_mobile_password.sql` aplicada a producción
  (`supabase db push`, proyecto `jtrrqbnxhxxqjcpizjuy`): confirmado por el
  usuario antes de ejecutar.
