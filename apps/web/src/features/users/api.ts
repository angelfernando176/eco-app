import type { Subscription, User, UserTypeValue } from '@eco/shared'
import { supabase } from '../../lib/supabase'
import type { SearchableField, SubscriptionBadgeState, UserInput, UserListFilters } from './types'

const SEARCHABLE_FIELDS: SearchableField[] = ['first_name', 'last_name', 'age_range', 'email']

interface UserRow {
  id: string
  first_name: string
  last_name: string
  age_range: string
  email: string
  type: UserTypeValue
  status: 'active' | 'inactive'
  created_at: string
}

interface SubscriptionRow {
  id: string
  user_id: string
  status: 'active' | 'inactive'
  activated_at: string | null
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
  return new Error(error.message)
}

function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    ageRange: row.age_range,
    email: row.email,
    type: row.type,
    status: row.status,
    createdAt: row.created_at,
  }
}

function mapSubscriptionRow(row: SubscriptionRow): Subscription {
  return { id: row.id, userId: row.user_id, status: row.status, activatedAt: row.activated_at }
}

export interface ListUsersParams {
  page: number
  pageSize: number
  filters?: UserListFilters
}

export interface UserListRow {
  user: User
  subscriptionState: SubscriptionBadgeState
}

export interface ListUsersResult {
  rows: UserListRow[]
  total: number
}

/** Admin-only: lists active users with per-field filters, paginated, newest first. */
export async function listUsers({ page, pageSize, filters }: ListUsersParams): Promise<ListUsersResult> {
  const client = requireClient()
  const from = page * pageSize
  const to = from + pageSize - 1

  let query = client
    .from('users')
    .select('id, first_name, last_name, age_range, email, type, status, created_at', { count: 'exact' })
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filters?.type) query = query.eq('type', filters.type)

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
  const users = (data ?? []).map((row) => mapUserRow(row as UserRow))

  const subscriptionByUserId = await loadSubscriptionStates(users.map((u) => u.id))
  const rows: UserListRow[] = users.map((user) => ({
    user,
    subscriptionState: subscriptionByUserId.get(user.id) ?? 'none',
  }))

  return { rows, total: count ?? 0 }
}

/** Loads subscription state for a page of user ids in a single query (avoids N+1). */
async function loadSubscriptionStates(userIds: string[]): Promise<Map<string, SubscriptionBadgeState>> {
  const result = new Map<string, SubscriptionBadgeState>()
  if (userIds.length === 0) return result

  const client = requireClient()
  const { data, error } = await client
    .from('subscriptions')
    .select('user_id, status')
    .in('user_id', userIds)
    .eq('status', 'active')
  if (error) throw mapSupabaseError(error)

  for (const row of data ?? []) {
    result.set((row as { user_id: string }).user_id, 'active')
  }
  return result
}

export interface UserWithSubscription {
  user: User
  subscription: Subscription | null
}

export async function getUser(id: string): Promise<UserWithSubscription> {
  const client = requireClient()
  const { data, error } = await client
    .from('users')
    .select('id, first_name, last_name, age_range, email, type, status, created_at')
    .eq('id', id)
    .single()
  if (error) throw mapSupabaseError(error)

  const subscription = await getSubscription(id)
  return { user: mapUserRow(data as UserRow), subscription }
}

/** Email and type are read-only on edit: email is the Supabase Auth identity (changing it
 * requires re-confirmation via Auth, not this screen) and type is assigned at sign-up. */
export async function updateUser(id: string, input: UserInput): Promise<User> {
  const client = requireClient()
  const { data, error } = await client
    .from('users')
    .update({ first_name: input.firstName, last_name: input.lastName, age_range: input.ageRange })
    .eq('id', id)
    .select('id, first_name, last_name, age_range, email, type, status, created_at')
    .single()
  if (error) throw mapSupabaseError(error)
  return mapUserRow(data as UserRow)
}

/** Soft delete: the inactive row stays in the database but never appears in the active list. */
export async function deactivateUser(id: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('users').update({ status: 'inactive' }).eq('id', id)
  if (error) throw mapSupabaseError(error)
}

export async function getSubscription(userId: string): Promise<Subscription | null> {
  const client = requireClient()
  const { data, error } = await client.from('subscriptions').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw mapSupabaseError(error)
  return data ? mapSubscriptionRow(data as SubscriptionRow) : null
}

/** Inserts the subscription row if missing, otherwise (re)activates it, storing the activation date. */
export async function activateSubscription(userId: string): Promise<Subscription> {
  const client = requireClient()
  const existing = await getSubscription(userId)
  const activatedAt = new Date().toISOString()

  if (!existing) {
    const { data, error } = await client
      .from('subscriptions')
      .insert({ user_id: userId, status: 'active', activated_at: activatedAt })
      .select('*')
      .single()
    if (error) throw mapSupabaseError(error)
    return mapSubscriptionRow(data as SubscriptionRow)
  }

  const { data, error } = await client
    .from('subscriptions')
    .update({ status: 'active', activated_at: activatedAt })
    .eq('id', existing.id)
    .select('*')
    .single()
  if (error) throw mapSupabaseError(error)
  return mapSubscriptionRow(data as SubscriptionRow)
}

/**
 * Hook point for the activation email: sending it needs a server function (Supabase Edge
 * Function + email provider), not available from the browser. This is a no-op placeholder
 * so the UI never claims an email was sent until that later task wires it up.
 */
export function notifySubscriptionActivated(_user: User, _subscription: Subscription): void {
  // Intentionally empty: see doc comment above.
}
