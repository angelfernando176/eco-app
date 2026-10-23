# ECO móvil — listado de negocios por rol, activar suscripción, menú Salir

## Requerimiento (usuario, 2026-10-23)
Continuación de `mobile-user-accounts`. Cubre lo que quedó fuera de
alcance en esa feature:

- "Ver negocio" muestra un **listado** (no va directo al negocio) con
  contenido según el rol de la cuenta (verificado vía
  `eco-mobile-verify-account`):
  - **Sin suscripción**: 1 negocio, solo lectura + mensaje "Con la
    suscripción del negocio puede actualizar la información además de
    agregar videos, imágenes" + botón "Activar la suscripción" (envía
    correo a administracion@exxasoft.com).
  - **Con suscripción**: todos los negocios de la cuenta + botón
    "Actualizar información" → abre la app web.
  - **Administrador**: todos los negocios + búsqueda + "Actualizar
    información" → abre la app web.
- Primera vez que se entra a "Ver negocio" pide la clave (si no está
  cacheada); las siguientes veces no la vuelve a pedir, pero sí vuelve a
  consultar el estatus en Supabase cada vez (silencioso).
- Menú "Salir" (arriba a la derecha, pantalla principal) pasa de 2 a 3
  opciones: "Cancelar", "Cerrar sesión", "Salir". "Cerrar sesión" borra la
  clave cacheada (no el email): la próxima vez que se necesite verificar,
  vuelve a pedirla.

## Decisiones de arquitectura (arquitecto, confirmadas con el usuario)
- **Alcance de "actualizar información" → web**: para suscripción y
  admin, TODO (datos básicos, fotos/videos/skills, dar de baja) se
  gestiona en la web. Las pantallas móviles `MobileContentScreen` y
  `DeactivationSurveyScreen` quedan sin punto de entrada desde este flujo
  (no se borran: podrían reconectarse después; decisión confirmada con el
  usuario — "todo se mueve a la web").
  `BusinessManageScreen`/`BusinessFormScreen`/`RegisterMapScreen` para
  "Registrar negocio" (alta nueva desde el dispositivo) NO cambian: ese
  flujo sigue 100% en la app porque no hay equivalente de alta anónima en
  la web.
- **Gap encontrado y corregido**: `FirstAccessScreen` solo intentaba
  `registerAccount` (alta). Si el correo ya existe (cuenta creada antes
  desde la web), la RPC rechaza el alta y hoy eso termina en un error sin
  salida — contradice el requerimiento ("si ya ingresó a la web, el móvil
  le pide la clave una vez"). Se agrega `registerOrLogin` en
  `accountAuth.ts`: intenta `registerAccount`; si el error es "ya existe
  una cuenta con este correo", cae a `verifyAccount(email, password)` con
  la misma clave tipeada — si coincide, usa esa cuenta (rol real); si no
  coincide, error "Ese correo ya tiene una cuenta y la clave no
  coincide.".
- **Listado "con suscripción"**: consulta directa `businesses` filtrada
  por `owner_id = <userId que devuelve verify>` (sin RPC nueva: la
  política RLS `businesses_select_public` ya permite lectura anónima de
  negocios `status = 'active'`). Alcance confirmado: solo negocios
  activos (un negocio dado de baja no aparece en este listado; no
  bloqueante para esta feature, ya que no hay sesión Auth real del lado
  del dispositivo para ver inactivos propios).
  "Sin suscripción" usa la MISMA consulta (el trigger
  `enforce_businesses_limit` ya garantiza que nunca hay más de 1 negocio
  sin suscripción activa, así que el listado sale naturalmente con 1
  fila).
- **Listado "administrador"**: reutiliza `listBusinessesAdmin` (ya
  existe, `adminBusinessApi.ts`) — pero esa consulta depende de RLS
  `is_admin()`, que exige una sesión real de Supabase Auth (JWT), no solo
  el resultado de la verificación sin estado. Por eso, cuando
  `verifyAccount` devuelve `role: 'admin'`, el dispositivo hace además un
  `signInAsAdmin(email, password)` real (ya existe en `adminAuth.ts`)
  antes de mostrar el listado — reutiliza, no duplica, el flujo de
  autenticación admin ya construido.
- **Activar suscripción**: nueva Edge Function
  `eco-request-subscription-activation` (llamable por `anon`, sin
  `requireAdmin`): recibe `{ businessId }`, busca el negocio y el dueño,
  envía un correo a la dirección fija `administracion@exxasoft.com` con
  los datos del negocio/dueño que solicita la activación. Nueva plantilla
  `subscriptionActivationRequestTemplate` en `_shared/templates.ts`.

## Tareas
- [x] T1 — Backend: Edge Function `eco-request-subscription-activation`
      (+ plantilla nueva en `_shared/templates.ts`), siguiendo el estilo
      de `eco-notify-subscription`/`eco-mobile-verify-account`.
- [x] T2 — `accountAuth.ts`: agrega `registerOrLogin` (fallback descrito
      arriba); `services/businessAccess.ts` (nuevo): `listOwnerBusinesses
      (ownerId)`, `getBusinessAccessDetail(businessId)`,
      `requestSubscriptionActivation(businessId)`.
- [x] T3 — `screens/VerifyPasswordScreen.tsx` (nuevo): email de solo
      lectura (de `ingreso.email`) + campo clave; llama `verifyAccount`;
      en éxito guarda clave+rol en SQLite (`guardarCredenciales`,
      `actualizarRol`) y continúa.
- [x] T4 — `screens/BusinessAccessListScreen.tsx` (nuevo): listado
      role-aware (búsqueda solo si admin).
- [x] T5 — `screens/BusinessAccessDetailScreen.tsx` (nuevo): detalle
      solo-lectura + acción según rol (upsell+activar vs. abrir web).
- [x] T6 — `App.tsx`: reemplaza `handleVerNegocio` por el flujo nuevo
      (verificación silenciosa o `VerifyPasswordScreen` → lista →
      detalle); para rol admin, `signInAsAdmin` antes de listar;
      `FirstAccessScreen` usa `registerOrLogin` en vez de
      `registerAccount`.
- [x] T7 — `AppHeader.tsx`: menú "Salir" con 3 opciones (Cancelar/Cerrar
      sesión/Salir); "Cerrar sesión" llama `limpiarPassword` (nuevo prop
      `onLogout`, pasado desde `App.tsx`).
- [x] T8 — Verificación: `npm run typecheck --workspaces` (0 errores),
      `npx expo export --platform android` (704 módulos, éxito). No se
      hicieron llamadas reales contra Supabase/Edge Functions (apuntan a
      producción; una prueba automática enviaría un correo real a
      administracion@exxasoft.com) — verificación proporcional igual que
      en features anteriores.
      Nota de diseño: `AdminLoginScreen`/`BusinessListScreen`/
      `BusinessAdminEditScreen` quedaron sin punto de entrada en
      `App.tsx` (reemplazados por el flujo unificado `Ver negocio` →
      `BusinessAccessListScreen`/`BusinessAccessDetailScreen` para los 3
      roles); archivos no borrados, solo inalcanzables, por la misma
      decisión que `MobileContentScreen`/`DeactivationSurveyScreen`.
- [ ] T9 — Generar APK (EAS build) — build único al cierre de esta
      feature (pedido explícito del usuario: completar todo antes de que
      empiece a probar, para no interrumpirlo a mitad de prueba).

## Fuera de alcance (confirmado)
- Dejar reconectado `MobileContentScreen`/`DeactivationSurveyScreen` a
  algún punto de entrada (quedan sin uso por decisión del usuario).
- Ver negocios inactivos propios desde "Ver negocio" sin sesión Auth real.
- Pantalla de cambio de clave en el móvil (no pedida); el "cambio de
  clave sincroniza" del requerimiento original queda cubierto por diseño:
  cada verificación es contra la clave real vigente en Supabase, así que
  un cambio hecho en la web se refleja solo con que la próxima
  verificación silenciosa falle — en ese caso se trata como sesión
  vencida (`limpiarPassword` + se vuelve a pedir la clave), no se
  construye un mecanismo de sync aparte.
