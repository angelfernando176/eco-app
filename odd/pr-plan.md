# ECO — Plan de Pull Requests (cadena de 6 PR)

> Preparado localmente. **No hay remoto configurado** (`git remote -v` vacío) ni `gh` instalado:
> nada se subió ni se abrió. Para publicar: agregar el remoto, `git push` de cada rama y abrir
> los PR en el orden de abajo con el texto de cada sección.

## Estrategia

Cadena apilada (cada PR apunta a la rama anterior; el primero apunta a `master`). Cada PR es una
entrega cohesiva y se puede revisar y revertir por separado. Todos superan las 400 líneas
(medido sin `package-lock.json`); no se partieron más porque el siguiente corte separaría
código de sus pantallas o de sus pruebas. Al integrar, ir fusionando en orden y retargetear el
siguiente PR a `master`.

| # | Rama | Base | Líneas (sin lockfile) | Archivos |
|---|------|------|----------------------|----------|
| 1 | `feat/authentication` | `master` | +1233 / −70 (+ lockfile ~12k, generado) | 13 |
| 2 | `feat/web-ui-foundation` | `feat/authentication` | +820 / −97 | 14 |
| 3 | `feat/web-businesses` | `feat/web-ui-foundation` | +1991 / −24 | 26 |
| 4 | `feat/web-catalog` | `feat/web-businesses` | +2298 / −19 | 30 |
| 5 | `feat/web-users` | `feat/web-catalog` | +1765 / −10 | 25 |
| 6 | `feat/mobile-app` | `feat/web-users` | +4046 / −181 | 48 |

Total acumulado: ~12k líneas de código y docs. Los commits siguen Conventional Commits.

## Qué no está verificado (aplica a los 5 PR)

- No hay runner de tests JS: la verificación es `typecheck` + `build` de `@eco/web`.
- Los tests pgTAP (`supabase/tests`) no se ejecutaron: el CLI de Supabase no está instalado.
- Las Edge Functions no se chequearon con Deno (no instalado) ni se desplegaron.
- Pruebas manuales contra Supabase real: parciales (login y creación de negocios probados por el
  usuario); catálogo, usuarios y correos **pendientes**.
- Review nativo (RDD) de la autenticación: se cortó por timeout y quedó diferido a este PR.
- Migraciones `0003` y `0004` y los secretos de las funciones: los aplica el usuario a mano.

---

## PR 1 — `feat/authentication` → `master`

**Título:** `feat: authentication, ECO schema and RLS by role`

📍 **1** → 2 → 3 → 4 → 5

**Resumen**
- Esquema `eco` (migraciones `0001`, `0002`) con triggers de límites y RLS por rol; `public` no se toca.
- Cliente Supabase y UI web de login, registro, confirmación y recuperación.
- Onboarding móvil (primer/segundo acceso) con SQLite.

**Fuera de alcance:** estilos, negocios, catálogo, usuarios, sincronización móvil.
**Depende de:** nada. **Sigue:** PR 2.

**Verificación:** typecheck web/mobile/shared y build web OK. pgTAP escrito (`0001`, `0002`), no ejecutado.
**Riesgo:** el diff incluye `package-lock.json` (~12k líneas, generado); revisar solo `package.json`.
**Pendiente:** review RDD (ver arriba).

## PR 2 — `feat/web-ui-foundation` → `feat/authentication`

**Título:** `feat(web): add reusable style system and UI components`

1 → 📍 **2** → 3 → 4 → 5

**Resumen**
- Tokens CSS, base y componentes en `apps/web/src/styles/`; componentes `ui/` reutilizables.
- Refactor de `App.tsx` y `AuthScreen.tsx` sin cambiar la lógica de Supabase.

**Fuera de alcance:** pantallas de negocios y usuarios. **Depende de:** PR 1. **Sigue:** PR 3.
**Verificación:** typecheck + build OK. **Pendiente:** revisión visual en navegador.

## PR 3 — `feat/web-businesses` → `feat/web-ui-foundation`

**Título:** `feat(web): add shell and business management`

1 → 2 → 📍 **3** → 4 → 5

**Resumen**
- Shell autenticado con rol, listado con filtros y paginación, maestro-detalle (pestaña Información).
- Validaciones del formulario y ayuda de coordenadas; límites en un solo archivo.
- Migración `0003`: el Administrador queda exento del límite de negocios.

**Fuera de alcance:** logo, menú, videos, skills, usuarios. **Depende de:** PR 2. **Sigue:** PR 4.
**Verificación:** typecheck + build OK; script descartable de 38 casos de borde de la validación.
**Acción previa:** aplicar `0003` en el SQL Editor.

## PR 4 — `feat/web-catalog` → `feat/web-businesses`

**Título:** `feat: plan limits, storage and catalog tabs (skills, menu, videos, logo)`

1 → 2 → 3 → 📍 **4** → 5

**Resumen**
- Migración `0004`: límites por plan (negocios 1/7, productos 1/7, imágenes 7, videos 2, skills 1/10),
  RLS de productos, bucket `eco-media` y políticas de Storage.
- Capa de datos del catálogo y pestañas Skills, Menú, Videos y logo.
- Reglas de plan en `features/plan/` (fuente única).

**Decisiones a validar:** el dueño edita el precio; principal/secundario solo el Administrador.
**Fuera de alcance:** usuarios, móvil. **Depende de:** PR 3. **Sigue:** PR 5.
**Verificación:** typecheck + build OK; 51 aserciones descartables sobre helpers puros.
**Acción previa:** aplicar `0004`. **No probado** contra Supabase (subidas, RLS de Storage).

## PR 5 — `feat/web-users` → `feat/web-catalog`

**Título:** `feat: user management, subscription activation and email via edge functions`

1 → 2 → 3 → 4 → 📍 **5** → 6

**Resumen**
- Gestión de usuarios (Administrador): listado, edición, borrado lógico y Activar suscripción.
- Edge Functions `eco-admin-create-user` y `eco-notify-subscription`; proveedor de correo
  intercambiable (`EMAIL_PROVIDER`: `smtp` o `resend`).
- Pantalla para definir contraseña (invitación y recuperación).

**Seguridad:** ambas funciones exigen JWT con rol admin; `eco-notify-subscription` toma
destinatario y contenido solo de la base. Ningún secreto está en el repo.
**No tocar:** la función `smart-api` pertenece a otro proyecto (LINGO).
**Fuera de alcance:** móvil (sincronización, ratings, búsqueda con mapa).
**Depende de:** PR 4. **Acción previa:** cargar secretos y desplegar funciones
(`supabase/functions/README.md`). **No probado** de punta a punta (sin Deno ni envío real).

## PR 6 — `feat/mobile-app` → `feat/web-users`

**Título:** `feat(mobile): sync, radius search with map, business detail and ratings`

1 → 2 → 3 → 4 → 5 → 📍 **6**

**Resumen**
- Migración `0005`: RPC `register_mobile_user` y `submit_rating` (anon, validadas en servidor), lectura de ratings
  por RPC sin ids; la tabla `ratings` deja de ser pública (solo admin y dueño).
- App móvil: cliente Supabase, SQLite con migraciones (ingreso, búsquedas, calificaciones), sincronización con cola
  tolerante a fallos, onboarding con sincronización real.
- Búsqueda por ubicación actual, radio 5/10/20/50/100 km, texto sobre nombre y skills, mapa y lista.
- Ficha del negocio: Mapa, Videos, Ranking, Menú, Contacto y Calificar (offline-first).
- Harness Docker (`supabase/tests/harness/run.sh`) y tests pgTAP 0004/0005; corrige 4 tests de `0002` mal escritos.

**Fuera de alcance:** login móvil, notificaciones, una calificación por usuario/negocio (no está en el spec).
**Depende de:** PR 5. **Acción previa:** aplicar `0005`; crear `apps/mobile/.env` con `EXPO_PUBLIC_SUPABASE_URL`,
`EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_ECO_WEB_URL` y `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`.
**Verificación:** typecheck, build web, bundle Android y 79 pruebas de BD OK. **No verificado:** dispositivo/emulador,
Supabase real, mapa/video/ubicación, correos.
**Riesgo conocido:** `register_mobile_user` y `submit_rating` no tienen límite de frecuencia (posible spam).
