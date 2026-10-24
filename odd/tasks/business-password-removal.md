# ECO — Eliminar el concepto de password de negocio

## Requerimiento (usuario, 2026-10-24)
"EXISTE UNA SOLA TABLA DE USUARIOS, tanto en SQLite como en Supabase. Bajo
ninguna circunstancia puede existir otra tabla y menos aun un campo
'password' que esté en la tabla business."

## Diagnóstico
`ECO.businesses.password_hash` (agregado en 0006 para un login de negocio
propio) nunca fue leído/comparado por ningún RPC: la autenticación real
pasa íntegramente por `ECO.users.password_hash` + `verify_mobile_password`
(feature mobile-user-accounts). El campo quedó vestigial en dos frentes:
- Esquema: columna + `admin_set_business_password` RPC + parámetro
  `p_password` en `register_mobile_business`/`update_mobile_business`.
- UI viva: `BusinessFormScreen.tsx` (registro de negocio) seguía pidiendo
  Password/Confirmar Password y prometiendo que servirían para administrar
  la cuenta — falso, ya que el acceso real es por cuenta de usuario.

Dos pantallas ya estaban intencionalmente muertas/inalcanzables desde
`App.tsx` por decisión previa registrada en
`odd/tasks/mobile-business-access-roles.md` (no borradas, solo sin punto de
entrada): `BusinessManageScreen.tsx`, `BusinessAdminEditScreen.tsx`. Se
respetó esa decisión: no se borraron ni se reconectaron, solo se les quitó
la lógica de password para que sigan compilando.

## Tareas
- [x] T1 — Migración `0009_remove_business_password.sql`: drop
      `admin_set_business_password`; drop+recrear `register_mobile_business`
      (sin `p_password`, sin insertar `password_hash`); drop+recrear
      `update_mobile_business` (sin `p_password`, sin bloque de reseteo);
      `alter table ECO.businesses drop column if exists password_hash`.
- [x] T2 — `mobileBusinessLogic.ts`: quitar `password`/`confirmPassword` de
      `BusinessFormInput`/`BusinessEditInput`/`BusinessFieldError`; quitar
      `validatePassword` (export); `buildRegisterPayload`/`buildUpdatePayload`
      sin `p_password`.
- [x] T3 — `businessSync.ts`/`db/negocio.ts`: quitar `password` del flujo de
      sync (`register`/`update`) y de la tabla SQLite `negocio`
      (columna `password`, `marcarAltaSincronizada`/`marcarActualizacionSincronizada`).
- [x] T4 — `db/migrations.ts`: migración SQLite v7,
      `ALTER TABLE negocio DROP COLUMN password;`.
- [x] T5 — `BusinessFormScreen.tsx` (vivo): quitar campos Password/Confirmar
      Password y el aviso que los mencionaba.
- [x] T6 — Ajuste mecánico de compilación en `BusinessManageScreen.tsx` /
      `BusinessAdminEditScreen.tsx` (quitar lo relacionado a password, sin
      reconectarlas) y borrar `resetBusinessPasswordAdmin` de
      `adminBusinessApi.ts`.
- [x] T7 — Verificación: `npm run typecheck --workspaces` (0 errores),
      `npx expo export --platform android` (704 módulos, éxito).
- [x] T8 — Aplicar migraciones pendientes en Supabase remoto: `0008`
      (mobile-user-accounts, nunca se había pusheado) + `0009`.

## Decisión de diseño (arquitecto)
Se preguntó y se confirmó con el usuario antes de tocar la pantalla viva de
registro (quitar Password/Confirmar Password de `BusinessFormScreen`), ya
que ampliaba el alcance más allá de la limpieza de esquema originalmente
descrita.

## Commits
- c5f5ffa fix(mobile): remove obsolete per-business password concept

## Verificación
- `npm run typecheck --workspaces`: 0 errores.
- `npx expo export --platform android`: éxito, 704 módulos.
- `npx supabase db push`: aplicó `0008_mobile_accounts.sql` y
  `0009_remove_business_password.sql` contra el proyecto remoto.
- Sin arnés de pruebas en apps/mobile; verificación proporcional vía
  typecheck + export + migración aplicada y confirmada con
  `supabase migration list`.

## Pendiente
- Generar nuevo APK (EAS build) con este fix — a pedido del usuario.
