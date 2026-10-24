import { supabase } from '../lib/supabase'
import {
  marcarAltaSincronizada,
  marcarActualizacionSincronizada,
  marcarBajaSincronizada,
  marcarSkillSincronizado,
  obtenerNegocioLocal,
} from '../db/negocio'
import {
  buildDeactivatePayload,
  buildRegisterPayload,
  buildUpdatePayload,
  decideBusinessSyncAction,
  mapSyncErrorToSpanish,
  type BusinessSyncAction,
  type DeactivationReason,
} from './mobileBusinessLogic'

export interface BusinessSyncResult {
  action: BusinessSyncAction
  ok: boolean
  error?: string
}

/** Best-effort retry of a pending skill add; never throws, never fails the caller's result. */
async function retryPendingSkill(negocio: { id: number; remoteId: string | null; pendingSkillName: string | null }, ownerRemoteId: string): Promise<void> {
  if (!supabase || !negocio.remoteId || !negocio.pendingSkillName) return
  try {
    const { error } = await supabase.rpc('add_mobile_skill', {
      p_business_id: negocio.remoteId,
      p_owner_id: ownerRemoteId,
      p_name: negocio.pendingSkillName,
    })
    if (error) return
    marcarSkillSincronizado(negocio.id)
  } catch {
    // Leave pending_skill_name set so it retries on the next syncPending() call.
  }
}

/**
 * Pushes the single local pending negocio (create/update/deactivate) to
 * Supabase. Never throws; safe to call repeatedly.
 */
export async function syncNegocioPendiente(ownerRemoteId: string): Promise<BusinessSyncResult> {
  const negocio = obtenerNegocioLocal()
  if (!negocio) {
    return { action: 'none', ok: true }
  }

  const action = decideBusinessSyncAction({ pendingAction: negocio.pendingAction, remoteId: negocio.remoteId })

  if (action === 'none') {
    await retryPendingSkill(negocio, ownerRemoteId)
    return { action, ok: true }
  }

  if (!supabase) {
    return { action, ok: false, error: 'La app no está configurada para conectarse a Supabase.' }
  }

  const coords = { latitude: negocio.latitude, longitude: negocio.longitude }

  try {
    if (action === 'register') {
      const payload = buildRegisterPayload(ownerRemoteId, coords, {
        tradeName: negocio.tradeName,
        ruc: negocio.ruc,
        phone: negocio.phone,
        productName: negocio.productName,
        productPrice: negocio.productPrice,
      })
      const { data, error } = await supabase.rpc('register_mobile_business', payload)
      if (error) throw error
      marcarAltaSincronizada(negocio.id, data as string)
      if (negocio.pendingSkillName) {
        await retryPendingSkill({ id: negocio.id, remoteId: data as string, pendingSkillName: negocio.pendingSkillName }, ownerRemoteId)
      }
      return { action, ok: true }
    }

    if (action === 'update') {
      const payload = buildUpdatePayload(negocio.remoteId as string, ownerRemoteId, coords, {
        tradeName: negocio.tradeName,
        ruc: negocio.ruc,
        phone: negocio.phone,
        productName: negocio.productName,
        productPrice: negocio.productPrice,
      })
      const { error } = await supabase.rpc('update_mobile_business', payload)
      if (error) throw error
      marcarActualizacionSincronizada(negocio.id)
      await retryPendingSkill(negocio, ownerRemoteId)
      return { action, ok: true }
    }

    const payload = buildDeactivatePayload(
      negocio.remoteId as string,
      ownerRemoteId,
      negocio.pendingReason as DeactivationReason,
      negocio.pendingComment ?? ''
    )
    const { error } = await supabase.rpc('deactivate_mobile_business', payload)
    if (error) throw error
    marcarBajaSincronizada(negocio.id)
    await retryPendingSkill(negocio, ownerRemoteId)
    return { action, ok: true }
  } catch (err) {
    return { action, ok: false, error: mapSyncErrorToSpanish(err) }
  }
}
