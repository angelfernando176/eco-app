import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import AuthScreen from './auth/AuthScreen'
import AppShell from './features/shell/AppShell'
import { Alert } from './ui'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!isSupabaseConfigured) {
    return (
      <div className="page">
        <header className="page__header">
          <span className="page__brand">ECO</span>
        </header>
        <main className="page__main page__main--centered">
          <div className="page__content">
            <Alert tone="error">
              Faltan las credenciales de Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
            </Alert>
          </div>
        </main>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="page">
        <header className="page__header">
          <span className="page__brand">ECO</span>
        </header>
        <main className="page__main page__main--centered">
          <div className="stack stack--sm stack--center">
            <span className="spinner spinner--lg" aria-hidden="true" />
            <p>Cargando…</p>
          </div>
        </main>
      </div>
    )
  }

  if (session) {
    return <AppShell session={session} />
  }

  return <AuthScreen />
}
