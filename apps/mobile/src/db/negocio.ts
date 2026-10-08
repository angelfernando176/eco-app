import { db } from './database'

/** Negocio local (requisito: un único negocio registrado por dispositivo). */
export interface Negocio {
  id: number
  remoteId: string | null
  ownerRemoteId: string
  tradeName: string
  ruc: string
  phone: string
  latitude: number
  longitude: number
  productName: string
  productPrice: number
  password: string | null
  status: string
  pendingAction: 'create' | 'update' | 'deactivate' | null
  pendingReason: string | null
  pendingComment: string | null
  pendingSkillName: string | null
  syncedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface NuevoNegocio {
  ownerRemoteId: string
  tradeName: string
  ruc: string
  phone: string
  latitude: number
  longitude: number
  productName: string
  productPrice: number
  password: string
  skillName?: string
}

export interface NegocioPatch {
  tradeName: string
  ruc: string
  phone: string
  latitude: number
  longitude: number
  productName: string
  productPrice: number
  password?: string
}

interface NegocioRow {
  id: number
  remote_id: string | null
  owner_remote_id: string
  trade_name: string
  ruc: string
  phone: string
  latitude: number
  longitude: number
  product_name: string
  product_price: number
  password: string | null
  status: string
  pending_action: 'create' | 'update' | 'deactivate' | null
  pending_reason: string | null
  pending_comment: string | null
  pending_skill_name: string | null
  synced_at: string | null
  created_at: string
  updated_at: string
}

function mapRow(row: NegocioRow): Negocio {
  return {
    id: row.id,
    remoteId: row.remote_id,
    ownerRemoteId: row.owner_remote_id,
    tradeName: row.trade_name,
    ruc: row.ruc,
    phone: row.phone,
    latitude: row.latitude,
    longitude: row.longitude,
    productName: row.product_name,
    productPrice: row.product_price,
    password: row.password,
    status: row.status,
    pendingAction: row.pending_action,
    pendingReason: row.pending_reason,
    pendingComment: row.pending_comment,
    pendingSkillName: row.pending_skill_name,
    syncedAt: row.synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function obtenerNegocioLocal(): Negocio | null {
  const row = db.getFirstSync<NegocioRow>(
    `SELECT id, remote_id, owner_remote_id, trade_name, ruc, phone, latitude, longitude,
            product_name, product_price, password, status, pending_action, pending_reason,
            pending_comment, pending_skill_name, synced_at, created_at, updated_at
     FROM negocio ORDER BY id DESC LIMIT 1`
  )
  return row ? mapRow(row) : null
}

export function crearNegocioPendiente(input: NuevoNegocio): void {
  db.runSync(
    `INSERT INTO negocio (
       owner_remote_id, trade_name, ruc, phone, latitude, longitude,
       product_name, product_price, password, pending_skill_name, status, pending_action
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'create')`,
    [
      input.ownerRemoteId,
      input.tradeName,
      input.ruc,
      input.phone,
      input.latitude,
      input.longitude,
      input.productName,
      input.productPrice,
      input.password,
      input.skillName ? input.skillName : null,
    ]
  )
}

export function actualizarNegocioPendiente(id: number, patch: NegocioPatch): void {
  const row = db.getFirstSync<{ pending_action: 'create' | 'update' | 'deactivate' | null }>(
    'SELECT pending_action FROM negocio WHERE id = ?',
    [id]
  )
  const nextPendingAction = row?.pending_action === 'create' ? 'create' : 'update'

  if (patch.password !== undefined) {
    db.runSync(
      `UPDATE negocio
       SET trade_name = ?, ruc = ?, phone = ?, latitude = ?, longitude = ?,
           product_name = ?, product_price = ?, password = ?, pending_action = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
      [
        patch.tradeName,
        patch.ruc,
        patch.phone,
        patch.latitude,
        patch.longitude,
        patch.productName,
        patch.productPrice,
        patch.password,
        nextPendingAction,
        id,
      ]
    )
    return
  }

  db.runSync(
    `UPDATE negocio
     SET trade_name = ?, ruc = ?, phone = ?, latitude = ?, longitude = ?,
         product_name = ?, product_price = ?, pending_action = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [
      patch.tradeName,
      patch.ruc,
      patch.phone,
      patch.latitude,
      patch.longitude,
      patch.productName,
      patch.productPrice,
      nextPendingAction,
      id,
    ]
  )
}

export function marcarAltaSincronizada(id: number, remoteId: string): void {
  db.runSync(
    "UPDATE negocio SET remote_id = ?, password = NULL, pending_action = NULL, synced_at = datetime('now') WHERE id = ?",
    [remoteId, id]
  )
}

export function marcarActualizacionSincronizada(id: number): void {
  db.runSync(
    "UPDATE negocio SET password = NULL, pending_action = NULL, synced_at = datetime('now') WHERE id = ?",
    [id]
  )
}

export function prepararBajaPendiente(id: number, reason: string, comment: string): void {
  db.runSync(
    "UPDATE negocio SET status = 'inactive', pending_action = 'deactivate', pending_reason = ?, pending_comment = ?, updated_at = datetime('now') WHERE id = ?",
    [reason, comment, id]
  )
}

export function marcarBajaSincronizada(id: number): void {
  db.runSync(
    "UPDATE negocio SET pending_action = NULL, pending_reason = NULL, pending_comment = NULL, synced_at = datetime('now') WHERE id = ?",
    [id]
  )
}

export function marcarSkillSincronizado(id: number): void {
  db.runSync('UPDATE negocio SET pending_skill_name = NULL WHERE id = ?', [id])
}
