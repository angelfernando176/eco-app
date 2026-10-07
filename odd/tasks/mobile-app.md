# ECO — App móvil: sincronización, búsqueda con mapa, ficha del negocio y calificaciones

## Spec (odd/spec.md §4, §5, §6)
- Primer acceso: nombre + rango de edad. Segundo: "Bienvenido a ECO…" + Registrar (abre la web) / Continuar (sincroniza info local).
- Búsqueda de negocios con radio 5/10/20/50/100 km desde la ubicación actual; resultados en mapa.
- Popup del negocio: Google Maps (coordenadas), Videos (reproducir), Ranking (calificaciones/comentarios), Menú
  (productos/imágenes/precios), Contacto (nombre comercial y datos), Calificar (calificación + comentario).
- SQLite local: ingreso, búsquedas, calificaciones, reseñas; sincronización posterior a Supabase.
- Usuario móvil: solo consulta negocios y registra calificaciones/reseñas.

## Decisiones de diseño
- El usuario móvil **no tiene cuenta de Auth**: opera como `anon`. Las escrituras pasan por RPC
  `SECURITY DEFINER` en `eco` (migración `0005_mobile.sql`): `register_mobile_user` y `submit_rating`.
  El `uuid` del perfil móvil actúa como credencial del dispositivo (no se expone en ninguna lectura).
- Por eso la lectura de `ratings` deja de ser pública: se reemplaza por RPC `list_business_ratings`
  (rating, comentario, fecha y nombre; sin ids) + `business_rating_summary`. Admin y dueño siguen leyendo la tabla.
- Búsqueda: caja delimitadora (lat/lon) en SQL + distancia Haversine en el cliente; texto sobre nombre comercial y skills.
- Las búsquedas viven solo en SQLite (Supabase no tiene tabla de búsquedas en el spec).
- Mapa: `react-native-maps` (Google Maps en Android); clave `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`. Videos: `expo-video`.
- Config por `EXPO_PUBLIC_*` (`.env` lo crea el usuario; la política bloquea escribir `.env`).
- Fuera de alcance: login móvil, push, edición de negocios desde el móvil, una calificación por usuario/negocio (no está en el spec).

## Tareas
- [x] Migración `0005_mobile.sql` + tests pgTAP + prueba real en Postgres (Docker)
- [x] Base móvil: dependencias, cliente Supabase, SQLite (ingreso/búsquedas/calificaciones), sincronización, tema
- [x] Onboarding con sincronización real (Continuar) y reintentos
- [x] Búsqueda: ubicación, radio, texto, mapa y lista de resultados
- [x] Ficha del negocio (Mapa, Videos, Ranking, Menú, Contacto, Calificar)
- [x] Verificación: typecheck, bundle de Expo, pruebas de lógica pura y de BD

## Commits
(pendiente)

## Verificación de base de datos (Docker, `supabase/tests/harness/run.sh`)
- Postgres 16 descartable + pgTAP + stubs de Supabase (roles, auth, storage); aplica 0001–0005 y corre todos los tests.
- Resultado: **79 pruebas OK, 0 fallos** (0001: 12, 0002: 15, 0004: 27, 0005: 25).
- Hallazgo: los tests 8, 10, 11 y 13 de `0002` estaban mal escritos (nunca se habían ejecutado): RLS ocultaba
  la fila ajena al `SELECT` del `INSERT…SELECT`, `DELETE` sin política filtra en vez de lanzar error, el trigger de
  límite corre antes que RLS, y el test 11 contradecía la regla de plan de `0004`. Se corrigieron los tests; las políticas no tenían defecto.
- Riesgo conocido: `register_mobile_user` y `submit_rating` son invocables por `anon` sin límite de frecuencia (spam posible).

## Verificación final (ejecutada)
- `npm run typecheck` (mobile, web, shared): 0 errores. `npm run build --workspace @eco/web`: OK.
- `expo export --platform android`: bundle OK (677 módulos).
- Base de datos en Docker: 79 pruebas OK, 0 fallos (0001, 0002, 0004, 0005).
- Lógica pura (throwaway tsx): geo 22/22, sync 27/27 (+6 de rechazo permanente), detalle 20/20.
- Barrido de secretos en el repo: sin credenciales.
- **No verificado:** ejecución en dispositivo/emulador; consultas reales a Supabase (búsqueda por caja delimitadora,
  skills, RPC de ranking); mapa, video y ubicación reales; envío de correos; Edge Functions con Deno.

## Commits
- `7e59469` tracker · `b1a289c` migración 0005 + harness Docker · `d4097a5` base móvil + sync
- `737bf8d` búsqueda con mapa · `c73c688` ficha del negocio
- (pendiente) fix(mobile): pin kotlinVersion via expo-build-properties for EAS build

## Build Android (EAS, ejecutado)
- Infra confirmada contra el proyecto real `jtrrqbnxhxxqjcpizjuy`: migraciones `0001`-`0005` aplicadas en la nube,
  Edge Functions `eco-admin-create-user`/`eco-notify-subscription` `ACTIVE`, secretos SMTP/Resend cargados.
- `apps/mobile/.env` creado por el usuario (Supabase URL/anon key, `EXPO_PUBLIC_ECO_WEB_URL=http://localhost:5173`,
  Google Maps API key). **No se commitea** (gitignored).
- EAS: cuenta `angelfernando176`, proyecto `@angelfernando176/eco` inicializado (`app.json` → `extra.eas.projectId`).
- `apps/mobile/eas.json`: perfil `preview`, `distribution: internal`, `android.buildType: apk`, `environment: production`.
- **Gotcha crítico**: EAS Build respeta `.gitignore` al armar el archive subido a la nube → el `.env` local **no llega**
  al builder. Las 4 variables `EXPO_PUBLIC_*` se cargaron directo en EAS (`eas env:create`, environment `production`)
  para que se embeban en el bundle en build time.
- **Fallo 1** (`0b41d150`): `EAS_BUILD_UNKNOWN_GRADLE_ERROR` — `expo-modules-core:compileReleaseKotlin FAILED`:
  "Compose Compiler 1.5.15 requires Kotlin 1.9.25 but found 1.9.24". Preexistente en el proyecto, no causado por
  la configuración de build.
- **Fix**: agregada dependencia `expo-build-properties` + plugin en `app.json` fijando `android.kotlinVersion: "1.9.25"`.
- **Build 2** (`f2b316ca-1611-4494-81f6-7b92effa66d8`): **finished** en ~8 min.
  APK: https://expo.dev/artifacts/eas/WP-Pl-FtBMvD5W-4n5jO6QGqQnKk9j5jVPGLLRwl9R4.apk
- Avisos no bloqueantes de `expo-doctor` (no resueltos): `expo-sqlite@15.0.6` (esperada `~15.1.4`),
  `react-native@0.76.5` (esperada `0.76.9`).
- **Sigue pendiente**: prueba en dispositivo/emulador real; `EXPO_PUBLIC_ECO_WEB_URL` apunta a `localhost`,
  no es alcanzable desde un dispositivo físico en otra red.
