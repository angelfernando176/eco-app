/**
 * Dependency-free business registration/edit/deactivation logic (validation,
 * payload building, sync decisions) so it can be sanity-checked outside of
 * Expo/React Native. Mirrors syncLogic.ts.
 */

import { validateSkillName } from './mobileContentLogic'

export { isPermanentRejection, mapSyncErrorToSpanish } from './syncLogic'

export const DEACTIVATION_REASONS = [
  { value: 'closed', label: 'Cerré el negocio' },
  { value: 'no_time', label: 'No tengo tiempo para mantenerlo' },
  { value: 'app_issues', label: 'Tengo problemas con la aplicación' },
  { value: 'other', label: 'Otro' },
] as const

export type DeactivationReason = (typeof DEACTIVATION_REASONS)[number]['value']

export interface BusinessFormInput {
  tradeName: string
  ruc: string
  phone: string
  productName: string
  productPrice: number
  skillName?: string
}

export interface BusinessEditInput {
  tradeName: string
  ruc: string
  phone: string
  productName: string
  productPrice: number
}

export interface BusinessFieldError {
  field: 'tradeName' | 'ruc' | 'phone' | 'productName' | 'productPrice' | 'skillName'
  message: string
}

export function validateBusinessInput(input: BusinessFormInput | BusinessEditInput): BusinessFieldError[] {
  const errors: BusinessFieldError[] = []

  const tradeName = input.tradeName.trim()
  if (tradeName.length < 2 || tradeName.length > 100) {
    errors.push({ field: 'tradeName', message: 'El nombre del negocio debe tener entre 2 y 100 caracteres.' })
  }

  const ruc = input.ruc.trim()
  if (ruc.length < 1 || ruc.length > 20) {
    errors.push({ field: 'ruc', message: 'El RUC debe tener entre 1 y 20 caracteres.' })
  }

  const phone = input.phone.trim()
  if (phone.length < 1 || phone.length > 20) {
    errors.push({ field: 'phone', message: 'El teléfono debe tener entre 1 y 20 caracteres.' })
  }

  const productName = input.productName.trim()
  if (productName.length < 1 || productName.length > 100) {
    errors.push({ field: 'productName', message: 'El nombre del producto debe tener entre 1 y 100 caracteres.' })
  }

  if (!Number.isFinite(input.productPrice) || input.productPrice < 0) {
    errors.push({ field: 'productPrice', message: 'El precio debe ser un número mayor o igual a 0.' })
  }

  if ('skillName' in input && input.skillName && input.skillName.trim().length > 0) {
    const skillError = validateSkillName(input.skillName)
    if (skillError) {
      errors.push({ field: 'skillName', message: skillError })
    }
  }

  return errors
}

export interface RegisterBusinessPayload {
  p_owner_id: string
  p_trade_name: string
  p_ruc: string
  p_phone: string
  p_latitude: number
  p_longitude: number
  p_product_name: string
  p_product_price: number
}

export function buildRegisterPayload(
  ownerRemoteId: string,
  coords: { latitude: number; longitude: number },
  input: BusinessFormInput
): RegisterBusinessPayload {
  return {
    p_owner_id: ownerRemoteId,
    p_trade_name: input.tradeName.trim(),
    p_ruc: input.ruc.trim(),
    p_phone: input.phone.trim(),
    p_latitude: coords.latitude,
    p_longitude: coords.longitude,
    p_product_name: input.productName.trim(),
    p_product_price: input.productPrice,
  }
}

export interface UpdateBusinessPayload {
  p_business_id: string
  p_owner_id: string
  p_trade_name: string
  p_ruc: string
  p_phone: string
  p_latitude: number
  p_longitude: number
  p_product_name: string
  p_product_price: number
}

export function buildUpdatePayload(
  businessRemoteId: string,
  ownerRemoteId: string,
  coords: { latitude: number; longitude: number },
  input: BusinessEditInput
): UpdateBusinessPayload {
  return {
    p_business_id: businessRemoteId,
    p_owner_id: ownerRemoteId,
    p_trade_name: input.tradeName.trim(),
    p_ruc: input.ruc.trim(),
    p_phone: input.phone.trim(),
    p_latitude: coords.latitude,
    p_longitude: coords.longitude,
    p_product_name: input.productName.trim(),
    p_product_price: input.productPrice,
  }
}

export interface DeactivateBusinessPayload {
  p_business_id: string
  p_owner_id: string
  p_reason: DeactivationReason
  p_comment: string
}

export function buildDeactivatePayload(
  businessRemoteId: string,
  ownerRemoteId: string,
  reason: DeactivationReason,
  comment: string
): DeactivateBusinessPayload {
  return {
    p_business_id: businessRemoteId,
    p_owner_id: ownerRemoteId,
    p_reason: reason,
    p_comment: comment.trim().slice(0, 500),
  }
}

export interface NegocioSyncState {
  pendingAction: 'create' | 'update' | 'deactivate' | null
  remoteId: string | null
}

export type BusinessSyncAction = 'register' | 'update' | 'deactivate' | 'none'

/**
 * A pending 'update' or 'deactivate' with no remoteId is an inconsistent local
 * state (it implies a prior register never completed): fall back to 'register'
 * so the correction heals the row instead of calling an RPC that needs an id
 * the server has never seen.
 */
export function decideBusinessSyncAction(negocio: NegocioSyncState): BusinessSyncAction {
  if (negocio.pendingAction === null) return 'none'

  if (negocio.pendingAction === 'create') return 'register'

  if (negocio.remoteId === null) return 'register'

  return negocio.pendingAction
}
