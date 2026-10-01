# Supabase — almacenamiento central de ECO

Supabase/PostgreSQL es el backend y almacenamiento central del proyecto. Aquí viven
las migraciones del esquema.

## Migraciones

Aplicar en orden:

```bash
supabase db push
# o bien, con psql apuntando a la base del proyecto
```

`0001_init.sql` crea las tablas base:

- `users` — usuarios web/escritorio y móviles (tipo 1/2, estado activo/inactivo).
- `businesses` — negocios (datos, coordenadas y dirección).
- `products` + `product_images` — menú (productos, imágenes, precios, principal/secundario).
- `videos` — videos por negocio/producto.
- `skills` — palabras clave.
- `ratings` — calificaciones y comentarios de usuarios móviles.
- `subscriptions` — suscripciones (estado y fecha de activación).

## Autenticación (Supabase Auth)

El registro con confirmación por correo y la recuperación de credenciales se
resuelven con Supabase Auth. La columna `users.auth_user_id` enlaza el perfil de
la app con la cuenta de Auth para los usuarios web/escritorio; los usuarios móviles
(sin cuenta de Auth en el primer acceso) la dejan en `null`.

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
los límites de negocio de `packages/shared/src/domain/limits.ts` (skills,
negocios, imágenes, videos), el trigger `set_updated_at` y los `on delete cascade`.

## Pendiente antes de producción

- Habilitar **Row Level Security** y políticas por rol.
- Definir los buckets de Storage y sus políticas de acceso.
