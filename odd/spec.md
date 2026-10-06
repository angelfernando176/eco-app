# ECO — Requerimiento inicial + especificaciones técnicas

> Documento fuente de verdad para retomar el proyecto desde cualquier herramienta
> (Pi/opencode, Claude, etc.). Incluye el requerimiento completo del prompt
> original, el estado de avance y los detalles técnicos críticos.

---

## 1. Descripción general

**ECO** — aplicación para buscar negocios registrados. Compuesta por una app
web/escritorio y una app móvil.

- **Administrador** (web/escritorio): gestiona globalmente usuarios y negocios.
- **Usuario web/escritorio**: gestiona únicamente los negocios de su cuenta.
- **Usuario móvil**: consulta negocios y registra calificaciones/reseñas.

## 2. Stack fijo

- TypeScript en todo el monorepo (npm workspaces).
- **Web/escritorio**: React + Vite (`apps/web`, `@eco/web`).
- **Móvil**: React Native + Expo SDK 52 + SQLite (`apps/mobile`, `@eco/mobile`).
- **Compartido**: `packages/shared` (`@eco/shared`) — tipos de dominio + límites.
- **Backend**: Supabase / PostgreSQL (esquema `eco`).
- **Almacenamiento**: Supabase Storage (imágenes/videos) + SQLite local móvil.
- **Mapas**: Google Maps.

## 3. Requerimiento completo (prompt original)

### 1. ROLES

#### 1.1 Administrador — APP web/escritorio
Gestiona globalmente usuarios y negocios.

**Autenticación**
- Iniciar sesión.
- Registrarse con nombre, apellido, correo electrónico y rango de edad.
- Confirmar la creación de la cuenta mediante enlace enviado por correo.
- Recuperar credenciales mediante enlace enviado por correo.

**Gestión de negocios**
- Consultar el listado de negocios registrados.
- Listado con paginación, búsqueda por cada campo y acciones Crear, Editar y Borrar.
- Crear nuevos negocios.
- Editar y gestionar cualquier negocio.
- Al editar un negocio, abrir una pantalla maestro-detalle con pestañas:
  Información del negocio, Menú (productos/servicios), Videos, Skills (palabras clave).

**Información del negocio**: nombre comercial, RUC, teléfono, correo del
representante, logo, coordenadas, dirección (calle principal, calle secundaria,
número y referencia).

**Menú — permisos del Administrador**: crear/editar/eliminar productos, cargar
imágenes, definir producto principal y secundario, registrar y modificar precios.

**Videos — permisos del Administrador**: cargar/visualizar/eliminar videos.
Disponibles para reproducción en la app móvil.

**Skills**: 1 sin suscripción; hasta 10 con suscripción activa.

**Calificaciones**: consultar calificaciones y comentarios de usuarios móviles.

### 2. GESTIÓN DE USUARIOS — ADMINISTRADOR
Listado de usuarios web/escritorio y móviles.
Columnas: nombre, apellido, rango de edad, tipo (1 = web/escritorio, 2 = móvil), correo.
Funciones: paginación, búsqueda, crear, editar, borrar.

- **Borrado**: no eliminar físicamente → estado inactivo; los inactivos no
  aparecen en el listado principal; confirmación antes de la acción.
- **Edición**: pantalla de edición, actualizar info, botón **Activar suscripción**,
  almacenar fecha de activación, enviar correo notificando la activación.

### 3. USUARIO WEB/ESCRITORIO — NEGOCIO
Administra únicamente los negocios asociados a su cuenta.

**Autenticación**: igual que Administrador (iniciar sesión, registrarse, confirmar
por correo, recuperar credenciales).

**Negocios**
- Sin suscripción: 1 único negocio. Con suscripción activa: varios.
- Listado solo con los negocios del usuario.
- Crear y editar según su suscripción.

**Maestro-detalle**
1. **Información**: nombre comercial, RUC, teléfono, correo del representante,
   coordenadas, dirección. **No** cargar logo desde esta interfaz.
2. **Menú**: sin suscripción solo permite indicar un único producto (resto solo
   lectura). Con suscripción: agregar/actualizar hasta 7 imágenes con descripción.
   **No** crear/editar/eliminar productos, ni imágenes, ni precios, ni
   principal/secundario (lo gestiona también el Administrador).
3. **Videos**: sin suscripción visible pero inactivo (solo lectura). Con
   suscripción: 1 video por producto (máx 7 productos). También admin.
4. **Skills**: 1 sin suscripción; 10 con suscripción activa.

### 4. APP MÓVIL — USUARIO
- **Primer acceso**: nombre + rango de edad.
- **Segundo acceso**: "Bienvenido a ECO. Si quieres registrar tu negocio debes dar
  clic en Registrar." + botones **Registrar** (abre la web en navegador) y
  **Continuar** (sincroniza info local y continúa).
- **Búsqueda**: negocios, radio 5/10/20/50/100 km desde ubicación actual,
  resultados en mapa.
- **Popup del negocio**: Google Maps (coordenadas), Videos (reproducir), Ranking
  (calificaciones/comentarios/reseñas), Menú (productos/imágenes/precios),
  Contacto (nombre comercial y datos), Calificar (calificación + comentario).

### 5. ALMACENAMIENTO
- **Supabase (central)**: usuarios web/móviles, negocios, información, productos,
  precios, imágenes, videos, skills, calificaciones/comentarios, suscripciones.
  Imágenes y videos recuperables en la app móvil.
- **SQLite (móvil)**: datos de ingreso, búsquedas, calificaciones, reseñas.
  Sincronizar posteriormente a Supabase.

### 6. REGLAS DE PERMISOS
- Administrador: acceso global a usuarios y negocios.
- Usuario web/escritorio: solo negocios de su cuenta.
- Usuario móvil: solo consultar negocios y registrar calificaciones/reseñas.
- Menú: creación/modificación solo Admin y usuarios con suscripción (sus negocios);
  consulta por móvil.
- Videos: ídem.
- Skills: 1 sin suscripción, 10 con suscripción activa.
- Negocios: 1 sin suscripción, múltiples con suscripción activa.
- Usuarios eliminados: inactivos, no físicos.

### 7. INTERFAZ
Moderna, clara y responsive, diferenciando interfaces y permisos por rol.

> **Regla de alcance**: no agregar roles, módulos, campos, funcionalidades ni
> reglas de negocio no especificados en este prompt.

---

## 3b. Reglas por plan (decisión posterior del usuario — PREVALECE sobre §3 donde difiera)

| | Administrador | Sin suscripción | Con suscripción activa |
|---|---|---|---|
| Negocios | sin restricción | 1 | hasta 7 |
| Logo | sí | no | sí |
| Menú | sin restricción | 1 producto (sin imágenes) | hasta 7 productos, hasta 7 imágenes c/u |
| Videos | sin restricción | no permitido | hasta 2 por negocio |
| Skills | sin restricción | 1 | hasta 10 |

Con suscripción puede volver a cargar y eliminar imágenes/videos. El Administrador es
único y equivale a la suscripción más alta. Detalle y supuestos: `odd/tasks/web-catalog.md`.

## 4. Modelo de datos (esquema `eco`)

Tablas (en `supabase/migrations/0001_init.sql`):

- `users` — id, auth_user_id (FK auth.users), first_name, last_name, age_range,
  email (unique), type (1 web / 2 móvil), status (active/inactive), created_at, updated_at.
- `businesses` — owner_id (FK users), trade_name, ruc, phone, representative_email,
  logo_url, latitude, longitude, main_street, secondary_street, number, reference.
- `products` — business_id, name, description, price, is_primary, is_secondary.
- `product_images` — product_id, url, description, position.
- `videos` — business_id, product_id, url.
- `skills` — business_id, name (unique por negocio).
- `ratings` — business_id, mobile_user_id, rating (1..5), comment.
- `subscriptions` — user_id, status (active/inactive), activated_at.

Triggers de límites: `enforce_businesses_limit`, `enforce_skills_limit`,
`enforce_product_images_limit`, `enforce_videos_limit`, `set_updated_at`.

`0002_auth.sql` agrega: trigger `handle_new_user` (perfil al registrarse), helpers
de RLS y políticas por rol.

## 5. Autenticación y RLS

- **Supabase Auth**: sign up (confirmación por correo), sign in, reset password.
- **Trigger `on_auth_user_created`** sobre `auth.users` → crea perfil en `eco.users`
  (type=1) con `raw_user_meta_data` (first_name, last_name, age_range).
- **Rol admin**: `auth.users.raw_app_meta_data.role = 'admin'` (claim JWT), leído
  en RLS vía `auth.jwt() -> 'app_metadata'`. Sin columna nueva.
- **Helpers RLS** (en `eco`): `is_admin()`, `current_user_id()`, `owns_business()`,
  `has_active_subscription()`, `can_manage_catalog()`.
- **Políticas por rol** (resumen):
  - `users`: SELECT/UPDATE = admin o sí mismo; sin DELETE (soft-delete).
  - `businesses`: SELECT público; INSERT/UPDATE = admin o dueño; DELETE = admin.
  - `products`/`product_images`/`videos`: SELECT público; escritura = admin o dueño
    con suscripción activa.
  - `skills`: SELECT público; escritura = admin o dueño.
  - `ratings`: SELECT público; INSERT móvil pendiente (feature sincronización).
  - `subscriptions`: SELECT = admin o propio; INSERT/UPDATE = admin.

---

## 6. Detalles técnicos críticos (gotchas)

1. **Esquema `eco` minúsculas**: PostgreSQL pliega identificadores sin comillas a
   minúsculas. El esquema físico es `eco`, y PostgREST es **case-sensitive**.
   El cliente usa `createClient(url, key, { db: { schema: 'eco' } })`.
2. **`public` es de OTRO proyecto**: no leer ni modificar `public` bajo ninguna
   circunstancia. Todo ECO vive en `eco` con grants propios a
   `anon`/`authenticated`/`service_role`.
3. **Exponer el esquema en el dashboard**: Settings → API → *Exposed schemas* →
   `eco` (ya hecho).
4. **Auth → Email**: habilitar *Confirm email* + Site URL + Redirect URLs (ya hecho).
5. **`.env` bloqueado por política de seguridad**: `apps/web/.env` se crea
   manualmente (no se commitea). Contenido: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
6. **Asignar admin**: solo después del primer registro, en SQL Editor:
   `update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb where id = '<uuid>';`
7. **Review RDD de rango commiteado**: START con
   `{"mode":"ordinary","baseRef":"<full 40-char sha>","committedOnly":true}`.
   Sin `"mode":"ordinary"` da error "Judgment Day graph-v1 START requires lineageId".
8. **No hay runner JS de tests** (no inventar): verificación = typecheck + build.
   Tests pgTAP (`supabase/tests/*.sql`) requieren `supabase test db` (CLI local,
   no instalada; Docker sí está).
9. **`package-lock.json` infla el diff** (~9k líneas) y puede agotar el presupuesto
   de tiempo del review; considerar excluirlo del slice.

## 7. Credenciales (publishable, no secretas)

```
SUPABASE_URL=https://jtrrqbnxhxxqjcpizjuy.supabase.co
SUPABASE_ANON_KEY=sb_publishable_snBSbyTIkIU8_qQdsw_SpQ_6p5UDuxS
```

El `.env` de la app web usa:
```
VITE_SUPABASE_URL=https://jtrrqbnxhxxqjcpizjuy.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_snBSbyTIkIU8_qQdsw_SpQ_6p5UDuxS
```

## 8. Estado de avance

**Rama**: `feat/authentication` (sobre `master`). Commits:

- `8937cc6` refactor(supabase): move ECO schema out of public
- `139fac2` feat(supabase): add auth profile trigger and RLS by role
- `0c38dfd` feat(web): add Supabase client and auth UI
- `685e9ed` feat(mobile): add first and second access onboarding
- `7e579db` docs(supabase): document ECO schema and dashboard setup
- `f2fc5c1` docs(odd): add authentication feature tracker
- `48cadda` docs(odd): record review deferred to PR decision
- `2ce39df` docs(odd): mark migrations applied to cloud
- `50c589e` fix(web): use lowercase eco schema for PostgREST

**Hecho**:
- Migraciones `0001` + `0002` aplicadas en la nube (esquema `eco` + RLS).
- Cliente Supabase web + UI de login/registro/confirmación/recuperación.
- Onboarding móvil (SQLite `ingreso` + primer/segundo acceso).
- Verificación: typecheck web/mobile/shared OK, build web OK.

**Pendiente / siguiente**:
- Probar el flujo de login/registro (`npm run web`).
- Designar primer admin (tras el primer registro).
- Sincronización SQLite móvil → Supabase + política `ratings` (móvil).
- CRUD de negocios (admin y web/escritorio).
- Búsqueda móvil con mapa/radio.
- Review RDD diferido al pull request (lineage `review-7b65ed26630551a3`, tier high,
  cortada por timeout; retomar sobre el PR slice).

## 9. Comandos útiles

```bash
npm install          # instalar dependencias
npm run web          # app web (Vite dev)
npm run mobile       # app móvil (Expo)
npm run typecheck    # typecheck en todos los workspaces
npm run build --workspace @eco/web
```
