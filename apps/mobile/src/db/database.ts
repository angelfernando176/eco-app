import { openDatabaseSync } from 'expo-sqlite'

export const db = openDatabaseSync('eco.db')

/**
 * Almacenamiento local SQLite (requisito 5 de la app móvil).
 *
 * Tablas locales a implementar:
 * - ingreso: datos de ingreso a la app.
 * - búsquedas: búsquedas realizadas.
 * - calificaciones: calificaciones realizadas.
 * - reseñas: reseñas realizadas.
 *
 * Esta información se sincroniza posteriormente con Supabase.
 */
export function initLocalDatabase(): void {
  // TODO: crear tablas e índices locales en la primera ejecución.
}
