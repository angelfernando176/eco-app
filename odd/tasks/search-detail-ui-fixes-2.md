# ECO — Segunda ronda de correcciones UI (detalle de negocio y búsqueda, móvil)

## Requerimiento (usuario, 2026-10-08, con captura de pantalla)
a) Gran espacio en blanco desperdiciado entre las pestañas (Mapa/Videos/.../Calificar)
   y el contenido de la pestaña activa.
b) El nombre de la app "ECO" en el header de detalle aparece partido en 2 líneas
   ("EC" / "O").
c) Espacio excesivo (~1cm) entre el mapa y el botón "Cómo llegar"; debería ser
   ~1mm.
d) Pantalla de búsqueda (tras "Continuar"): label "Tu búsqueda:" → **"Qué deseas
   buscar"**.
e) Pantalla de búsqueda: el label "Radio de búsqueda" (arriba del picker) debe
   **desaparecer** (el picker queda sin label visible encima).

## Diagnóstico (arquitecto)
- Causa raíz de (a)+(c): en `apps/mobile/src/screens/business/MapTab.tsx`, el
  `ScrollView` que envuelve el contenido (agregado en la ronda anterior para
  solucionar el botón invisible) solo tiene `contentContainerStyle`, **no** un
  `style={{ flex: 1 }}` propio. Es un error clásico de React Native: sin `flex: 1`
  en el `style` del `ScrollView` (además de `contentContainerStyle`), su medición
  dentro de un árbol de padres `flex: 1` queda indeterminada/colapsada, lo que
  produce exactamente el hueco en blanco observado antes del contenido real.
  Fix: agregar `style={styles.scroll}` (`{ flex: 1 }`) al `ScrollView`.
- (c) además: el `gap: spacing[3]` (12px) del `contentContainerStyle` aplicado entre
  mapa→dirección→botón, más el `marginTop: spacing[2]` (8px) propio del botón, suman
  más separación de la pedida. Reducir el `gap` del contenedor a `spacing[1]` (4px) y
  quitar el `marginTop` extra del botón.
- (b): `apps/mobile/src/screens/BusinessDetailScreen.tsx`, estilo `appName` tiene
  `width: 48` fijo con `fontSize: typography.size['3xl']` (30px) en negrita — "ECO" en
  ese tamaño no entra en 48px de ancho y se parte en 2 líneas. Fix: quitar el `width`
  fijo (dejar que el texto mida su ancho natural, como ya funciona en el header de
  `SearchScreen.tsx` con el mismo texto/tamaño sin `width` fijo) y agregar
  `numberOfLines={1}` por seguridad.
- (d)+(e): cambios de texto puntuales en `apps/mobile/src/screens/SearchScreen.tsx`.

## Tareas
- [x] T1 — `MapTab.tsx`: agregar `style={{flex:1}}` al `ScrollView`, reducir el
      espaciado mapa→botón a mínimo.
- [x] T2 — `BusinessDetailScreen.tsx`: quitar `width: 48` fijo de `appName`, agregar
      `numberOfLines={1}`.
- [x] T3 — `SearchScreen.tsx`: label "Tu búsqueda:" → "Qué deseas buscar"; quitar el
      label "Radio de búsqueda" (el picker queda sin texto encima).
- [x] T4 — Verificación: typecheck, `expo export --platform android`, repaso visual
      del fix de ScrollView (razonamiento de layout, sin dispositivo).
- [ ] T5 — Generar APK (EAS build) para pruebas del usuario.

### T1-T4 — Implementación y verificación (2026-10-08)
- `MapTab.tsx`: `ScrollView` ahora tiene `style={styles.scroll}` (`{flex:1}`) además de
  `contentContainerStyle`; sin esto, React Native puede medir mal la altura del scroll
  dentro de un árbol de padres `flex:1`, lo que explica el hueco grande observado. El
  `gap` del contenedor bajó de `spacing[3]` (12) a `spacing[1]` (4) y se quitó el
  `marginTop: spacing[2]` extra del botón (ahora `marginTop: 0`).
- `BusinessDetailScreen.tsx`: `appName` ("ECO") perdió el `width: 48` fijo que no
  alcanzaba para el texto en `typography.size['3xl']` bold, causando el corte en 2
  líneas; se agregó `numberOfLines={1}` como resguardo.
- `SearchScreen.tsx`: label del campo de búsqueda → "Qué deseas buscar"; se quitó el
  `Text` "Radio de búsqueda" y el estilo `label` que quedó sin uso.
- `npm run typecheck --workspaces` (mobile, web, shared): **0 errores**.
- `npx expo export --platform android`: **éxito**, 702 módulos, bundle 2.46 MB.
- No hay dispositivo real en este entorno para confirmar visualmente el fix del hueco;
  el razonamiento de causa raíz (ScrollView sin `style` flex) es el patrón de bug de RN
  más conocido para este síntoma exacto (contenido colapsado/mal medido dentro de un
  árbol `flex:1`), pero queda pendiente de confirmación visual por el usuario en el
  próximo APK.

## Commits
(pendiente)

## Verificación
(pendiente)
