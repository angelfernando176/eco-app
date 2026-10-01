# ECO — Estructura base

## Objetivo
Inicializar el repositorio y armar la estructura base del monorepo ECO: app web/escritorio, app móvil, paquete compartido y capa de almacenamiento (Supabase + SQLite local).

## Stack fijo
- TypeScript en todo el monorepo
- React (web/escritorio)
- React Native + Expo (móvil)
- Supabase/PostgreSQL (backend + almacenamiento central)
- SQLite (almacenamiento local móvil)
- Supabase Storage (imágenes/videos)
- Google Maps (ubicación/navegación)

## Estructura
```
eco/
├── apps/
│   ├── web/          # @eco/web — React + Vite + TS
│   └── mobile/       # @eco/mobile — React Native + Expo + TS + SQLite
├── packages/
│   └── shared/       # @eco/shared — tipos de dominio + límites
├── supabase/         # migración inicial + README
├── tsconfig.base.json
└── package.json      # npm workspaces
```

## Tareas
- [x] Configurar raíz del monorepo
- [x] packages/shared (dominio + límites)
- [x] apps/web (Vite + React + TS)
- [x] apps/mobile (Expo + RN + TS + SQLite)
- [x] supabase (migración + README)
- [x] Verificar estructura
- [x] Commit inicial

## Commit
- Estado: 34 archivos **staged**, rama `master` sin commits (unborn).

## Revisión nativa (RDD) — aprobada
- Lineage final: `review-351d2fc7f3b61434-r2` (generación 2) — **aprobada y acknowledge**.
- Lineage original: `review-351d2fc7f3b61434` (escalada, reemplazada por recovery).
- Tier: medium · lente: `review-reliability` · 890 líneas · budget 200.
- Hallazgos corregidos: `R3-enforcement-missing` (triggers de límites), `R3-no-tests` (tests pgTAP), `R3-fk-uniqueness` (lock anti-concurrencia), `R3-missing-fk-index` (índice FK).
- Hallazgos advisory (no bloqueantes): ver `advisory_findings` del cierre.

## Regla de alcance
No agregar roles, módulos, campos, funcionalidades ni reglas de negocio no especificadas en el prompt del proyecto.
