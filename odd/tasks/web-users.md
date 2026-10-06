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
- [ ] Edge Functions `eco-admin-create-user` y `eco-notify-subscription` (Resend) + docs de despliegue
- [ ] Web: formulario Crear usuario + aviso de activación conectado
- [ ] Verificación (typecheck + build); prueba manual

## Commits
(pendiente)

## Decisiones — crear usuario y correos
- `smart-api` pertenece a **LINGO** (confirmación LOPDP sobre `public.usuarios`, no envía correos):
  NO se reutiliza ni se pisa. ECO usa funciones propias con otro nombre.
- Proveedor de correo: **Resend** (secretos `RESEND_API_KEY`, `MAIL_FROM`, `SITE_URL`).
- `eco-admin-create-user`: valida JWT + claim admin; `auth.admin.generateLink({type:'invite'})` crea la
  cuenta (el trigger crea `eco.users`, type=1) y devuelve el enlace; el correo lo envía la función vía Resend.
- `eco-notify-subscription`: solo recibe `userId`; verifica admin y que la suscripción esté activa en BD;
  destinatario y contenido los fija el servidor (no es un mailer abierto).
- Crear usuario crea cuentas **web/escritorio** (type 1); los móviles (type 2) no tienen cuenta de acceso.
