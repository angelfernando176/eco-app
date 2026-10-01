# ECO

Aplicación para **buscar negocios registrados**, compuesta por una app web/escritorio y una app móvil.

## Stack

- **TypeScript** en todo el monorepo
- **React** + Vite — app web/escritorio
- **React Native** + Expo — app móvil
- **Supabase / PostgreSQL** — backend y almacenamiento central
- **SQLite** — almacenamiento local en la app móvil
- **Supabase Storage** — imágenes y videos
- **Google Maps** — ubicación y navegación

## Estructura

```
eco/
├── apps/
│   ├── web/          # @eco/web — React + Vite + TypeScript
│   └── mobile/       # @eco/mobile — React Native + Expo + TypeScript + SQLite
├── packages/
│   └── shared/       # @eco/shared — tipos de dominio y límites compartidos
├── supabase/         # migraciones y configuración del almacenamiento central
├── tsconfig.base.json
└── package.json      # npm workspaces
```

## Requisitos

- Node.js >= 20
- npm (workspaces)

## Primeros pasos

```bash
npm install

# Web / escritorio
npm run web

# Móvil (Expo)
npm run mobile

# Typecheck en todos los workspaces
npm run typecheck
```

## Roles

| Rol | Interfaz | Alcance |
| --- | --- | --- |
| Administrador | web/escritorio | Acceso global a usuarios y negocios |
| Usuario web/escritorio | web/escritorio | Solo negocios asociados a su cuenta |
| Usuario móvil | móvil | Consulta de negocios y calificaciones/reseñas |

Los tipos de dominio y los límites de negocio (skills, negocios, productos, videos) viven en `packages/shared`.
