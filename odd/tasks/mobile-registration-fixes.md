# ECO — Registro móvil: correo del dispositivo, género, diagnóstico del error de alta

Continuación de mobile-user-accounts. Tres pedidos del usuario sobre
`FirstAccessScreen` (pantalla de registro).

## Specs

- S1 — "App móvil. En la interfaz de registro, toma la cuenta de correo
  electrónico que tiene registrado en el teléfono y presentalo en el campo
  que corresponde a 'Correo'." Decisión confirmada con el usuario: solo
  Android, automático (módulo nativo Kotlin lee cuentas del dispositivo con
  permiso `GET_ACCOUNTS`, precarga el primer email encontrado en el campo
  "Correo", que sigue siendo editable). iOS queda sin esta función.
- S2 — "App móvil. En la interfaz de registro, debe agregar el campo
  'Genero', con los valores: 1: Masculino, 2: Femenino, 3: otro. Este campo
  debe estar tanto en supabase y sqlite." Decisión confirmada: obligatorio
  (mismo patrón de chips que "Rango de edad", debe elegir antes de poder
  continuar).
- S3 — "APP móvil. En la interfaz de registro, Al finalizar el llenado de
  la información y dar elegir: 'continuar' aparece el mensaje 'No se puede
  crear la cuenta. Intente nuevamente', y no proporciona ningún dato para
  que el usuario pueda resolver." Diagnóstico confirmado: el RPC
  `register_mobile_account` funciona correctamente contra el proyecto
  remoto (probado directamente con `@supabase/supabase-js`, misma config
  `db:{schema:'eco'}` que usa la app — ver Log L2). La causa de que el
  usuario no tenga información para resolver es que
  `mapRegisterErrorToSpanish` (apps/mobile/src/services/accountAuth.ts)
  reduce CUALQUIER error no reconocido (incluyendo fallos de red reales,
  ej. `TypeError: fetch failed`) al mismo mensaje genérico sin distinguir
  causa ni loguear detalle.

## Tasks

- [x] T1 — S2: Migración Supabase `0010_mobile_account_gender.sql`: columna
      `gender smallint` (nullable, check `gender is null or gender in (1,2,3)`)
      en `ECO.users`; `register_mobile_account` acepta `p_gender integer`
      obligatorio (valida `in (1,2,3)`, si no raise exception), inserta en
      `gender`. Aplicada al remoto (`supabase db push`).
- [x] T2 — S2: SQLite migración v8 (`db/migrations.ts`):
      `ALTER TABLE ingreso ADD COLUMN gender INTEGER;`. `db/ingreso.ts`:
      `guardarIngreso` acepta `gender`, `obtenerIngreso` lo lee/retorna.
- [x] T3 — S2: `FirstAccessScreen.tsx` — chips "Género" (Masculino=1,
      Femenino=2, Otro=3) estilo "Rango de edad", obligatorio (bloquea
      "Continuar" con mensaje de validación si no hay selección).
      `constants.ts`: nuevo `GENDERS`. `onSubmit` incluye `gender`.
- [x] T4 — S2: `accountAuth.ts` (`registerAccount`/`registerOrLogin`) y
      `App.tsx` (`handlePrimerAccesoCompletado`) propagan `gender` end to
      end hasta `guardarIngreso`.
- [x] T5 — S1: módulo nativo Android (Kotlin, `ReactContextBaseJavaModule`
      plano, sin Expo Modules) que lee cuentas del dispositivo vía
      `AccountManager` con permiso `GET_ACCOUNTS` (declarado en
      `AndroidManifest.xml`, solicitado en runtime); `FirstAccessScreen`
      precarga el primer email encontrado al montar (campo sigue editable,
      sin bloquear si no hay permiso/cuentas). Delegado a worker en
      background. `apps/mobile/android` dejó de estar en `.gitignore`:
      ahora contiene código nativo escrito a mano que `expo prebuild` no
      regeneraría (revierte parcialmente la decisión de
      business-password-removal/03ecf9b, que asumía esa carpeta como
      output descartable). iOS sigue sin trackear.
- [x] T6 — S3: `accountAuth.ts` — `mapRegisterErrorToSpanish` distingue
      fallos de red/conectividad (mensaje accionable: revisar conexión) de
      errores de servidor no reconocidos (loguea detalle técnico con
      `console.error` y lo trunca en el mensaje al usuario, en vez de
      silenciarlo).
- [x] T7 — Verificación: `npm run typecheck --workspaces` (0 errores),
      `export:embed --entry-file index.ts` (misma ruta que usa Gradle, 705
      módulos; `npx expo export --platform android` sin `:embed` falla por
      un bug preexistente y no relacionado de resolución de `AppEntry.js`
      en el monorepo con node_modules hoisteado — no es regresión de este
      cambio, reproducido también contra el código previo), RPC
      `register_mobile_account` probada en remoto con `p_gender`
      válido/inválido/faltante (los 3 casos se comportan como se espera,
      cuentas de prueba borradas después), `gradlew assembleRelease`
      exitoso (compila `EcoAccountsModule.kt` sin errores),
      `assets/index.android.bundle` verificado dentro del APK, copiado a
      `C:\data\data\apk\application-eco.apk`.
- [x] T8 — Docs: cerrar feature, registrar evidencia de build.

## Pendiente

- Prueba manual en dispositivo real: confirmar que el permiso
  `GET_ACCOUNTS` se solicita correctamente y que el campo "Correo" se
  precarga con una cuenta Google real del teléfono (no verificable sin
  dispositivo físico/emulador con cuenta configurada desde esta sesión).

## Log

- L1 (usuario, 2026-11-01, verbatim): "App móvil. En la interfaz de
  registro, toma la cuenta de correo electrónico que tiene registrado en
  el teléfono y presentalo en el campo que corresponde a 'Correo'. / App
  móvil. En la interfaz de registro, debe agregar el campo 'Genero', con
  los valores: 1: Masculino, 2: Femenino, 3: otro. Este campo debe estar
  tanto en supabase y sqlite. / APP móvil. En la interfaz de registro, Al
  finalizar el llenado de la información y dar elegir: 'continuar' aparece
  el mensaje 'No se puede crear la cuenta. Intente nuevamente', y no
  proporciona ningún dato para que el usuario pueda resolver."
- L2 — Diagnóstico de S3: `curl`/`supabase-js` directo contra
  `jtrrqbnxhxxqjcpizjuy.supabase.co` con la misma config que usa la app
  (`db:{schema:'eco'}`, misma anon key) creó cuentas de prueba vía
  `register_mobile_account` sin error (ids `c1d6e6cc…`, `8561679f…`,
  `7591fe40…` en `ECO.users`, emails `test-debug-eco-99{12,13}@example.com`
  y `node-sim-test-eco-771@example.com` — pendiente limpiar antes de
  cerrar la feature). Simulando un fallo real de red (`fetch failed`) se
  confirma que ese caso cae en el mensaje genérico sin información.
- L3 (decisión, usuario, pregunta estructurada 2026-11-01): S1 = "Solo
  Android, automático" (módulo nativo, sin selector). S2 = "Obligatorio".
