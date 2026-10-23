import { supabase } from '../lib/supabase'

export interface OwnerBusinessSummary {
  id: string
  tradeName: string
  ruc: string
  phone: string
}

export async function listOwnerBusinesses(ownerId: string): Promise<OwnerBusinessSummary[]> {
  if (!supabase) {
    throw new Error('La app no está configurada para conectarse a Supabase.')
  }

  const { data, error } = await supabase
    .from('businesses')
    .select('id, trade_name, ruc, phone')
    .eq('owner_id', ownerId)
    .order('trade_name')

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    tradeName: row.trade_name,
    ruc: row.ruc,
    phone: row.phone,
  }))
}

export interface BusinessAccessDetail {
  id: string
  tradeName: string
  ruc: string
  phone: string
  productName: string
  productPrice: number
}

export async function getBusinessAccessDetail(businessId: string): Promise<BusinessAccessDetail> {
  if (!supabase) {
    throw new Error('La app no está configurada para conectarse a Supabase.')
  }

  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('id, trade_name, ruc, phone')
    .eq('id', businessId)
    .single()

  if (businessError) {
    throw businessError
  }

  const { data: products, error: productError } = await supabase
    .from('products')
    .select('name, price')
    .eq('business_id', businessId)
    .order('created_at')
    .limit(1)

  if (productError) {
    throw productError
  }

  const product = (products ?? [])[0] ?? null

  return {
    id: business.id,
    tradeName: business.trade_name,
    ruc: business.ruc,
    phone: business.phone,
    productName: product?.name ?? '',
    productPrice: product?.price ?? 0,
  }
}

export async function requestSubscriptionActivation(businessId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!supabase) {
    return { ok: false, message: 'La app no está configurada para conectarse a Supabase.' }
  }

  const { error } = await supabase.functions.invoke('eco-request-subscription-activation', {
    body: { businessId },
  })

  if (error) {
    return { ok: false, message: 'No se pudo enviar la solicitud. Intenta nuevamente.' }
  }

  return { ok: true }
}
