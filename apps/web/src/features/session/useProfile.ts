import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'
import type { User } from '@eco/shared'
import { supabase } from '../../lib/supabase'

export interface UseProfileResult {
  profile: User | null
  isAdmin: boolean
  hasActiveSubscription: boolean
  loading: boolean
  error: string | null
  reload: () => void
}

interface UserRow {
  id: string
  first_name: string
  last_name: string
  age_range: string
  email: string
  type: 1 | 2
  status: 'active' | 'inactive'
  created_at: string
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

/**
 * Resolves the signed-in profile (`eco.users` row), admin claim
 * (`app_metadata.role === 'admin'`) and active subscription for the given session.
 */
export function useProfile(session: Session | null): UseProfileResult {
  const [profile, setProfile] = useState<User | null>(null)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const isAdmin = session?.user.app_metadata?.role === 'admin'

  useEffect(() => {
    if (!session || !supabase) {
      setProfile(null)
      setHasActiveSubscription(false)
      setLoading(false)
      setError(null)
      return
    }

    const client = supabase
    let cancelled = false
    setLoading(true)
    setError(null)

    async function load() {
      try {
        const { data: userRow, error: userError } = await client
          .from('users')
          .select('id, first_name, last_name, age_range, email, type, status, created_at')
          .eq('auth_user_id', session!.user.id)
          .maybeSingle()
        if (userError) throw userError
        if (cancelled) return

        const mapped = userRow ? mapUserRow(userRow as UserRow) : null
        setProfile(mapped)

        if (!mapped) {
          setHasActiveSubscription(false)
          return
        }

        const { data: subRow, error: subError } = await client
          .from('subscriptions')
          .select('id')
          .eq('user_id', mapped.id)
          .eq('status', 'active')
          .maybeSingle()
        if (subError) throw subError
        if (cancelled) return
        setHasActiveSubscription(Boolean(subRow))
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'No se pudo cargar el perfil.')
          setProfile(null)
          setHasActiveSubscription(false)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [session, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])

  return { profile, isAdmin, hasActiveSubscription, loading, error, reload }
}
