# ECO — Web: gestión de usuarios (Administrador) + Activar suscripción

## Spec (odd/spec.md §2)
Listado de usuarios web/escritorio y móviles. Columnas: nombre, apellido, rango de edad,
tipo (1 = web/escritorio, 2 = móvil), correo. Paginación, búsqueda por campo, Crear, Editar, Borrar.
- Borrado: NO físico → estado inactivo; los inactivos no aparecen en el listado principal; confirmación.
- Edición: actualizar información + botón **Activar suscripción**, almacenar fecha de activación,
  enviar correo notificando la activación.
- Interfaz similar a negocios (decisión del usuario). Solo Administrador.

## Decisiones / supuestos
- Navegación: el shell gana un menú "Negocios | Usuarios" (Usuarios solo admin).
- RLS ya permite al admin SELECT/UPDATE en `users` y INSERT/UPDATE en `subscriptions`; no hay
  política INSERT en `users` ni DELETE (soft-delete por UPDATE status='inactive').
- **Crear usuario**: crear una cuenta de Auth requiere la service role (no disponible en el
  navegador). Decisión pendiente: ver tareas.
- **Correo de activación**: requiere servidor (Edge Function + proveedor de correo). Decisión pendiente.

## Tareas
- [x] Capa de datos (listUsers con filtros/paginación, update, soft-delete, activar suscripción)
- [x] Shell con navegación + listado de usuarios
- [x] Edición de usuario + Activar suscripción (+ estado de suscripción)
- [ ] Crear usuario y correo de activación (según decisión)
- [ ] Verificación (typecheck + build); prueba manual

## Commits
(pendiente)
