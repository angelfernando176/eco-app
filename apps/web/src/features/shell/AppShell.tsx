import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { useProfile } from '../session/useProfile'
import { Alert, Button } from '../../ui'
import BusinessListPage from '../businesses/BusinessListPage'
import BusinessDetailPage from '../businesses/BusinessDetailPage'

interface AppShellProps {
  session: Session
}

type ShellView = { screen: 'list' } | { screen: 'detail'; businessId: string | null }

export default function AppShell({ session }: AppShellProps) {
  const { profile, isAdmin, hasActiveSubscription, loading, error, reload } = useProfile(session)
  const [view, setView] = useState<ShellView>({ screen: 'list' })

  return (
    <div className="page">
      <header className="page__header">
        <span className="page__brand">ECO</span>
        {profile && (
          <div className="shell__user cluster">
            <span className="shell__user-name">
              {profile.firstName} {profile.lastName}
            </span>
            <span className="shell__user-email">{profile.email}</span>
            <span className={`badge ${isAdmin ? 'badge--admin' : 'badge--user'}`}>
              {isAdmin ? 'Administrador' : 'Usuario'}
            </span>
          </div>
        )}
        <Button variant="secondary" onClick={() => supabase?.auth.signOut()}>
          Cerrar sesión
        </Button>
      </header>
      <main className="page__main">
        {loading && (
          <div className="stack stack--sm stack--center">
            <span className="spinner spinner--lg" aria-hidden="true" />
            <p>Cargando perfil…</p>
          </div>
        )}

        {!loading && error && (
          <div className="page__content stack">
            <Alert tone="error">{error}</Alert>
            <Button variant="secondary" onClick={reload}>
              Reintentar
            </Button>
          </div>
        )}

        {!loading && !error && !profile && (
          <div className="page__content">
            <Alert tone="error">
              No encontramos tu perfil. Si el problema persiste, contactá a un administrador.
            </Alert>
          </div>
        )}

        {!loading && !error && profile && view.screen === 'list' && (
          <BusinessListPage
            profile={profile}
            isAdmin={isAdmin}
            hasActiveSubscription={hasActiveSubscription}
            onCreate={() => setView({ screen: 'detail', businessId: null })}
            onEdit={(businessId) => setView({ screen: 'detail', businessId })}
          />
        )}

        {!loading && !error && profile && view.screen === 'detail' && (
          <BusinessDetailPage
            profile={profile}
            isAdmin={isAdmin}
            hasActiveSubscription={hasActiveSubscription}
            businessId={view.businessId}
            onBack={() => setView({ screen: 'list' })}
          />
        )}
      </main>
    </div>
  )
}
