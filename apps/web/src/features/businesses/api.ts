import type { Business } from '@eco/shared'
import { supabase } from '../../lib/supabase'
import type { BusinessInput, CreateBusinessInput, SearchableField, WebUserOption } from './types'

const SEARCHABLE_FIELDS: SearchableField[] = [
  'trade_name',
  'ruc',
  'phone',
  'representative_email',
  'main_street',
  'secondary_street',
  'number',
  'reference',
]

interface BusinessRow {
  id: string
  owner_id: string
  trade_name: string
  ruc: string
  phone: string
  representative_email: string
  logo_url: string | null
  latitude: number
  longitude: number
  main_street: string
  secondary_street: string
  number: string
  reference: string
  created_at: string
  updated_at: string
}

interface WebUserRow {
  id: string
  first_name: string
  last_name: string
  email: string
}

function requireClient() {
  if (!supabase) throw new Error('Supabase no está configurado.')
  return supabase
}

/** Strips PostgREST `ilike` wildcard/separator characters from user-provided filter text. */
function sanitizeFilterValue(value: string): string {
  return value.replace(/[%,]/g, '')
}

function mapSupabaseError(error: { message: string }): Error {
  if (error.message.includes('business limit exceeded')) {
    return new Error('Sin suscripción activa solo podés tener 1 negocio.')
  }
  return new Error(error.message)
}

function mapBusinessRow(row: BusinessRow): Business {
  return {
    id: row.id,
    ownerId: row.owner_id,
    tradeName: row.trade_name,
    ruc: row.ruc,
    phone: row.phone,
    representativeEmail: row.representative_email,
    logoUrl: row.logo_url,
    coordinates: { latitude: row.latitude, longitude: row.longitude },
    address: {
      mainStreet: row.main_street,
      secondaryStreet: row.secondary_street,
      number: row.number,
      reference: row.reference,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toBusinessRowInput(input: BusinessInput) {
  return {
    trade_name: input.tradeName,
    ruc: input.ruc,
    phone: input.phone,
    representative_email: input.representativeEmail,
    latitude: input.latitude,
    longitude: input.longitude,
    main_street: input.mainStreet,
    secondary_street: input.secondaryStreet,
    number: input.number,
    reference: input.reference,
  }
}

export interface ListBusinessesParams {
  /** REQUIRED for non-admins: the businesses SELECT policy is public, so the
   * server does not scope rows to the caller. */
  ownerId?: string
  page: number
  pageSize: number
  filters?: Partial<Record<SearchableField, string>>
}

export interface ListBusinessesResult {
  rows: Business[]
  total: number
}

export async function listBusinesses({
  ownerId,
  page,
  pageSize,
  filters,
}: ListBusinessesParams): Promise<ListBusinessesResult> {
  const client = requireClient()
  const from = page * pageSize
  const to = from + pageSize - 1

  let query = client
    .from('businesses')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (ownerId) query = query.eq('owner_id', ownerId)

  if (filters) {
    for (const field of SEARCHABLE_FIELDS) {
      const raw = filters[field]
      if (!raw) continue
      const sanitized = sanitizeFilterValue(raw)
      if (sanitized) query = query.ilike(field, `%${sanitized}%`)
    }
  }

  const { data, error, count } = await query
  if (error) throw mapSupabaseError(error)
  return { rows: (data ?? []).map((row) => mapBusinessRow(row as BusinessRow)), total: count ?? 0 }
}

export async function getBusiness(id: string): Promise<Business> {
  const client = requireClient()
  const { data, error } = await client.from('businesses').select('*').eq('id', id).single()
  if (error) throw mapSupabaseError(error)
  return mapBusinessRow(data as BusinessRow)
}

export async function createBusiness(input: CreateBusinessInput): Promise<Business> {
  const client = requireClient()
  const { data, error } = await client
    .from('businesses')
    .insert({ owner_id: input.ownerId, ...toBusinessRowInput(input) })
    .select('*')
    .single()
  if (error) throw mapSupabaseError(error)
  return mapBusinessRow(data as BusinessRow)
}

export async function updateBusiness(id: string, input: BusinessInput): Promise<Business> {
  const client = requireClient()
  const { data, error } = await client
    .from('businesses')
    .update(toBusinessRowInput(input))
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw mapSupabaseError(error)
  return mapBusinessRow(data as BusinessRow)
}

/** Admin only: enforced by the `businesses_delete_admin` RLS policy. */
export async function deleteBusiness(id: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('businesses').delete().eq('id', id)
  if (error) throw mapSupabaseError(error)
}

export async function countOwnedBusinesses(ownerId: string): Promise<number> {
  const client = requireClient()
  const { count, error } = await client
    .from('businesses')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
  if (error) throw mapSupabaseError(error)
  return count ?? 0
}

/** Options for the admin's owner picker when creating a business. */
export async function listWebUsers(): Promise<WebUserOption[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('users')
    .select('id, first_name, last_name, email')
    .eq('type', 1)
    .eq('status', 'active')
    .order('first_name', { ascending: true })
  if (error) throw mapSupabaseError(error)
  return (data ?? []).map((row) => {
    const r = row as WebUserRow
    return { id: r.id, firstName: r.first_name, lastName: r.last_name, email: r.email }
  })
}
