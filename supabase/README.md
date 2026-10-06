# Supabase — almacenamiento central de ECO

Supabase/PostgreSQL es el backend y almacenamiento central del proyecto. Aquí viven
las migraciones del esquema.

## Esquema: `eco` (importante)

Todo el modelo de datos de ECO vive en el esquema **`eco`**. PostgreSQL pliega
los identificadores sin comillas a minúsculas, por lo que el esquema físico es
`eco` (minúsculas) aunque conceptualmente se lo llame ECO; PostgREST es
case-sensitive y usa `eco`. El esquema **`public` pertenece a OTRO proyecto** y
**no debe leerse ni modificarse** bajo ninguna circunstancia. Las migraciones solo
crean objetos en `eco` y otorgan permisos únicamente sobre `eco`.

## Migraciones

Aplicar en orden (apuntando al proyecto en la nube):

```bash
supabase link --project-ref jtrrqbnxhxxqjcpizjuy
supabase db push
# o bien, ejecutar el SQL de migrations/ desde el SQL Editor del dashboard
```

`0001_init.sql` crea en `ECO`:

- `users` — usuarios web/escritorio y móviles (tipo 1/2, estado activo/inactivo).
- `businesses` — negocios (datos, coordenadas y dirección).
- `products` + `product_images` — menú (productos, imágenes, precios, principal/secundario).
- `videos` — videos por negocio/producto.
- `skills` — palabras clave.
- `ratings` — calificaciones y comentarios de usuarios móviles.
- `subscriptions` — suscripciones (estado y fecha de activación).
- Triggers de límites de negocio (`enforce_*`) y `set_updated_at`.

`0002_auth.sql` agrega en `ECO`:

- `handle_new_user` + trigger `on_auth_user_created` (crea el perfil al registrarse).
- Helpers de autorización (`is_admin`, `current_user_id`, `owns_business`,
  `has_active_subscription`, `can_manage_catalog`).

`0003_admin_business_limit.sql` exime al Administrador del límite de 1 negocio sin
suscripción (`enforce_businesses_limit` consulta `eco.is_admin()`). Aplicar después de `0002`.

`0004_catalog_limits_storage.sql` (aplicar después de `0003`, desde el SQL Editor):

- Límites por plan (el Administrador queda exento): negocios 1/7, productos 1/7,
  imágenes por producto 7, videos por negocio 2 (solo con suscripción), skills 1/10.
- RLS de `products`: el dueño gestiona sus productos (tope por trigger); principal/secundario
  solo el Administrador (`guard_product_flags`).
- Storage: bucket público `eco-media` (50 MB, imágenes y video) con rutas
  `logos|products|videos/<business_id>/<archivo>`; escritura solo para el administrador o el
  dueño con suscripción activa (`can_write_media`).
- Row Level Security habilitado con políticas por rol.

## Configuración requerida en el dashboard

1. **Exponer el esquema `eco`** en la API: Settings → API → *Exposed schemas* →
   agregar `eco` (mantener `public` para el otro proyecto).
2. **Autenticación**: Auth → Providers → Email → habilitar *Confirm email*; fijar
   *Site URL* y las *Redirect URLs* de la app web (para confirmación y recuperación).
3. **Rol administrador**: asignarlo vía SQL (no hay registro público como admin):

   ```sql
   update auth.users
   set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
   where id = '<uuid del usuario>';
   ```

## Credenciales de la app web

La app web (`@eco/web`) lee las variables de entorno de Vite. Crear
`apps/web/.env` (no se commitea) con:

```
VITE_SUPABASE_URL=https://jtrrqbnxhxxqjcpizjuy.supabase.co
VITE_SUPABASE_ANON_KEY=<anon/publishable key>
```

El cliente (`apps/web/src/lib/supabase.ts`) apunta al esquema `eco` explícitamente.

## Storage (imágenes y videos)

Las imágenes y videos se guardan en Supabase Storage para poder recuperarse y
mostrarse en la app móvil. Buckets previstos:

- `business-logos` — logos de negocios.
- `product-images` — imágenes de productos.
- `business-videos` — videos de negocios.

## Tests

Los tests de la migración usan [pgTAP](https://pgtap.org) y viven en `tests/`.
Requieren la CLI de Supabase y un proyecto local:

```bash
supabase db reset   # aplica las migraciones desde cero
supabase test db    # corre los tests pgTAP de tests/
```

`0001_init_test.sql` verifica constraints (tipo, estado, rating, unicidad),
los límites de negocio (`skills`, `negocios`, `imágenes`, `videos`), el trigger
`set_updated_at` y los `on delete cascade`.

`0002_auth_test.sql` verifica `handle_new_user`, los helpers de autorización y el
RLS por rol (dueño, autenticado sin perfil y administrador).

## Edge Functions

Las operaciones que requieren la service role (crear cuentas de usuario web/escritorio y
enviar el correo de activación de suscripción) viven en `supabase/functions/`. Ver
`supabase/functions/README.md` para detalle de cada función, secretos y despliegue.

## Pendiente antes de producción

- Sincronización SQLite (móvil) → Supabase y política de `ratings` para el móvil.
- Definir los buckets de Storage y sus políticas de acceso.
