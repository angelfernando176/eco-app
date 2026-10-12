import { supabase } from '../lib/supabase'

export interface AdminBusinessSummary {
  id: string
  tradeName: string
  ruc: string
  phone: string
  ownerId: string
}

export async function listBusinessesAdmin(query: string): Promise<AdminBusinessSummary[]> {
  if (!supabase) {
    throw new Error('La app no está configurada para conectarse a Supabase.')
  }

  let request = supabase.from('businesses').select('id, trade_name, ruc, phone, owner_id').order('trade_name').limit(50)

  const trimmed = query.trim()
  if (trimmed.length > 0) {
    request = request.ilike('trade_name', `%${trimmed}%`)
  }

  const { data, error } = await request
  if (error) {
    throw error
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    tradeName: row.trade_name,
    ruc: row.ruc,
    phone: row.phone,
    ownerId: row.owner_id,
  }))
}

export interface AdminBusinessDetail {
  id: string
  ownerId: string
  tradeName: string
  ruc: string
  phone: string
  latitude: number
  longitude: number
  productId: string | null
  productName: string
  productPrice: number
  skills: { id: string; name: string }[]
}

export async function getBusinessDetailAdmin(businessId: string): Promise<AdminBusinessDetail> {
  if (!supabase) {
    throw new Error('La app no está configurada para conectarse a Supabase.')
  }

  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('id, owner_id, trade_name, ruc, phone, latitude, longitude')
    .eq('id', businessId)
    .single()

  if (businessError) {
    throw businessError
  }

  const { data: products, error: productError } = await supabase
    .from('products')
    .select('id, name, price')
    .eq('business_id', businessId)
    .order('created_at')
    .limit(1)

  if (productError) {
    throw productError
  }

  const { data: skills, error: skillError } = await supabase.from('skills').select('id, name').eq('business_id', businessId)

  if (skillError) {
    throw skillError
  }

  const product = (products ?? [])[0] ?? null

  return {
    id: business.id,
    ownerId: business.owner_id,
    tradeName: business.trade_name,
    ruc: business.ruc,
    phone: business.phone,
    latitude: business.latitude,
    longitude: business.longitude,
    productId: product?.id ?? null,
    productName: product?.name ?? '',
    productPrice: product?.price ?? 0,
    skills: skills ?? [],
  }
}

export interface AdminBusinessUpdateInput {
  tradeName: string
  ruc: string
  phone: string
  latitude: number
  longitude: number
  productName: string
  productPrice: number
}

export async function updateBusinessAdmin(
  businessId: string,
  input: AdminBusinessUpdateInput,
  productId: string | null
): Promise<void> {
  if (!supabase) {
    throw new Error('La app no está configurada para conectarse a Supabase.')
  }

  const { error: businessError } = await supabase
    .from('businesses')
    .update({
      trade_name: input.tradeName,
      ruc: input.ruc,
      phone: input.phone,
      latitude: input.latitude,
      longitude: input.longitude,
    })
    .eq('id', businessId)

  if (businessError) {
    throw businessError
  }

  if (productId) {
    const { error: productError } = await supabase
      .from('products')
      .update({ name: input.productName, price: input.productPrice })
      .eq('id', productId)

    if (productError) {
      throw productError
    }
  } else {
    const { error: productError } = await supabase.from('products').insert({
      business_id: businessId,
      name: input.productName,
      price: input.productPrice,
      is_primary: false,
      is_secondary: false,
    })

    if (productError) {
      throw productError
    }
  }
}

export async function resetBusinessPasswordAdmin(businessId: string, newPassword: string): Promise<void> {
  if (!supabase) {
    throw new Error('La app no está configurada para conectarse a Supabase.')
  }

  const { error } = await supabase.rpc('admin_set_business_password', {
    p_business_id: businessId,
    p_new_password: newPassword,
  })

  if (error) {
    throw error
  }
}

export async function addSkillAdmin(businessId: string, ownerId: string, name: string): Promise<void> {
  if (!supabase) {
    throw new Error('La app no está configurada para conectarse a Supabase.')
  }

  const { error } = await supabase.rpc('add_mobile_skill', {
    p_business_id: businessId,
    p_owner_id: ownerId,
    p_name: name,
  })

  if (error) {
    throw error
  }
}

export async function deleteSkillAdmin(skillId: string, ownerId: string): Promise<void> {
  if (!supabase) {
    throw new Error('La app no está configurada para conectarse a Supabase.')
  }

  const { error } = await supabase.rpc('delete_mobile_skill', {
    p_skill_id: skillId,
    p_owner_id: ownerId,
  })

  if (error) {
    throw error
  }
}
