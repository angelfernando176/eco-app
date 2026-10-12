# ECO móvil — Encabezado compartido en todas las pantallas

## Requerimiento (usuario, 2026-10-12)
Todas las pantallas de la app móvil deben tener el mismo encabezado: a la
izquierda el nombre de la app "ECO", a la derecha un botón que permite volver
a la pantalla anterior (ícono de casa + texto pequeño "Volver" debajo). Si la
pantalla es la principal (el menú inicial, pantalla "segundo acceso"), en vez
de casa/Volver debe aparecer una puerta pequeña + "Salir" (cierra la app).

## Decisión de diseño (arquitecto)
- Se crea un componente compartido `AppHeader.tsx` con `mode: 'home' | 'back'`
  y `onAction`. `home` renderiza puerta+"Salir" (confirma con Alert, luego
  `BackHandler.exitApp()` en Android; en iOS se avisa que debe cerrarse
  manualmente, ya que Apple no permite salir programáticamente).
- "Pantalla principal" = `SecondAccessScreen` (fase `segundo`), el menú que
  aparece luego del primer acceso. Todas las demás fases alcanzables desde ahí
  usan `mode="back"` con destino definido en `App.tsx` (el mismo destino que
  ya usan sus botones "Cancelar"/"Volver" existentes).
- Se reemplaza el encabezado ad-hoc de `BusinessDetailScreen.tsx` (ECO +
  nombre negocio + flecha) por el componente compartido; el nombre del
  negocio se mantiene como subtítulo centrado bajo el encabezado, no dentro
  de él, para no romper el contrato "ECO a la izquierda / acción a la derecha".
- `FirstAccessScreen` (fase `primer`, onboarding único antes de tener
  `ingreso`) queda sin este encabezado: no hay pantalla previa ni concepto de
  "salir" aplicable todavía.

## Tareas
- [x] T1 — Crear `src/components/AppHeader.tsx` (ECO + modo home/back, íconos
      🚪/"Salir" y 🏠/"Volver", confirmación de salida).
- [x] T2 — Integrar `AppHeader` en `App.tsx` para las fases: `segundo` (home),
      `principal` (SearchScreen), `registrarMapa`, `registrarFormulario`,
      `verNegocio`, `darDeBaja`, `gestionarContenido`, y el detalle de negocio
      (`BusinessDetailScreen`), conectando cada `onAction` al mismo destino
      que ya usan los controles existentes de cada pantalla.
- [x] T3 — Quitar el encabezado propio de `BusinessDetailScreen.tsx` y
      `SearchScreen.tsx` (título "ECO" inline) para no duplicar.
- [x] T4 — Verificación: `npm run typecheck --workspaces`,
      `npx expo export --platform android`.
- [ ] T5 — Generar APK (EAS build) para pruebas del usuario.

## Commits
(pendiente)

## Verificación
- `npm run typecheck --workspaces`: 0 errores.
- `npx expo export --platform android`: éxito, 703 módulos, bundle 2.47 MB.
