# ECO — Pulido UI: pantalla de resultados de búsqueda y detalle de negocio (móvil)

## Requerimiento (usuario, 2026-10-08, sobre SearchScreen y BusinessDetailScreen)
1. Nombre de la app "ECO": correcto, sin cambios.
2. El saludo debe ir a la **derecha del nombre ECO, en la misma línea**.
3. Label "Nombre o palabra clave" → **"Tu búsqueda:"**.
4. "Radio de búsqueda" debe ser un **select/rodillo compacto** (no chips que ocupan
   mucho espacio).
5. "Tu búsqueda" y "Radio de búsqueda" deben estar **en una sola línea** (dos columnas).
6. El mapa de resultados es muy chico → **agrandarlo**.
7. Listado de negocios encontrados, una línea por negocio: **Nombre (20 car.) | Teléfono
   (10 car.) | Distancia (7 car., ej. "55.87km")**, estéticamente prolijo.
8. Pantalla de detalle de negocio (tabs Mapa/Videos/Ranking/Menú/Contacto/Calificar):
   - Header: "Volver" → **flecha**, ubicada a la **derecha**. A la **izquierda** el
     nombre de la app **ECO**. En el **centro**, el nombre del negocio (letra más chica).
   - Los tabs en forma de "cilindro" ocupan demasiado espacio y no son profesionales →
     **rediseñar** a una barra de tabs compacta/profesional.
   - El botón debajo del mapa (tab Mapa, "Cómo llegar") **no se ve** → bug a corregir.

## Decisiones de diseño (arquitecto)
- Selector de radio: se agrega la dependencia `@react-native-picker/picker` (vía
  `npx expo install @react-native-picker/picker`, compatible con Expo/SDK 52) — nativo,
  dropdown compacto en Android (abre un diálogo nativo, no ocupa espacio en pantalla),
  "rodillo" (wheel) en iOS. Reemplaza los `Chip` de `RADIUS_OPTIONS_KM`.
- Fila "Tu búsqueda" + "Radio": `View` con `flexDirection: 'row'`, el campo de texto
  toma el espacio flexible (`flex: 1`) y el picker un ancho fijo chico al lado.
- Mapa de resultados: se aumenta la altura fija (260 → 360) dentro del mismo patrón
  existente (no se convierte en mapa de pantalla completa, para no romper el scroll del
  listado debajo).
- Fila de resultado: `flexDirection: 'row'`, tres `Text` con `numberOfLines={1}` y
  `ellipsizeMode="tail"`; nombre `flex: 2` (trunca visualmente en ~20 caracteres vía
  ancho, no se corta el string — React Native no soporta cortar a N caracteres exactos
  de forma fiable sin medir texto; se usa truncamiento visual por ancho con elipsis en
  vez de recortar el string a 20 chars exactos, que es la forma idiomática en RN de
  cumplir "una sola línea, estéticamente correcta" sin textos pisados), teléfono
  `flex: 1`, distancia `width` fijo con `textAlign: 'right'` (formato ya provisto por
  `formatDistance`, que devuelve p.ej. "55.87km" cuando corresponde al rango de 7
  caracteres).
- Header de `BusinessDetailScreen`: `flexDirection: 'row'`, `justifyContent:
  'space-between'`, tres secciones (ECO a la izquierda con ancho fijo, nombre del
  negocio al centro con `flex: 1`/`textAlign: 'center'`/`numberOfLines={1}`/fontSize
  menor, flecha "›" o "→" a la derecha con ancho fijo) — se mantiene el mismo
  `Pressable` de `onBack`, solo cambia su contenido/posición.
- `TabBar`: rediseño a tiras de tabs con **subrayado/indicador inferior** en vez de
  píldoras llenas (estilo Material tabs), más angostas/compactas, sin cambiar la props
  API (`tabs`/`activeTab`/`onSelect`) para no romper `MobileContentScreen.tsx`, que
  también la usa.
- `MapTab`: el `View` raíz se envuelve en un `ScrollView` (`contentContainerStyle` con
  el mismo `gap`/`padding` que antes) para que el botón "Cómo llegar" sea alcanzable
  cuando el contenido (mapa + dirección + referencia + botón) no entra en la altura
  visible — esto es un fix de bug, no un cambio de diseño.

## Tareas
- [x] T1 — `SearchScreen.tsx`: header ECO+saludo en una línea, label "Tu búsqueda:",
      fila búsqueda+radio en una línea con picker nuevo, mapa agrandado, fila de
      resultado con nombre/teléfono/distancia alineados.
- [x] T2 — `BusinessDetailScreen.tsx` + `TabBar.tsx`: header rediseñado (ECO/nombre
      negocio/flecha), tabs compactos y profesionales.
- [x] T3 — `business/MapTab.tsx`: envolver en `ScrollView` para que el botón "Cómo
      llegar" sea visible/alcanzable.
- [ ] T4 — Verificación: typecheck, `expo export --platform android`.
- [ ] T5 — Generar APK (EAS build) para pruebas del usuario.

## Commits
(pendiente)

## Verificación
(pendiente)

### T1
- Dependencia agregada vía `npx expo install @react-native-picker/picker` en
  `apps/mobile` → resolvió `@react-native-picker/picker@2.9.0` (SDK 52 compatible),
  sin fijar versión a mano. Solo tocó `apps/mobile/package.json` y el `package-lock.json`
  raíz del monorepo (workspaces npm: no existe un lockfile separado dentro de
  `apps/mobile`, el lockfile único vive en la raíz del repo); `app.json` no requirió
  cambios.
- `npm run typecheck --workspace @eco/mobile`: 0 errores.
- `npx expo export --platform android` (en `apps/mobile`): bundling exitoso, 702
  módulos (`index-05855d60f83d87b1dc596a279a81188c.hbc`, 2.46 MB) — confirma que la
  nueva dependencia del Picker resuelve y empaqueta correctamente.
- No existe runner de tests de componentes RN en este repo (sin script `test` en
  `apps/mobile/package.json`); verificación realizada vía typecheck + bundling, mismo
  precedente que T2/T3.

### T2/T3
- `npm run typecheck --workspace @eco/mobile`: 0 errores.
- `npx expo export --platform android` (en `apps/mobile`): bundling exitoso, 693
  módulos (`index-c93dfcce62c53c99c8d93012fe2aef95.hbc`, 2.45 MB).
- `MobileContentScreen.tsx` (consumidor de `TabBar`) sigue compilando sin cambios: el
  typecheck del workspace completo pasó con 0 errores con la nueva `TabBarProps<T>`
  sin modificar su firma.
- No existe runner de tests de componentes RN en este repo (sin script `test` en
  `apps/mobile/package.json`); verificación realizada vía typecheck + bundling.
