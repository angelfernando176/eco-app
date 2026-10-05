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
