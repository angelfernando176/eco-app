# AppMovil: estandarización de UI/estilos + manejo seguro de errores

Unifica componentes/estilos duplicados en AppMovil y corrige la filtración de errores internos de Postgres a la UI.

## Specs

- S1. Revisar que los objetos estén estandarizados: botones, listas, labels (ejemplo dado: botón "agregar" con aspecto distinto en distintas pantallas). Revisar toda la APK (AppMovil).
- S2. Los estilos deben estar estandarizados y organizados procurando evitar redundancia en código.
- S3. En todo requerimiento debe priorizarse el manejo seguro de información (directriz general; en este pedido el usuario pidió además auditar lo ya implementado).
- S4 (decisión del usuario). Variante única para todo botón "Agregar": default/primary en todos lados, incluyendo `BusinessAccessListScreen` (hoy `secondary`) y "Agregar hora" en `SearchScreen` (hoy `ghost`).
- S5 (decisión del usuario). Eliminar las 3 pantallas muertas (`BusinessManageScreen.tsx`, `MobileContentScreen.tsx`, `BusinessListScreen.tsx`) — no están importadas en `App.tsx` y son las que más estilos/componentes duplicados tienen.
- S6 (decisión del usuario). El hallazgo de sesión admin sin cleanup al pasar a background queda documentado, sin cambio de comportamiento en este pedido.

## Tasks

- T1. Eliminar pantallas muertas (S5) + estandarizar variante del botón "Agregar" (S4). — commit: (pendiente)
- T2. Extraer componente de fila compartido (`components/ListRow.tsx`, con numeración e ✕ de borrado opcionales) y consolidar bloques de `StyleSheet.create` duplicados (`container`, `title`, `cancelText`, `content`, `saveButton`, `row*`) en un módulo de estilos compartido para las pantallas vivas. — S1, S2 — commit: (pendiente)
- T3. Seguridad: los servicios que hoy exponen `error.message` crudo de Postgres/Supabase directo a la UI (`businessDetail.ts`, `businessSearch.ts`, `mobileCatalogAccess.ts`, `mobileContent.ts`, `syncLogic.ts`) deben mapear a un mensaje genérico en español, igual que ya hace `mapUploadErrorToSpanish`/`mapSyncErrorToSpanish`. — S3 — commit: (pendiente)
- T4. Verificación: typecheck de `apps/mobile`, revisión manual de los archivos tocados, confirmar que no quedan referencias a las pantallas eliminadas. — todas — commit: (pendiente)

## Log

- L1 (verbatim, user request): "REQUERIMIENTO GENERAL. Revisa que los objetos esten estandarizados: botones, listas, labels. Ejemplo: Se identifico botón "agregar" en diferente aspecto. Revisa todo en la APK\nREQUERIMIENTO GENERAL. Los estilos deben estar estandarizados y organizados procurando evitar redundancia en código.\nREQUERIMIENTO GENERAL. En todo requerimiento debe priorizar el manejo seguro de información."
- L2: Dos auditorías read-only (gentle-ai-explore) confirmaron: (a) UI — "Agregar" con 3 variantes distintas, `MediaRow`/`NumberedRow` duplicados, varios `StyleSheet.create` keys repetidos en 15-22 pantallas, `AppHeader.tsx` reportado como "no usado" es FALSO POSITIVO (se usa en `App.tsx`, el audit solo miró `screens/`); (b) seguridad — ownership en RPCs correcto, secrets excluidos de git, pero 24 ocurrencias de `error.message` crudo mostrado al usuario, y sesión admin sin cleanup al background/kill.
- L3: Usuario decidió (preguntas Q1-Q3): variante única "default/primary" para Agregar en todos lados (sin excepción de toggles); eliminar las 3 pantallas muertas; dejar sin cambio el comportamiento de sesión admin en background (documentado, no implementado).
