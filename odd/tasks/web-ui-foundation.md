# ECO — Web UI foundation (sistema de estilos)

## Objetivo
Dar a la app web una apariencia profesional con estilos organizados y reutilizables,
sin agregar funcionalidades fuera del spec (`odd/spec.md`, regla de alcance).

## Estado inicial
`apps/web` no tiene CSS: markup sin estilos en `App.tsx` y `auth/AuthScreen.tsx`.

## Decisiones de diseño
- **CSS plano con variables (custom properties)**, sin dependencias nuevas.
- Capas en `apps/web/src/styles/`: `tokens.css` (colores, espaciado, tipografía, radios,
  sombras) → `base.css` (reset + elementos) → `components.css` (button, field, card,
  alert, layout). Entrada única: `styles/index.css`, importada en `main.tsx`.
- **Componentes UI reutilizables** en `apps/web/src/ui/` (`Button`, `Field`, `Alert`,
  `Card`, `AuthLayout`) que consumen las clases; las pantallas no llevan estilos propios.
- Responsive (mobile-first), foco visible y contraste accesible.
- Fuera de alcance: app móvil (feature posterior), pantallas de negocios/usuarios.

## Tareas
- [x] Tokens + base + componentes CSS (`apps/web/src/styles/`)
- [x] Componentes UI reutilizables (`apps/web/src/ui/`)
- [x] Refactor de `App.tsx` y `AuthScreen.tsx` para usarlos
- [x] Verificación: typecheck + build web OK
- [ ] Revisión visual en navegador (pendiente, la hace el usuario en http://localhost:5173)

## Commits
- `1658bac` feat(web): add reusable style system and UI components
