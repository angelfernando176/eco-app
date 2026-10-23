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

## Novedad reportada por el usuario (2026-10-22)
El campo de hora en "Buscar en otro lugar" abría el teclado numérico del
dispositivo, lo que obligaba a tipear "HH:MM" a mano y resultaba poco usable.
Se pidió reemplazarlo por un control táctil: dos cuadros (horas / minutos)
que el usuario pueda deslizar con el dedo hacia arriba/abajo para subir o
bajar el valor.

- [x] T6 — `components/TimeStepperField.tsx`: stepper táctil (PanResponder,
      sin dependencias nuevas) con chevrons ▲/▼ y arrastre vertical para
      horas (0-23) y minutos (0-59); `SearchScreen.tsx` reemplaza el
      `TextField` numérico por este componente, con toggle "Agregar
      hora"/"Quitar hora" dado que el campo sigue siendo opcional.
- [x] T7 — Verificación: `npm run typecheck --workspaces` (0 errores),
      `npx expo export --platform android` (710 módulos, éxito).
- [x] T8 — Generar APK (EAS build) para pruebas del usuario.

### T8 — APK generado (2026-10-22)
- Build EAS `b5aa63b9-23bc-4bde-ad7d-16b198ab78b6` (perfil `preview`, commit
  `4ebeac5`): **FINISHED**. Descargado a
  `C:\data\data\eco\apk\application-eco.apk` (74.86 MB).
  Link directo: https://expo.dev/artifacts/eas/7XKw3bCHYxuDAKhDoEtrCmDzEDoIXgg1450_UrWI6h8.apk

## Bug reportado: negocio fuera de rango + autocompletado nunca aparece (2026-10-22)
El usuario reportó un negocio fuera del radio de búsqueda; investigación descartó
la fórmula de distancia (Haversine en `geo.ts`, corte exacto correcto en
`mergeBusinessResults`). Causa real: en "Buscar en otro lugar" nunca
aparecían sugerencias de Nominatim (siempre `403 Forbidden`, confirmado con
curl: sin User-Agent o con un User-Agent genérico tipo RN/okhttp Nominatim
rechaza la request; `geocoding.ts` tragaba el error en silencio y devolvía
`[]`). Sin sugerencia seleccionada, `lugarSeleccionado` queda `null` y
`handleBuscar` usa el GPS actual como centro en vez de la dirección
escrita — de ahí el negocio "fuera de rango" (el radio se midió desde la
ubicación real del usuario, no desde la dirección tipeada).

- [x] T9 — Fix: agregar header `User-Agent` propio a la request de
      Nominatim en `geocoding.ts` (solución elegida por el usuario hasta
      pasar a producción; alternativa evaluada y pospuesta: migrar a
      Google Places Autocomplete, que no tiene el límite de 1 req/seg
      global de Nominatim pero requiere facturación en Google Cloud y
      cambiar el flujo a sesión Autocomplete+Place Details).
- [x] Verificación: `npm run typecheck --workspaces` (0 errores),
      `npx expo export --platform android` (710 módulos, éxito).

## Commits
- e186e3a feat(mobile): add alternate-location search with autocomplete and optional time
- 4ebeac5 feat(mobile): replace numeric hora field with swipe hour/minute stepper
- b4feaf8 fix(mobile): send User-Agent header on Nominatim geocoding requests

## Verificación
- `npm run typecheck --workspaces`: 0 errores.
- `npx expo export --platform android`: éxito, 704 módulos, bundle 2.47 MB.
- Sin arnés de pruebas en apps/mobile (no hay `.test`/`.spec` ni script
  `test`); RED/GREEN no aplica, verificación proporcional vía typecheck +
  export.
