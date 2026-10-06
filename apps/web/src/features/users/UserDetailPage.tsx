import { useEffect, useState } from 'react'
import type { Subscription, User } from '@eco/shared'
import { Alert, Button, PageHeader } from '../../ui'
import { getUser } from './api'
import UserForm from './UserForm'

interface UserDetailPageProps {
  userId: string
  onBack: () => void
}

export default function UserDetailPage({ userId, onBack }: UserDetailPageProps) {
  const [user, setUser] = useState<User | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    getUser(userId)
      .then((loaded) => {
        if (cancelled) return
        setUser(loaded.user)
        setSubscription(loaded.subscription)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'No se pudo cargar el usuario.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  return (
    <div className="page__content page__content--wide">
      <PageHeader
        title="Editar usuario"
        actions={
          <Button type="button" variant="secondary" onClick={onBack}>
            Volver al listado
          </Button>
        }
      />

      {loading && (
        <div className="stack stack--sm stack--center">
          <span className="spinner spinner--lg" aria-hidden="true" />
          <p>Cargando…</p>
        </div>
      )}

      {!loading && loadError && <Alert tone="error">{loadError}</Alert>}

      {!loading && !loadError && user && (
        <UserForm
          user={user}
          subscription={subscription}
          onUpdated={setUser}
          onSubscriptionActivated={setSubscription}
        />
      )}
    </div>
  )
}
