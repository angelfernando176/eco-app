# Supabase — almacenamiento central de ECO

Supabase/PostgreSQL es el backend y almacenamiento central del proyecto. Aquí viven
las migraciones del esquema.

## Esquema: `ECO` (importante)

Todo el modelo de datos de ECO vive en el esquema **`ECO`**. El esquema
**`public` pertenece a OTRO proyecto** y **no debe leerse ni modificarse** bajo
ninguna circunstancia. Las migraciones solo crean objetos en `ECO` y otorgan
permisos únicamente sobre `ECO`.

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
- Row Level Security habilitado con políticas por rol.

## Configuración requerida en el dashboard

1. **Exponer el esquema `ECO`** en la API: Settings → API → *Exposed schemas* →
   agregar `ECO` (mantener `public` para el otro proyecto).
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

El cliente (`apps/web/src/lib/supabase.ts`) apunta al esquema `ECO` explícitamente.

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

## Pendiente antes de producción

- Sincronización SQLite (móvil) → Supabase y política de `ratings` para el móvil.
- Definir los buckets de Storage y sus políticas de acceso.
