import { supabase } from '../lib/supabase'
import { marcarIngresoSincronizado, obtenerIngreso } from '../db/ingreso'
import { listarCalificacionesPendientes, marcarCalificacionSincronizada } from '../db/calificaciones'
import { buildRatingPayload, decideSyncActions, isPermanentRejection, mapSyncErrorToSpanish } from './syncLogic'
import { syncNegocioPendiente } from './businessSync'

export interface SyncResult {
  registered: boolean
  ratingsSynced: number
  ratingsPending: number
  error?: string
  businessSync?: { action: string; ok: boolean; error?: string }
}

let inFlight: Promise<SyncResult> | null = null

/**
 * Pushes local pending data (ingreso registration + calificaciones) to
 * Supabase. Never throws; safe to call repeatedly and concurrently.
 */
export function syncPending(): Promise<SyncResult> {
  if (!inFlight) {
    inFlight = runSync().finally(() => {
      inFlight = null
    })
  }
  return inFlight
}

async function runSync(): Promise<SyncResult> {
  const ingreso = obtenerIngreso()
  if (!ingreso) {
    return {
      registered: false,
      ratingsSynced: 0,
      ratingsPending: 0,
      error: 'No hay datos de ingreso guardados localmente.',
    }
  }

  if (!supabase) {
    return {
      registered: Boolean(ingreso.remoteUserId),
      ratingsSynced: 0,
      ratingsPending: listarCalificacionesPendientes().length,
      error: 'La app no está configurada para conectarse a Supabase.',
    }
  }

  let remoteUserId = ingreso.remoteUserId
  let registered = Boolean(remoteUserId)
  let registerError: string | undefined

  const preCheck = decideSyncActions({ hasRemoteUserId: registered, pendingCount: 0 })
  if (preCheck.needsRegister) {
    try {
      const { data, error } = await supabase.rpc('register_mobile_user', {
        p_first_name: ingreso.nombre,
        p_age_range: ingreso.rangoEdad,
      })
      if (error) throw error
      remoteUserId = data as string
      marcarIngresoSincronizado(ingreso.id, remoteUserId)
      registered = true
    } catch (err) {
      registerError = mapSyncErrorToSpanish(err)
    }
  }

  const pendientes = listarCalificacionesPendientes()
  const decision = decideSyncActions({ hasRemoteUserId: registered, pendingCount: pendientes.length })

  const businessSync = remoteUserId ? await syncNegocioPendiente(remoteUserId) : undefined

  if (!decision.canPushRatings) {
    return {
      registered,
      ratingsSynced: 0,
      ratingsPending: pendientes.length,
      error: registerError ?? decision.skipReason ?? undefined,
      businessSync,
    }
  }

  let ratingsSynced = 0
  let pushError: string | undefined

  for (const pendiente of pendientes) {
    try {
      const payload = buildRatingPayload(remoteUserId as string, {
        businessId: pendiente.businessId,
        rating: pendiente.rating,
        comentario: pendiente.comentario,
      })
      const { data, error } = await supabase.rpc('submit_rating', payload)
      if (error) throw error
      marcarCalificacionSincronizada(pendiente.id, data as string)
      ratingsSynced += 1
    } catch (err) {
      pushError = mapSyncErrorToSpanish(err)
      // A server rejection of this one rating must not block the others; a network failure
      // means everything after it would fail too, so stop and retry later.
      if (!isPermanentRejection(err)) break
    }
  }

  return {
    registered,
    ratingsSynced,
    ratingsPending: listarCalificacionesPendientes().length,
    error: registerError ?? pushError,
    businessSync,
  }
}
