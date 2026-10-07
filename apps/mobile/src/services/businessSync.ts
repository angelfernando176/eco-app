import { supabase } from '../lib/supabase'
import {
  marcarAltaSincronizada,
  marcarActualizacionSincronizada,
  marcarBajaSincronizada,
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
        password: negocio.password ?? '',
        confirmPassword: negocio.password ?? '',
      })
      const { data, error } = await supabase.rpc('register_mobile_business', payload)
      if (error) throw error
      marcarAltaSincronizada(negocio.id, data as string)
      return { action, ok: true }
    }

    if (action === 'update') {
      const payload = buildUpdatePayload(
        negocio.remoteId as string,
        ownerRemoteId,
        coords,
        {
          tradeName: negocio.tradeName,
          ruc: negocio.ruc,
          phone: negocio.phone,
          productName: negocio.productName,
          productPrice: negocio.productPrice,
        },
        Boolean(negocio.password)
      )
      if (negocio.password) {
        payload.p_password = negocio.password
      }
      const { error } = await supabase.rpc('update_mobile_business', payload)
      if (error) throw error
      marcarActualizacionSincronizada(negocio.id)
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
    return { action, ok: true }
  } catch (err) {
    return { action, ok: false, error: mapSyncErrorToSpanish(err) }
  }
}
