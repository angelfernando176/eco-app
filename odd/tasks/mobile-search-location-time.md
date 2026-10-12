# ECO móvil — Buscar en otro lugar + hora (pantalla de búsqueda)

## Requerimiento (usuario, 2026-10-12)
En la pantalla de búsqueda ("qué deseas buscar"), sin tocar nada más de esa
pantalla, agregar:
- Botón "Buscar en otro lugar" en la misma línea que "Buscar".
- Al tocarlo, aparece:
  - Label "Dónde deseas buscar (ciudad, calle principal, calle secundaria):"
    + cuadro de texto con autocompletado de ciudades/calles mientras escribe.
  - Label "En qué momento deseas buscar (Ej: 7:30, 15:50):" + ícono de ayuda
    (?) con el texto "Busca la disponibilidad de un producto/servicio en una
    hora determinada". Cuadro de ingreso de hora, opcional, solo permite una
    hora posterior a la actual. Este dato es para uso futuro de disponibilidad
    por horario (no filtra resultados todavía).

## Decisión de diseño (arquitecto)
- Autocompletado de lugar: nuevo `services/geocoding.ts` que llama a
  `https://nominatim.openstreetmap.org/search` (forward geocoding, mismo
  proveedor ya usado en reverse geocoding en `apps/web`), debounced
  (300-400ms), devuelve hasta 5 sugerencias `{ label, lat, lon }`.
- Al elegir una sugerencia, esa coordenada se usa como centro de búsqueda en
  `handleBuscar` en lugar de `getCurrentPosition()`; si el usuario no elige
  ninguna, la búsqueda sigue usando el GPS como hoy.
- Hora: `TextField` con máscara simple `HH:MM`, validado client-side contra
  la hora actual del dispositivo (debe ser estrictamente posterior); se
  guarda junto con la búsqueda en `guardarBusqueda` (columna nueva opcional)
  para uso futuro, sin alterar `searchBusinesses` todavía (fuera de alcance:
  filtrar por disponibilidad horaria real).
- No se modifica ningún otro elemento de `SearchScreen` fuera de lo pedido.

## Tareas
- [x] T1 — `services/geocoding.ts`: autocompletado forward vía Nominatim,
      debounced, con manejo de error silencioso (no autocompleta si falla).
- [x] T2 — `SearchScreen.tsx`: botón "Buscar en otro lugar" en la fila de
      "Buscar"; panel expandible con el campo de lugar (autocompletado) y el
      campo de hora opcional + `HelpTooltip`.
- [x] T3 — Validación de hora (posterior a la actual) y wiring: coordenada
      elegida sustituye al GPS en `handleBuscar`; persistencia de hora
      ingresada junto a la búsqueda (migración SQLite local si aplica).
- [x] T4 — Verificación: `npm run typecheck --workspaces`,
      `npx expo export --platform android`.
- [x] T5 — Generar APK (EAS build) para pruebas del usuario.

### T5 — APK generado (2026-10-12)
- Build EAS `8760ddc0-eefb-4ab2-a563-6d64efe92e38` (perfil `preview`, commit
  `e186e3a`): **FINISHED**. Descargado a
  `C:\data\data\eco\apk\application-eco.apk` (74.86 MB).
  Link directo: https://expo.dev/artifacts/eas/aV9wfCM1r0AFGCrpjQj1vH2reBjOzUjE3ki05NakqIM.apk

## Commits
- e186e3a feat(mobile): add alternate-location search with autocomplete and optional time

## Verificación
- `npm run typecheck --workspaces`: 0 errores.
- `npx expo export --platform android`: éxito, 704 módulos, bundle 2.47 MB.
- Sin arnés de pruebas en apps/mobile (no hay `.test`/`.spec` ni script
  `test`); RED/GREEN no aplica, verificación proporcional vía typecheck +
  export.
