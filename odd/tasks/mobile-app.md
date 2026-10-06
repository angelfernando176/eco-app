# ECO — App móvil: sincronización, búsqueda con mapa, ficha del negocio y calificaciones

## Spec (odd/spec.md §4, §5, §6)
- Primer acceso: nombre + rango de edad. Segundo: "Bienvenido a ECO…" + Registrar (abre la web) / Continuar (sincroniza info local).
- Búsqueda de negocios con radio 5/10/20/50/100 km desde la ubicación actual; resultados en mapa.
- Popup del negocio: Google Maps (coordenadas), Videos (reproducir), Ranking (calificaciones/comentarios), Menú
  (productos/imágenes/precios), Contacto (nombre comercial y datos), Calificar (calificación + comentario).
- SQLite local: ingreso, búsquedas, calificaciones, reseñas; sincronización posterior a Supabase.
- Usuario móvil: solo consulta negocios y registra calificaciones/reseñas.

## Decisiones de diseño
- El usuario móvil **no tiene cuenta de Auth**: opera como `anon`. Las escrituras pasan por RPC
  `SECURITY DEFINER` en `eco` (migración `0005_mobile.sql`): `register_mobile_user` y `submit_rating`.
  El `uuid` del perfil móvil actúa como credencial del dispositivo (no se expone en ninguna lectura).
- Por eso la lectura de `ratings` deja de ser pública: se reemplaza por RPC `list_business_ratings`
  (rating, comentario, fecha y nombre; sin ids) + `business_rating_summary`. Admin y dueño siguen leyendo la tabla.
- Búsqueda: caja delimitadora (lat/lon) en SQL + distancia Haversine en el cliente; texto sobre nombre comercial y skills.
- Las búsquedas viven solo en SQLite (Supabase no tiene tabla de búsquedas en el spec).
- Mapa: `react-native-maps` (Google Maps en Android); clave `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`. Videos: `expo-video`.
- Config por `EXPO_PUBLIC_*` (`.env` lo crea el usuario; la política bloquea escribir `.env`).
- Fuera de alcance: login móvil, push, edición de negocios desde el móvil, una calificación por usuario/negocio (no está en el spec).

## Tareas
- [x] Migración `0005_mobile.sql` + tests pgTAP + prueba real en Postgres (Docker)
- [ ] Base móvil: dependencias, cliente Supabase, SQLite (ingreso/búsquedas/calificaciones), sincronización, tema
- [ ] Onboarding con sincronización real (Continuar) y reintentos
- [ ] Búsqueda: ubicación, radio, texto, mapa y lista de resultados
- [ ] Ficha del negocio (Mapa, Videos, Ranking, Menú, Contacto, Calificar)
- [ ] Verificación: typecheck, bundle de Expo, pruebas de lógica pura y de BD

## Commits
(pendiente)

## Verificación de base de datos (Docker, `supabase/tests/harness/run.sh`)
- Postgres 16 descartable + pgTAP + stubs de Supabase (roles, auth, storage); aplica 0001–0005 y corre todos los tests.
- Resultado: **79 pruebas OK, 0 fallos** (0001: 12, 0002: 15, 0004: 27, 0005: 25).
- Hallazgo: los tests 8, 10, 11 y 13 de `0002` estaban mal escritos (nunca se habían ejecutado): RLS ocultaba
  la fila ajena al `SELECT` del `INSERT…SELECT`, `DELETE` sin política filtra en vez de lanzar error, el trigger de
  límite corre antes que RLS, y el test 11 contradecía la regla de plan de `0004`. Se corrigieron los tests; las políticas no tenían defecto.
- Riesgo conocido: `register_mobile_user` y `submit_rating` son invocables por `anon` sin límite de frecuencia (spam posible).
