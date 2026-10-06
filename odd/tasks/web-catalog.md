# ECO — Web: Storage + Menú / Videos / Skills / Logo

## Reglas de negocio (decisión del usuario, sobrescribe el spec original donde difiera)
| | Administrador | Usuario sin suscripción | Usuario con suscripción activa |
|---|---|---|---|
| Negocios | sin restricción | 1 | hasta 7 |
| Logo | sí | no | sí |
| Menú (productos/servicios) | sin restricción | 1 producto, sin imágenes | hasta 7, cada uno con hasta 7 imágenes (descripción) |
| Videos | sin restricción | no permitido (pestaña visible, inactiva) | hasta 2 por negocio |
| Skills | sin restricción | 1 | hasta 10 |
| Re-cargar / eliminar imágenes y videos | sí | — | sí |

- El Administrador es único y no tiene restricciones (equivale a la suscripción más alta).
- Supuestos (reversibles): el dueño puede editar el **precio**; **principal/secundario**
  solo el Administrador (spec original). Un video pertenece a un producto del negocio
  (`product_id` sigue siendo requerido); se elimina el tope de 1 por producto.
- Cada imagen/video/logo vive en el bucket `eco-media` (público de lectura).
  Rutas: `logos/<business_id>/<uuid>.<ext>`, `products/<business_id>/<uuid>.<ext>`,
  `videos/<business_id>/<uuid>.<ext>`. Escritura según `eco.can_manage_catalog(business_id)`
  (admin o dueño con suscripción activa).

## Tareas
- [x] Migración `0004_catalog_limits_storage.sql` (límites, RLS de productos, bucket+policies) + docs
- [x] Capa de datos del catálogo + rules por plan + helper de subida a Storage; límites de negocios 1/7
- [x] Pestaña Skills + logo en Información
- [x] Pestaña Menú (productos + imágenes)
- [ ] Pestaña Videos
- [ ] Verificación (typecheck + build); prueba manual del usuario

## Commits
(pendiente)
