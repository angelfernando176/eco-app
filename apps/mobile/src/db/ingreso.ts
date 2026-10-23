import { db } from './database'

/** Datos de ingreso a la app (primer acceso: nombre + rango de edad). */
export interface Ingreso {
  id: number
  nombre: string
  rangoEdad: string
  remoteUserId: string | null
  syncedAt: string | null
  email: string | null
  password: string | null
  role: string | null
  subscriptionCheckedAt: string | null
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
    email: string | null
    password: string | null
    role: string | null
    subscription_checked_at: string | null
  }>(
    'SELECT id, nombre, rango_edad, remote_user_id, synced_at, email, password, role, subscription_checked_at FROM ingreso ORDER BY id DESC LIMIT 1'
  )

  if (!row) return null

  return {
    id: row.id,
    nombre: row.nombre,
    rangoEdad: row.rango_edad,
    remoteUserId: row.remote_user_id,
    syncedAt: row.synced_at,
    email: row.email,
    password: row.password,
    role: row.role,
    subscriptionCheckedAt: row.subscription_checked_at,
  }
}

export function marcarIngresoSincronizado(id: number, remoteUserId: string): void {
  db.runSync("UPDATE ingreso SET remote_user_id = ?, synced_at = datetime('now') WHERE id = ?", [remoteUserId, id])
}

export function guardarCredenciales(id: number, email: string, password: string): void {
  db.runSync('UPDATE ingreso SET email = ?, password = ? WHERE id = ?', [email, password, id])
}

export function actualizarRol(id: number, role: string): void {
  db.runSync("UPDATE ingreso SET role = ?, subscription_checked_at = datetime('now') WHERE id = ?", [role, id])
}

export function limpiarPassword(id: number): void {
  db.runSync('UPDATE ingreso SET password = NULL WHERE id = ?', [id])
}
