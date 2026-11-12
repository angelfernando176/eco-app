# Reseteo de contraseña con código por correo (apps/web)

Reemplaza el flujo nativo de Supabase (enlace mágico) en `apps/web/src/auth/AuthScreen.tsx`
por un flujo de código + reingreso de clave, reusando el backend ya desplegado de exxasoft.

## Specs

- S1: "Olvidé mi contraseña" debe enviar un correo electrónico, igual a como funciona
  en `C:\data\data\exxasoft`, es decir en el correo debe enviar un código y luego la
  opción para reingresar la clave.
- S2: El backend a usar es el servicio ya desplegado de exxasoft
  (`https://exxasoft.com/api/reset`), reusando `POST /api/reset/solicitar` y
  `POST /api/reset/confirmar` (ya validan email/código/clave y fijan la clave en
  Supabase vía `service_role`). No se crea backend nuevo en Eco (decisión del
  usuario: opción B2).
- S3: El servidor de exxasoft debe aceptar el origen `https://eco.exxasoft.com`
  (producción) y `http://localhost:5173` (dev) en `ALLOWED_ORIGINS` de
  `C:\data\data\exxasoft\server\.env`.
- S4: La app de Eco (`apps/web`) es el repo `angelfernando176/eco-app`, dominio de
  producción `https://eco.exxasoft.com`, llamada desde `C:\data\data\exxasoft`.

## Tasks

- [x] T1 — S3: editado `C:\data\data\exxasoft\server\.env` (`ALLOWED_ORIGINS`) para
  agregar `https://eco.exxasoft.com` y `http://localhost:5173`. Commit: N/A (repo externo,
  .env no versionado).
- [x] T2 — S1,S2: `apps/web/src/auth/AuthScreen.tsx` — nueva vista `reset` (código +
  nueva clave + confirmación); `handleForgot` llama a `/api/reset/solicitar` en vez de
  `resetPasswordForEmail`; nuevo `handleResetConfirm` llama a `/api/reset/confirmar`.
  Textos actualizados ("código" en vez de "enlace"). `RESET_API_BASE` configurable via
  `VITE_RESET_API_BASE`, default `https://exxasoft.com/api/reset`. `npx tsc --noEmit`
  limpio. Sin commit (usuario no pidió commitear).
- [BLOCKED] T3 — Verificación end-to-end en navegador (ego-browser) contra
  `https://exxasoft.com/api/reset`: `OPTIONS /api/reset/solicitar` y hasta
  `GET /api/salud` devuelven 404/405 en producción. Se detectó que el repo exxasoft
  tenía 3 commits locales sin pushear con la feature de reset (`edf53bd`, `4d73420`) más
  uno previo (`b280b39`); se pushearon a `origin/main` (con autorización explícita del
  usuario) pero 5+ minutos después el servicio seguía sin responder, incluso
  `/api/salud`. No hay `doctl`/`gh` disponibles en esta máquina para revisar
  DigitalOcean App Platform. Esperando que el usuario confirme si el componente
  "Service" (server/, `npm start`, puerto 8080, ruta `/api`) existe y está activo en
  DigitalOcean.

## Log

- L1: Usuario (verbatim): "La opción 'Olvidé mi contraseña'/ 'Enviar enlace' debe
  enviar un correo electronico, igual a como funciona como C:\data\data\exxasoft, es
  decir en el correo debe enviar un codigo y luego la opción para reingresar la clave"
- L2: Usuario eligió opción B2 (reusar servidor externo de exxasoft, no backend nuevo
  en Eco).
- L3: Usuario confirmó dominio de apps/web: `https://eco.exxasoft.com`, repo
  `angelfernando176/eco-app`, llamado desde `C:\data\data\exxasoft`.
- L4: Usuario confirmó URL del API de reset: `https://exxasoft.com/api/reset`.
- L5: Usuario autorizó al agente a editar `C:\data\data\exxasoft\server\.env`
  (`ALLOWED_ORIGINS`) directamente.
