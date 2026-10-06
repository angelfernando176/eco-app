import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { useProfile } from '../session/useProfile'
import { Alert, Button } from '../../ui'
import BusinessListPage from '../businesses/BusinessListPage'
import BusinessDetailPage from '../businesses/BusinessDetailPage'
import UserListPage from '../users/UserListPage'
import UserDetailPage from '../users/UserDetailPage'
import UserCreatePage from '../users/UserCreatePage'

interface AppShellProps {
  session: Session
}

type ShellSection = 'businesses' | 'users'

type ShellView =
  | { screen: 'list' }
  | { screen: 'detail'; businessId: string | null }
  | { screen: 'userDetail'; userId: string }
  | { screen: 'userCreate' }

export default function AppShell({ session }: AppShellProps) {
  const { profile, isAdmin, hasActiveSubscription, loading, error, reload } = useProfile(session)
  const [section, setSection] = useState<ShellSection>('businesses')
  const [view, setView] = useState<ShellView>({ screen: 'list' })

  /** Non-admins never reach the users section even if view/section state is forced externally. */
  const effectiveSection: ShellSection = isAdmin ? section : 'businesses'

  function selectSection(next: ShellSection) {
    if (next === 'users' && !isAdmin) return
    setSection(next)
    setView({ screen: 'list' })
  }

  return (
    <div className="page">
      <header className="page__header">
        <span className="page__brand">ECO</span>
        {profile && (
          <nav className="shell__nav" aria-label="Secciones">
            <button
              type="button"
              className={`shell__nav-tab ${section === 'businesses' ? 'shell__nav-tab--active' : ''}`}
              onClick={() => selectSection('businesses')}
            >
              Negocios
            </button>
            {isAdmin && (
              <button
                type="button"
                className={`shell__nav-tab ${section === 'users' ? 'shell__nav-tab--active' : ''}`}
                onClick={() => selectSection('users')}
              >
                Usuarios
              </button>
            )}
          </nav>
        )}
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

        {!loading && !error && profile && effectiveSection === 'businesses' && view.screen === 'list' && (
          <BusinessListPage
            profile={profile}
            isAdmin={isAdmin}
            hasActiveSubscription={hasActiveSubscription}
            onCreate={() => setView({ screen: 'detail', businessId: null })}
            onEdit={(businessId) => setView({ screen: 'detail', businessId })}
          />
        )}

        {!loading && !error && profile && effectiveSection === 'businesses' && view.screen === 'detail' && (
          <BusinessDetailPage
            profile={profile}
            isAdmin={isAdmin}
            hasActiveSubscription={hasActiveSubscription}
            businessId={view.businessId}
            onBack={() => setView({ screen: 'list' })}
          />
        )}

        {!loading && !error && profile && effectiveSection === 'users' && view.screen === 'list' && (
          <UserListPage
            profile={profile}
            onCreate={() => setView({ screen: 'userCreate' })}
            onEdit={(userId) => setView({ screen: 'userDetail', userId })}
          />
        )}

        {!loading && !error && profile && effectiveSection === 'users' && view.screen === 'userDetail' && (
          <UserDetailPage userId={view.userId} onBack={() => setView({ screen: 'list' })} />
        )}

        {!loading && !error && profile && effectiveSection === 'users' && view.screen === 'userCreate' && (
          <UserCreatePage onBack={() => setView({ screen: 'list' })} onCreated={() => setView({ screen: 'list' })} />
        )}
      </main>
    </div>
  )
}
