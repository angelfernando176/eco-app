import { db } from './database'

/** Datos de ingreso a la app (primer acceso: nombre + rango de edad). */
export interface Ingreso {
  id: number
  nombre: string
  rangoEdad: string
  remoteUserId: string | null
  syncedAt: string | null
}

export function guardarIngreso(nombre: string, rangoEdad: string): void {
  db.runSync('INSERT INTO ingreso (nombre, rango_edad) VALUES (?, ?)', [nombre, rangoEdad])
}

export function obtenerIngreso(): Ingreso | null {
  const row = db.getFirstSync<{
    id: number
    nombre: string
    rango_edad: string
    remote_user_id: string | null
    synced_at: string | null
  }>('SELECT id, nombre, rango_edad, remote_user_id, synced_at FROM ingreso ORDER BY id DESC LIMIT 1')

  if (!row) return null

  return {
    id: row.id,
    nombre: row.nombre,
    rangoEdad: row.rango_edad,
    remoteUserId: row.remote_user_id,
    syncedAt: row.synced_at,
  }
}

export function marcarIngresoSincronizado(id: number, remoteUserId: string): void {
  db.runSync("UPDATE ingreso SET remote_user_id = ?, synced_at = datetime('now') WHERE id = ?", [remoteUserId, id])
}
