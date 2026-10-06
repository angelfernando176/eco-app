import { db } from './database'

export interface Calificacion {
  id: number
  businessId: string
  rating: number
  comentario: string
  remoteId: string | null
  syncedAt: string | null
  createdAt: string
}

export interface NuevaCalificacion {
  businessId: string
  rating: number
  comentario: string
}

function mapRow(row: {
  id: number
  business_id: string
  rating: number
  comentario: string
  remote_id: string | null
  synced_at: string | null
  created_at: string
}): Calificacion {
  return {
    id: row.id,
    businessId: row.business_id,
    rating: row.rating,
    comentario: row.comentario,
    remoteId: row.remote_id,
    syncedAt: row.synced_at,
    createdAt: row.created_at,
  }
}

export function guardarCalificacionPendiente(input: NuevaCalificacion): void {
  db.runSync('INSERT INTO calificaciones (business_id, rating, comentario) VALUES (?, ?, ?)', [
    input.businessId,
    input.rating,
    input.comentario,
  ])
}

export function listarCalificacionesPendientes(): Calificacion[] {
  const rows = db.getAllSync<{
    id: number
    business_id: string
    rating: number
    comentario: string
    remote_id: string | null
    synced_at: string | null
    created_at: string
  }>(
    'SELECT id, business_id, rating, comentario, remote_id, synced_at, created_at FROM calificaciones WHERE synced_at IS NULL ORDER BY id ASC'
  )
  return rows.map(mapRow)
}

export function marcarCalificacionSincronizada(id: number, remoteId: string): void {
  db.runSync("UPDATE calificaciones SET remote_id = ?, synced_at = datetime('now') WHERE id = ?", [remoteId, id])
}

export function listarCalificacionesPorNegocioLocal(businessId: string): Calificacion[] {
  const rows = db.getAllSync<{
    id: number
    business_id: string
    rating: number
    comentario: string
    remote_id: string | null
    synced_at: string | null
    created_at: string
  }>(
    'SELECT id, business_id, rating, comentario, remote_id, synced_at, created_at FROM calificaciones WHERE business_id = ? ORDER BY id DESC',
    [businessId]
  )
  return rows.map(mapRow)
}
