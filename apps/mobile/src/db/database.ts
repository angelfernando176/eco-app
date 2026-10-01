import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite'

export const db: SQLiteDatabase = openDatabaseSync('eco.db')

/** Datos de ingreso a la app (primer acceso: nombre + rango de edad). */
export interface Ingreso {
  nombre: string
  rangoEdad: string
}

/**
 * Almacenamiento local SQLite (requisito 5 de la app móvil).
 *
 * Tablas locales:
 * - ingreso: datos de ingreso a la app (nombre + rango de edad).
 * - búsquedas, calificaciones, reseñas: pendientes de features posteriores.
 *
 * Esta información se sincroniza posteriormente con Supabase.
 */
export function initLocalDatabase(): void {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS ingreso (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      rango_edad TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
}

export function guardarIngreso(nombre: string, rangoEdad: string): void {
  db.runSync('INSERT INTO ingreso (nombre, rango_edad) VALUES (?, ?)', [nombre, rangoEdad])
}

export function obtenerIngreso(): Ingreso | null {
  const row = db.getFirstSync<{ nombre: string; rango_edad: string }>(
    'SELECT nombre, rango_edad FROM ingreso ORDER BY id DESC LIMIT 1'
  )
  return row ? { nombre: row.nombre, rangoEdad: row.rango_edad } : null
}
