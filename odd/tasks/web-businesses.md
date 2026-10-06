# ECO — Web: shell + gestión de negocios (Información)

## Objetivo
Pantalla autenticada de la app web con gestión de negocios para **Administrador**
(global) y **Usuario web/escritorio** (solo los suyos), según `odd/spec.md` §1, §3, §6.
Esta feature cubre: shell, listado (paginación + búsqueda por campo + Crear/Editar/Borrar)
y pantalla maestro-detalle con pestañas, implementando la pestaña **Información**.

## Alcance
- Dentro: detección de rol (`app_metadata.role`) y perfil (`eco.users`), suscripción activa,
  listado/CRUD de negocios, pestañas (Información activa; Menú/Videos/Skills visibles
  pero se implementan en la feature siguiente).
- Fuera: logo (requiere Storage → feature de Storage), menú/videos/skills, gestión de
  usuarios, calificaciones, app móvil.

## Reglas de negocio
- Admin: ve todos los negocios; crea eligiendo el dueño (usuarios web); edita; **borra**
  (RLS DELETE = solo admin).
- Usuario web: ve **solo los suyos** (filtrar por `owner_id` en la consulta: la RLS de
  SELECT es pública); crea/edita los suyos; **no borra**; sin suscripción activa → máx. 1
  negocio (deshabilitar Crear al alcanzarlo; el trigger de BD lo refuerza).
- Usuario web no carga logo.
- Cliente: esquema `eco`; PostgREST case-sensitive.

## Tareas
- [x] Capa de datos (`apps/web/src/lib`/`features`): perfil+rol+suscripción, API de negocios
- [x] Primitivas UI: DataTable, Pagination, Tabs, ConfirmDialog, PageHeader (+ CSS en `styles/`)
- [x] Shell autenticado + listado de negocios (búsqueda por campo, paginación, borrar)
- [x] Maestro-detalle: formulario Información (crear/editar) con validaciones
- [x] Verificación: typecheck + build OK
- [ ] Prueba manual del usuario contra Supabase real

## Commits
- `3906ef8` feat(web): add businesses data layer and table/tabs/dialog primitives
- feat(web): add authenticated shell and business management screens

## Iteración 2 — Validaciones del formulario (feedback de prueba manual)
Prueba manual: los negocios SÍ se crean. Reglas pedidas por el usuario:
- Nombre comercial: 3–10 caracteres.
- RUC: solo dígitos, 10–13.
- Teléfono: máx. 30 caracteres, mín. 8 dígitos.
- Correo: validación estándar.
- Latitud/Longitud: rangos propios; ayuda "¿?" que abre un modal explicando cómo
  obtenerlas desde Google Maps.
- Calle principal y secundaria: 3–100 caracteres.
- Número: 3–15 caracteres.
- Referencia: 3–300 caracteres, `textarea` amplio.
- Nota: el usuario existente es admin; el usuario creará una cuenta normal para pruebas.

Tareas:
- [x] Reglas puras de validación actualizadas (`rules.ts`) + límites compartidos
- [x] Componentes UI: `Field` con textarea/maxLength/contador, `Modal` de ayuda
- [x] Formulario con restricciones de entrada y ayuda de coordenadas
- [x] Verificación typecheck + build

## Iteración 3 — Admin sin límite de negocios + nombre comercial 3–100
- Causa: el trigger `enforce_businesses_limit` evaluaba solo la suscripción del dueño; el
  admin (que es dueño de su propio perfil web) quedaba limitado a 1 negocio.
- Fix: migración `0003_admin_business_limit.sql` (exime a `eco.is_admin()`); aplicada por el usuario en el SQL Editor.
- Nombre comercial: máximo corregido de 10 a 100 (`limits.ts`).
- Nota: los triggers de skills/imágenes/videos no se tocaron.
