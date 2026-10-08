# ECO — Mejoras: skill en alta, búsqueda ampliada, radar, dirección web

## Requerimiento (usuario, 2026-10-07)
1. **App móvil**: entre los campos de alta de negocio (Negocio, Producto principal,
   Precio, Teléfono, RUC, Password) agregar un campo **Skill**.
2. **App móvil**: la búsqueda de negocios debe matchear contra **3 campos**: Producto
   principal, nombre del negocio, skills (ya matcheaba nombre+skills; falta producto).
3. **App móvil**: al tocar "Buscar", mientras se cargan resultados, mostrar una
   **animación de radar**.
4. **Web**: en "Editar negocio", en la fila de Calle principal/Calle secundaria/Número,
   agregar un botón **"Revisar dirección"** que abre Google Maps en las coordenadas
   (lat/lon) y trata de autocompletar Calle principal/Calle secundaria.

## Decisiones del usuario (2026-10-07)
- Skill en el alta: **opcional** (si se deja vacío, no se crea ningún skill; se puede
  agregar después desde "Ver negocio", sujeto al límite de plan igual que hoy).
- Geocodificación inversa para el punto 4: **OpenStreetMap Nominatim**, sin API key
  de Google (gratis, con límite ~1 req/seg, el usuario revisa/corrige el resultado).

## Decisiones de diseño (arquitecto)
- El skill del alta reutiliza la RPC `add_mobile_skill` ya existente (0006); **no se
  crea ninguna migración nueva de Supabase**. Se agrega una migración SQLite local v4
  (`negocio.pending_skill_name`), análoga a como `password` se guarda pendiente de
  sync: `businessSync.ts` primero registra el negocio (`register_mobile_business`) y,
  si hay `pending_skill_name` y el alta tuvo éxito, llama `add_mobile_skill` con el
  `remote_id` recién obtenido; se limpia el campo local solo si la llamada a
  `add_mobile_skill` también tuvo éxito (si falla —p. ej. límite de plan ya alcanzado
  por otra vía—, el negocio queda sincronizado pero el skill queda pendiente para
  reintentar en el próximo `syncPending`, reusando la misma `business_id` ya conocida).
  Solo aplica al alta inicial (no a "Ver negocio"/edición); si el negocio ya tiene
  `remote_id` (edición), el campo no se vuelve a mostrar en ese formulario — eso ya lo
  cubre "Ver negocio" → Skills (T6 de `mobile-business.md`).
- Búsqueda por producto principal: se agrega un tercer `rowSet` en `businessSearch.ts`
  (match por `products.name ilike` + `products.is_primary` o simplemente cualquier
  producto del negocio — a confirmar contra el modelo: "Producto principal" no usa
  `is_primary`, es el primer producto creado: dado que el spec dice "Producto
  principal" explícitamente, filtramos por el producto principal real del negocio
  cuando exista esa noción, y si no, por cualquier producto del negocio que matchee,
  igual al patrón ya usado para skills) reusando `mergeBusinessResults`.
- Animación de radar: componente nuevo `RadarLoading.tsx` con `Animated` de React
  Native (sin librerías nuevas), mostrado en `SearchScreen` cuando `status ===
  'loading'`, reemplazando o acompañando el spinner del botón "Buscar".
- Web "Revisar dirección": botón en la fila de dirección de `BusinessForm.tsx`.
  Al click: (a) abre `https://www.google.com/maps?q={lat},{lon}` en una pestaña nueva;
  (b) llama a Nominatim (`https://nominatim.openstreetmap.org/reverse?lat=&lon=&format=json`,
  con `User-Agent`/`email` de contacto por política de uso de Nominatim) y, si responde
  con `road`/dirección reconocible, precarga `mainStreet` (y `secondaryStreet` si la
  respuesta trae una segunda vía cercana/intersección; si no, se deja como está) sin
  pisar lo que el usuario ya haya escrito manualmente sin confirmar — se muestra el
  resultado propuesto para que el usuario acepte/edite, no se auto-guarda.
- Ningún cambio de esquema Supabase (no hay migración 0007 en este incremento).

## Tareas
- [ ] T1 — Mobile: SQLite v4 (`pending_skill_name`), campo Skill opcional en
      `BusinessFormScreen`, cadena de sync en `businessSync.ts`/`db/negocio.ts`.
- [ ] T2 — Mobile: búsqueda por producto principal (`businessSearch.ts` +
      `businessSearchLogic.ts`), tercer `rowSet`.
- [ ] T3 — Mobile: `RadarLoading.tsx` + integración en `SearchScreen` durante
      `status === 'loading'`.
- [x] T4 — Web: botón "Revisar dirección" en `BusinessForm.tsx` (abre Maps +
      reverse geocoding Nominatim con confirmación manual).
- [ ] T5 — Verificación: typecheck (mobile/web/shared), pgTAP si aplica, `expo export
      --platform android`, build web, repaso funcional de los 4 cambios.
- [ ] T6 — Generar APK actualizado (EAS build) y dejar `apps/web` (dev server)
      lista para pruebas del usuario.

## Commits
(pendiente)

## Verificación

### T4 — Web: botón "Revisar dirección"
- `npm run typecheck --workspace @eco/web`: 0 errores.
- `npm run build --workspace @eco/web`: build exitoso (119 módulos transformados,
  `tsc --noEmit && vite build` sin fallos).
- No existe runner de tests de componentes para `apps/web` en este repo (no hay
  vitest/jest configurado ni script `test` en `apps/web/package.json`); se verificó
  por typecheck + build y repaso manual de la lógica (sin golpear la API real de
  Nominatim desde un test automatizado, ya que es una llamada de red a un tercero
  que el usuario ejercitará manualmente).
(resto pendiente para T1/T2/T3/T5/T6)
