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
- [ ] T2 — Edge Function `eco-mobile-media-upload` (POST subir, DELETE borrar) +
      despliegue y smoke test contra el proyecto real (`jtrrqbnxhxxqjcpizjuy`).
- [ ] T3 — SQLite móvil: migración v3 (`negocio`, estado pendiente de sync) +
      repositorio `db/negocio.ts` + lógica pura de validación/payloads
      (`services/mobileBusinessLogic.ts`) + sincronización
      (`services/businessSync.ts`, integrado a `syncPending`).
- [ ] T4 — UI de alta: bienvenida con Registrar (expande Teléfono/Computadora),
      mapa + botón iniciar registro, formulario de alta con validación de password,
      indicador de progreso y mensaje de recordatorio.
- [ ] T5 — UI "Ver negocio": edición de los mismos campos, Dar de baja con encuesta
      de motivos fijos + comentario, detección en `App.tsx` de negocio local existente
      para decidir Registrar vs Ver negocio.
- [ ] T6 — Gestión de Fotos/Videos/Skills desde "Ver negocio" (solo con suscripción
      activa): selector de imagen/video (`expo-image-picker`), llamada a la Edge
      Function, alta/baja de skills vía RPC, aviso cuando no hay suscripción o no hay
      conexión.
- [ ] T7 — Verificación: typecheck (mobile/web/shared), harness Docker pgTAP,
      `expo export --platform android`, repaso manual de los flujos nuevos (sin
      dispositivo real — se deja explícito como no verificado).

## Commits
- `d75377d` feat(db): add mobile business registration, update, deactivation RPCs (0006)

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
