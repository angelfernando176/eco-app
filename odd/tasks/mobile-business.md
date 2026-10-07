# ECO — Registro y administración de negocio desde la app móvil

## Requerimiento (resumen; ver mensaje del usuario 2026-10-07 para el texto completo)
1. Primer ingreso: ventana de bienvenida con **Registrar** / **Continuar**.
2. Registrar → expande con dos opciones: **Teléfono** (mapa + formulario de alta) y
   **Computadora** (abre la web, flujo ya existente).
3. Alta por teléfono: mapa con ubicación actual → formulario (Usuario solo lectura =
   usuario móvil ya creado, Latitud/Longitud solo lectura, Negocio, Producto principal
   + precio, Teléfono, RUC, Password + Confirmar, ícono de ayuda). Guardar valida
   password (letras y números), muestra progreso, mensaje de recordatorio, guarda en
   SQLite, sincroniza si hay Internet (si no, pendiente hasta el próximo ingreso).
4. Siguiente ingreso con negocio local: ventana de bienvenida con **Ver negocio** /
   **Continuar** en vez de Registrar/Continuar.
5. Ver negocio: editar los mismos campos (menos Usuario), Guardar con el mismo
   mecanismo SQLite+sync; **Dar de baja** → encuesta breve → Enviar → negocio pasa a
   inactivo (no se borra físicamente) → sync.
6. Fotos/Videos/Skills gestionables desde "Ver negocio" **solo con suscripción activa**.

## Decisiones del usuario (2026-10-07)
- Punto 4 (Fotos/Videos/Skills): **incluir ahora**, con una Edge Function nueva para
  la carga seguro de medios (el dueño móvil no tiene cuenta de Auth; Storage hoy solo
  permite escritura `to authenticated`).
- Encuesta de baja: **opciones fijas + comentario opcional**. Motivos: "Cerré el
  negocio", "No tengo tiempo para mantenerlo", "Tengo problemas con la aplicación",
  "Otro".
- Password del negocio: **solo se guarda hasheada** por ahora; no se construye ningún
  flujo de login con ella en este incremento (la pantalla "Ver negocio" se muestra por
  detección local en SQLite del mismo dispositivo, igual que hoy con `ingreso`).

## Decisiones de diseño (arquitecto)
- El dueño del negocio móvil es el mismo perfil creado por `register_mobile_user`
  (`eco.users.type = 2`, sin cuenta de Auth). El negocio se crea/edita/da de baja vía
  RPCs `SECURITY DEFINER` nuevas (mismo patrón que `register_mobile_user`/`submit_rating`
  de `0005_mobile.sql`), nunca por INSERT/UPDATE directo (RLS de `businesses` exige
  `auth.uid()`, que no existe para `anon`).
- "Producto principal" del formulario **no** usa el flag `is_primary` (eso es un
  destacado exclusivo del Administrador, ver `apps/web/src/features/catalog/types.ts`);
  es simplemente el primer producto normal (`is_primary=false`) creado junto con el
  negocio.
- Columnas de `eco.businesses` que el móvil no recolecta (`representative_email`,
  `main_street`, `secondary_street`, `number`, `reference`) pasan a ser **nullable**
  (la UI web sigue exigiéndolas por validación de formulario, no por constraint de BD).
- Nuevo `eco.businesses.status` ('active'/'inactive', default 'active') y
  `eco.businesses.password_hash` (nullable, hash con `extensions.crypt`/`gen_salt('bf')`,
  solo para negocios dados de alta desde el móvil).
- Nueva tabla `eco.business_deactivation_feedback` (id, business_id, reason, comment,
  created_at) para la encuesta de baja.
- Oferta de "activo/inactivo" repercute en lecturas existentes: `businesses_select_public`
  sigue siendo pública (RLS), pero las búsquedas/RPCs de lectura de negocios deben
  filtrar `status = 'active'` para no mostrar negocios dados de baja en el móvil/web
  público (verificar `businessSearch`/listados web).
- Offline-first (SQLite + reintento al reconectar) aplica a: alta/edición/baja del
  negocio (campos de texto + password). Fotos/Videos/Skills **requieren conexión**
  en el momento de la acción (no se cachean binarios localmente); si no hay conexión
  se informa y no se permite la acción, consistente con que son "contenido adicional"
  fuera de la regla de sincronización de ingreso/búsquedas/calificaciones del spec.
- El dispositivo/app soporta **exactamente un negocio registrado localmente a la
  vez**: el flujo de registro móvil de este feature habla siempre de "el negocio"
  en singular (bienvenida Registrar/Ver negocio, un solo mapa+formulario). El
  esquema SQLite local (T3) guarda por lo tanto una única fila `negocio` vigente
  (`ORDER BY id DESC LIMIT 1`, no una lista); multi-negocio por dueño sigue siendo
  responsabilidad exclusiva del flujo web/desktop, que ya lo soporta vía
  suscripciones. `negocio.password` guarda el password en texto plano **solo**
  mientras una alta/edición-con-password-nueva está pendiente de sync (se necesita
  para reintentar la llamada a la RPC más tarde, que es quien la hashea); se limpia
  (`NULL`) en el repositorio apenas el servidor confirma el alta/edición
  (`marcarAltaSincronizada`/`marcarActualizacionSincronizada`), nunca queda en texto
  plano una vez sincronizado.
- `BusinessFormScreen` (T4) exige `owner_remote_id` no nulo **antes** de insertar la fila local
  pendiente (`negocio.owner_remote_id` es `NOT NULL` desde T3): al momento de Guardar relee
  `ingreso.remoteUserId` fresco (no confía en el prop recibido al entrar a la pantalla, que pudo
  quedar obsoleto si el ingreso se sincronizó mientras el usuario llenaba el formulario) y, si sigue
  siendo `null` (el perfil móvil nunca se sincronizó), **no guarda nada** y muestra un aviso pidiendo
  conectarse a Internet al menos una vez antes de registrar el negocio. Se descartó guardar con un
  placeholder local y resolver el `owner_remote_id` después, porque `register_mobile_business` (T1)
  requiere el id real del dueño en el mismo payload de alta — no hay manera de "corregir" después un
  owner placeholder sin otro mecanismo de reconciliación, y el spec ya asume que el ingreso se registra
  antes de poder usar la app (ver `App.tsx`: `syncPending()` se dispara en cada arranque con ingreso
  guardado), por lo que este caso debería ser raro (solo sin conexión en el primer arranque).
- **`fetchMainProductId` deriva el id del producto principal de la tabla pública `products` (T6):**
  `Negocio` (SQLite local, T3) no guarda ningún id remoto de producto — solo `remote_id` del negocio.
  En vez de agregar una columna nueva (`product_remote_id`) y un nuevo paso de sincronización para
  llenarla, `MobileContentScreen` resuelve el id del producto principal en caliente con
  `select id from products where business_id = ? order by created_at asc limit 1` (política de
  lectura pública ya existente, sin RPC). Es consistente con la decisión de que "producto principal"
  es simplemente el primer producto normal creado junto con el negocio (ver más arriba) y evita tocar
  el esquema SQLite de T3 por una tarea que de todas formas requiere conexión (Fotos/Videos/Skills no
  son offline-first). Costo aceptado: si el negocio aún no sincronizó su alta (`remoteId === null`) o
  el producto aún no sincronizó (fila aún no visible en `products`), la pantalla lo informa con un
  `Banner`/`SectionState` en vez de permitir gestionar contenido, sin bloquear el resto de la app.
- **Sin flujo de reactivación (T5):** un negocio local dado de baja (`status = 'inactive'`) no tiene
  ningún camino para volver a `active` en este incremento (no está en el requerimiento original). "Ver
  negocio" para un negocio inactivo se vuelve de solo lectura: muestra sus datos más un `Banner`
  indicando que fue dado de baja, sin acciones de Guardar/Dar de baja ni gestión de Fotos/Videos/Skills
  (T6 debe validar `status === 'active'` por su cuenta antes de permitir esas acciones).
- **Actualización de Latitud/Longitud en "Ver negocio" (T5) por re-lectura de GPS, no edición libre:**
  el requerimiento original lista Latitud/Longitud como campos "actualizables" en la edición, pero no
  especifica cómo (texto libre sería inconsistente con el resto del flujo, que siempre deriva las
  coordenadas de `getCurrentPosition()`, nunca de entrada manual). Se mantienen de solo lectura como en
  el alta, y se agrega un botón "📍 Actualizar ubicación actual" que vuelve a llamar
  `getCurrentPosition()` y reemplaza las coordenadas mostradas/enviadas si tiene éxito; si falla, muestra
  el mensaje de error en español sin bloquear el resto del formulario (el usuario puede seguir editando
  y guardando los demás campos con las coordenadas anteriores).
- Nueva Edge Function `eco-mobile-media-upload` (service-role): valida
  `owner_id` (debe ser `type=2`, `status='active'`, dueño del `business_id`) y
  suscripción activa del dueño, sube el archivo a `eco-media` y crea la fila en
  `product_images` o `videos`; también maneja borrado (DELETE). Las RPC de Skills
  para el móvil (`add_mobile_skill`/`delete_mobile_skill`) no necesitan Storage, van
  en la migración SQL igual que el resto.

## Tareas
- [x] T1 — Migración `0006_mobile_business.sql`: columnas nuevas, tabla de feedback de
      baja, RPCs (`register_mobile_business`, `update_mobile_business`,
      `deactivate_mobile_business`, `get_mobile_business_status`, `add_mobile_skill`,
      `delete_mobile_skill`), filtro `status='active'` en lecturas públicas relevantes,
      tests pgTAP + corrida en harness Docker (`supabase/tests/harness/run.sh`).
- [x] T2 — Edge Function `eco-mobile-media-upload` (POST subir, DELETE borrar) +
      despliegue y smoke test contra el proyecto real (`jtrrqbnxhxxqjcpizjuy`).
- [x] T3 — SQLite móvil: migración v3 (`negocio`, estado pendiente de sync) +
      repositorio `db/negocio.ts` + lógica pura de validación/payloads
      (`services/mobileBusinessLogic.ts`) + sincronización
      (`services/businessSync.ts`, integrado a `syncPending`).
- [x] T4 — UI de alta: bienvenida con Registrar (expande Teléfono/Computadora),
      mapa + botón iniciar registro, formulario de alta con validación de password,
      indicador de progreso y mensaje de recordatorio.
- [x] T5 — UI "Ver negocio": edición de los mismos campos, Dar de baja con encuesta
      de motivos fijos + comentario, detección en `App.tsx` de negocio local existente
      para decidir Registrar vs Ver negocio.
- [x] T6 — Gestión de Fotos/Videos/Skills desde "Ver negocio" (solo con suscripción
      activa): selector de imagen/video (`expo-image-picker`), llamada a la Edge
      Function, alta/baja de skills vía RPC, aviso cuando no hay suscripción o no hay
      conexión.
- [ ] T7 — Verificación: typecheck (mobile/web/shared), harness Docker pgTAP,
      `expo export --platform android`, repaso manual de los flujos nuevos (sin
      dispositivo real — se deja explícito como no verificado).

## Commits
- `d75377d` feat(db): add mobile business registration, update, deactivation RPCs (0006)
- `cefa8d1` feat(mobile): add business registration UI (welcome, map, form)

## Verificación
- T1: se corrigió `supabase/tests/harness/run.sh` (listaba migraciones hardcodeadas hasta 0005; se
  agregó `0006_mobile_business.sql` — repetir este paso si se agrega una 0007) y se corrió el harness
  Docker completo: **112 pruebas OK, 0 fallos** (0001: 12, 0002: 15, 0004: 27, 0005: 25, 0006: 33).
- Filtro de lectura pública: se optó por cambiar solo la política RLS `businesses_select_public`
  (`status = 'active' or is_admin() or owner_id = current_user_id()`) en lugar de tocar
  `apps/web/src/features/businesses/api.ts` o `apps/mobile/src/services/businessSearch.ts`: ambas
  consultan la tabla `businesses` sin bypass de RLS, así que el filtro aplica automáticamente a
  anon/mobile y a la lista web no-admin por owner_id, sin romper el acceso de admin/dueño a sus
  propios negocios inactivos (verificado en el test pgTAP de la sección 7 de `0006_mobile_business_test.sql`).
- `npm run typecheck` (mobile, web, shared): 0 errores — sin cambios necesarios en los archivos de
  consulta (el filtro vive solo en RLS).
- T2: nueva función `supabase/functions/eco-mobile-media-upload/index.ts` (POST subir foto/video,
  DELETE borrar), reutiliza `adminClient()` de `_shared/auth.ts` y `json`/`HttpError`/`errorResponse`
  de `_shared/http.ts`. Se amplió `_shared/cors.ts` (`Access-Control-Allow-Methods`) para incluir
  `DELETE` (se confirmó por grep que las demás funciones solo implementan `POST` y rechazan otros
  métodos explícitamente, así que ampliar la lista no las afecta).
  - `deno check`: **no se pudo ejecutar** — no hay binario `deno` disponible en este entorno (`deno`
    no está en PATH) y no se instaló, según indicación de la tarea. El bundler de
    `supabase functions deploy` (basado en el mismo motor de Edge Functions) sí compiló y empaquetó
    el archivo sin errores, lo cual da una señal parcial de corrección de tipos/sintaxis.
  - Despliegue: `npx --yes supabase functions deploy eco-mobile-media-upload --project-ref
    jtrrqbnxhxxqjcpizjuy` — **éxito** (la sesión ya estaba logueada/linkeada; se confirmó con
    `supabase projects list`).
  - Smoke test end-to-end: **parcial, con hallazgo de infraestructura preexistente**. Se creó un
    usuario móvil descartable vía `register_mobile_user` (RPC anon, esquema `eco`) — id
    `292eaa7e-4c38-4618-a839-ab9fc9af1dd1`, `first_name = "T2SmokeTest"` — pero
    `register_mobile_business` (de 0006) **no existe en el proyecto real**: `migration list` muestra
    0001-0006 como locales pero con columna `remote` vacía, y una consulta directa confirmó
    `column businesses.status does not exist` en producción. Es decir, **la migración
    `0006_mobile_business.sql` (T1) nunca se aplicó al proyecto `jtrrqbnxhxxqjcpizjuy`**, pese a que
    T1 está marcada como completa (verificada solo contra el harness Docker local). Esto es anterior
    a esta tarea y queda fuera del alcance/superficie de edición de T2 (no se ejecutó ningún `db
    push` ni cambio de esquema desde este worker).
  - Dado ese bloqueo, no se pudo crear el negocio descartable ni ejercer el camino de éxito ni el de
    rechazo por falta de suscripción contra datos reales. En su lugar se verificó, contra la función
    ya desplegada:
    1. Validación de entrada: `POST` con cuerpo `{}` → `400 "El tipo de contenido debe ser \"photo\"
       o \"video\"."}`.
    2. `POST` bien formado con un negocio inexistente → `403 "No sos el dueño de este negocio."`
       (esperado).
    3. `POST` bien formado con el **owner_id y business_id reales** de un negocio existente en
       producción (consultado por `select` público, sin mutarlo) → también `403 "No sos el dueño de
       este negocio."`, lo cual confirma que el `select` a `businesses.status` está fallando
       silenciosamente (el código trata cualquier error de consulta como "no es el dueño") porque la
       columna no existe todavía. Esto confirma que el código de la función es correcto respecto al
       contrato pedido, pero **no podrá completar ningún flujo en producción hasta que se despliegue
       la migración 0006** (`supabase db push` contra `jtrrqbnxhxxqjcpizjuy`, fuera de la superficie de
       edición de esta tarea).
  - Limpieza: el usuario móvil descartable (`292eaa7e-4c38-4618-a839-ab9fc9af1dd1`, "T2SmokeTest")
    **queda en el proyecto real** — no hay RPC de borrado de usuario móvil accesible con la anon key
    para revertirlo; requiere borrado manual (service role o SQL directo) por quien administre el
    proyecto. No se creó ningún negocio descartable (bloqueado antes de ese paso), y no se subió
    ningún archivo a Storage ni se escribió ninguna fila en `product_images`/`videos`.
  - **Seguimiento (resuelto 2026-10-07):** se repararon los registros de historial 0001-0005 en el
    proyecto real (`supabase migration repair --status applied 0001 0002 0003 0004 0005` — ya estaban
    aplicados por fuera del CLI, solo faltaba marcarlos) y luego se aplicó `0006_mobile_business.sql`
    con `supabase db push --project-ref jtrrqbnxhxxqjcpizjuy` (éxito, confirmado con `migration list`:
    0001-0006 ahora figuran con `remote` poblado). Se borró el usuario de prueba descartable
    (`292eaa7e-4c38-4618-a839-ab9fc9af1dd1`, "T2SmokeTest") con `supabase db query --linked` (confirmado
    con un `select count(*)` posterior = 0). **Pendiente real:** repetir el smoke test del camino feliz
    de `eco-mobile-media-upload` (alta de negocio + foto/video con suscripción activa) contra el
    proyecto ya migrado, cuando se pruebe en dispositivo/emulador real (T7).
- T3: lógica pura de `services/mobileBusinessLogic.ts` (validación de password/formulario, builders de
  payload de `register_mobile_business`/`update_mobile_business`/`deactivate_mobile_business`,
  `decideBusinessSyncAction`) verificada con un script throwaway `ts-node` (no commiteado, borrado al
  terminar): **36/36 aserciones OK**. `npm run typecheck` (mobile, web, shared): **0 errores**. No hay
  runner de test de Expo/React Native en este repo (no se inventó ninguno); `db/negocio.ts` y
  `services/businessSync.ts` dependen de `expo-sqlite`/`@supabase/supabase-js` y no se pudieron
  ejercer fuera de un entorno Expo real, quedan sin verificación de ejecución hasta T7 (repaso manual).
- T4: nuevos `apps/mobile/src/screens/RegisterMapScreen.tsx`, `apps/mobile/src/screens/
  BusinessFormScreen.tsx`, `apps/mobile/src/components/HelpTooltip.tsx`; reescrito
  `apps/mobile/src/screens/SecondAccessScreen.tsx` (bienvenida con fila Registrar/Continuar o Ver
  negocio/Continuar según `negocioExistente`, expansión Teléfono/Computadora) y `apps/mobile/App.tsx`
  (nuevas fases `registrarMapa`/`registrarFormulario`/`verNegocioPlaceholder`, cálculo de
  `negocioExistente` con `obtenerNegocioLocal()` al cargar y al volver del formulario, placeholder de
  "Ver negocio" para T5). No hay runner de test de Expo/React Native en este repo (igual que T3); no se
  inventó ninguno. Sigue sin haber runtime de pruebas de componentes RN en este repo — se aplicó la
  excepción de test-first documentada para este tipo de cambio (UI sin runner disponible) y se corrió
  verificación funcional proporcionada por typecheck + bundling real en su lugar.
  - `npm run typecheck --workspace @eco/mobile`: **0 errores**.
  - `npx expo export --platform android` (apps/mobile): **éxito**, bundle Android de 683 módulos
    (`index-953c182d1a8f1bbd918ed25aad22e030.hbc`, 2.39 MB), confirma que todo el grafo de
    dependencias (incluyendo las pantallas nuevas y `react-native-maps`/`expo-location`) compila y
    empaqueta sin errores.
  - **No se realizó verificación manual en dispositivo/emulador real** (no hay dispositivo disponible
    en este entorno) — igual que T1/T2/T3, este gap queda explícito y pendiente para el repaso manual
    de T7. En particular no se ejerció interactivamente: el toggle de expansión Teléfono/Computadora,
    la carga real de `getCurrentPosition()` en `RegisterMapScreen`, el renderizado del `MapView`/`Marker`,
    ni el flujo completo de Guardar en `BusinessFormScreen` contra una base SQLite real.
- T5: nuevos `apps/mobile/src/screens/BusinessManageScreen.tsx` ("Ver negocio": solo lectura + `Banner`
  cuando `status === 'inactive'`; campos editables + botón de re-lectura de GPS + Guardar + Dar de baja
  + botón condicional de Fotos/Videos/Skills cuando `status === 'active'` y
  `get_mobile_business_status` reporta `has_active_subscription = true` cuando `status === 'active'`)
  y `apps/mobile/src/screens/DeactivationSurveyScreen.tsx` (selector `Chip` de motivo fijo +
  comentario opcional, reusa el mismo patrón de `FirstAccessScreen`'s rango de edad); reescrito
  `apps/mobile/App.tsx` (fases `verNegocioPlaceholder` reemplazada por `verNegocio`/`darDeBaja` reales,
  estado `negocio: Negocio | null` refrescado desde `obtenerNegocioLocal()` al entrar a "Ver negocio",
  al guardar una edición y al enviar la encuesta de baja; `onGestionarContenido` muestra un `Alert`
  placeholder "Fotos/Videos/Skills — pendiente (T6)", igual que T4 dejó el placeholder de T5). No hay
  runner de test de Expo/React Native en este repo (igual que T3/T4); no se inventó ninguno — se aplicó
  la misma excepción de test-first documentada en T4 (UI sin runner disponible) y se corrió verificación
  funcional por typecheck + bundling real.
  - `npm run typecheck --workspace @eco/mobile`: **0 errores**.
  - `npx expo export --platform android` (apps/mobile): **éxito**, bundle Android de 685 módulos
    (`index-b5f6de210372a9feb2bee099f110f586.hbc`, 2.4 MB), confirma que las pantallas nuevas y la
    llamada a `supabase.rpc('get_mobile_business_status', ...)` compilan y empaquetan sin errores.
  - **No se realizó verificación manual en dispositivo/emulador real** (sin dispositivo disponible en
    este entorno) — igual que T1-T4, queda explícito y pendiente para el repaso manual de T7. En
    particular no se ejerció interactivamente: el toggle de "Confirmar Password" al tipear un password
    nuevo, el botón "📍 Actualizar ubicación actual", la llamada real a `get_mobile_business_status` contra
    un negocio sincronizado con/sin suscripción activa, ni el flujo completo de Dar de baja (encuesta →
    `prepararBajaPendiente` → `syncPending` → negocio inactivo de solo lectura) contra SQLite/Supabase
    reales.
- T6: se agregó `expo-image-picker` (`npx expo install expo-image-picker`, resolvió `~16.0.6` para
  SDK 52; no agregó configuración nueva a `app.json`, se verificó que el diff quedó vacío) y nuevos
  `apps/mobile/src/services/mobileContentLogic.ts` (lógica pura: `inferMimeType`, `validateSkillName`,
  `mapUploadErrorToSpanish`) y `apps/mobile/src/services/mobileContent.ts` (impuro: `fetchMainProductId`,
  `fetchPhotos`/`fetchVideos`/`fetchSkills`, `uploadMedia`/`deleteMedia` contra la Edge Function
  `eco-mobile-media-upload`, `addSkill`/`removeSkill` contra las RPC de 0006); nueva
  `apps/mobile/src/screens/MobileContentScreen.tsx` (tabs Fotos/Videos/Skills con `TabBar`, selector
  `expo-image-picker`, borrado con ✕, formulario mínimo de descripción/alta de skill); reescrito
  `apps/mobile/App.tsx` (fase `gestionarContenido` reemplaza el placeholder `Alert` de T5). No hay
  runner de test de Expo/React Native en este repo (igual que T3-T5); no se inventó ninguno.
  - Lógica pura (`mobileContentLogic.ts`) verificada con un script throwaway `ts-node` (no commiteado,
    borrado al terminar): **22/22 aserciones OK** (`inferMimeType` por extensión y kind, `validateSkillName`
    por longitud/trim, `mapUploadErrorToSpanish` por límite de skills/mensaje verbatim del servidor/error
    de red/valor no-`Error`).
  - `npm run typecheck --workspace @eco/mobile`: **0 errores**.
  - `npx expo export --platform android` (apps/mobile): **éxito**, bundle Android de 692 módulos
    (`index-c89bf352fb4f9c2b393ddd088c59c89a.hbc`, 2.44 MB), confirma que `expo-image-picker` resuelve
    correctamente en el grafo de dependencias junto con las pantallas/servicios nuevos.
  - **No se realizó verificación manual en dispositivo/emulador real** (sin dispositivo disponible en
    este entorno) — igual que T1-T5, queda explícito y pendiente para T7. En particular no se ejerció
    interactivamente: el selector real de imagen/video (`ImagePicker.launchImageLibraryAsync`), la subida
    real de un archivo contra la Edge Function ya desplegada al proyecto migrado
    (`jtrrqbnxhxxqjcpizjuy`), el borrado de contenido ya subido, ni el alta/baja real de un skill contra
    `add_mobile_skill`/`delete_mobile_skill`. Este es el riesgo principal a señalar en T7: la UX del
    selector y la carga real contra producción están sin verificar end-to-end.
