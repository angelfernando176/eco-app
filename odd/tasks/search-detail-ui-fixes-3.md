# ECO — Tercera ronda: hueco real entre tabs y contenido (móvil)

## Requerimiento (usuario, 2026-10-08, con captura de pantalla nueva)
El fix anterior (agregar `style={{flex:1}}` al `ScrollView` de `MapTab`) **no corrigió**
el hueco grande entre las pestañas y el mapa — el bug persiste idéntico, con la misma
línea verde flotante antes del mapa. Sí funcionaron: el botón "Cómo llegar" ahora es
visible, y el header "ECO" ya no se parte. Pedido adicional: reducir aún más el espacio
mapa→botón.

## Diagnóstico corregido (arquitecto)
- La hipótesis anterior (ScrollView de `MapTab` sin `flex:1`) era incompleta: ese fix sí
  resolvió la visibilidad/espaciado del botón, pero no la causa del hueco superior.
- Causa real más probable: `TabBar.tsx` renderiza un `ScrollView horizontal` **sin
  ningún `style` propio** (solo `contentContainerStyle`). Sin una altura explícita, el
  alto de ese `ScrollView` queda indeterminado para el motor de layout de Yoga/React
  Native dentro de un árbol con padres `flex:1`; esto puede dejarlo con un alto
  indeterminado/expandido, empujando su propio borde inferior (el indicador verde de la
  pestaña activa) muy por debajo de donde deber\u00eda estar, y comprimiendo el espacio real
  disponible para el contenido de la pestaña.
- Fix estructural (elimina la ambigüedad en vez de asumir un comportamiento de flex):
  se le da al `ScrollView` del `TabBar` una altura **fija y expl\u00edcita** (`height: 44`,
  `flexGrow: 0`, `flexShrink: 0`), y se centra verticalmente el contenido
  (`alignItems: 'center'` en `contentContainerStyle`). Esto hace imposible que la barra
  de tabs ocupe más espacio del que debe, sin depender de inferir el comportamiento
  exacto del motor de layout.
- Espacio mapa→botón: se baja el `gap` de `MapTab` de `spacing[1]` (4px) a `2px`
  (valor literal, ya no ligado a la escala de spacing, a pedido expl\u00edcito de "lo m\u00e1s
  m\u00ednimo posible").
- Limitación honesta: no hay dispositivo/emulador real disponible en este entorno para
  confirmar visualmente el resultado antes de entregar el APK. Este es un fix
  estructural (altura fija elimina la ambig\u00fcedad de raíz) en vez de otro parche
  especulativo, pero su confirmaci\u00f3n final depende de la pr\u00f3xima prueba del usuario.

## Tareas
- [x] T1 — `TabBar.tsx`: altura fija expl\u00edcita en el `ScrollView` (`height: 44`,
      `flexGrow: 0`, `flexShrink: 0`), `alignItems: 'center'` en el contenedor.
- [x] T2 — `MapTab.tsx`: reducir el `gap` mapa\u2192bot\u00f3n a 2px.
- [x] T3 — Verificaci\u00f3n: typecheck, `expo export --platform android`.
- [x] T4 — Generar APK (EAS build) para pruebas del usuario.

### T4 — APK generado (2026-10-08)
- Build EAS `294ae58c-1c83-4c96-8744-6ac1a1f884ec` (perfil `preview`, commit `4d2cfce`):
  **FINISHED**. Descargado a `C:\data\data\eco\apk\application-eco.apk` (78.5 MB).
  Link directo: https://expo.dev/artifacts/eas/JbOPT1oyiTujo5eIo0f-tgSmdSiCuOMgtPjwUi8CHaA.apk

## Commits
(pendiente)

## Verificaci\u00f3n
- `npm run typecheck --workspaces` (mobile, web, shared): **0 errores**.
- `npx expo export --platform android`: **\u00e9xito**, 702 m\u00f3dulos, bundle 2.46 MB.
- `MobileContentScreen.tsx` (el otro consumidor de `TabBar`) revisado: usa la misma API
  gen\u00e9rica (`tabs`/`activeTab`/`onSelect`), no se ve afectado por el cambio de altura.
