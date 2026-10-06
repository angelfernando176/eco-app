import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import AuthScreen from './auth/AuthScreen'
import SetPasswordScreen from './auth/SetPasswordScreen'
import AppShell from './features/shell/AppShell'
import { Alert } from './ui'

// Captured at module load, before the Supabase client's URL-hash session detection can strip
// it: an invite or password-recovery redirect logs the user in without a password, and the
// app has no other signal to tell those links apart from a normal sign-in once that happens.
const initialHash = typeof window !== 'undefined' ? window.location.hash : ''
const isInviteOrRecoveryLink = /type=(invite|recovery)/.test(initialHash)

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [recoveryMode, setRecoveryMode] = useState(isInviteOrRecoveryLink)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!isInviteOrRecoveryLink || data.session) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
      if (s) setLoading(false)
    })
    // Safety net: a used or expired invite link may never produce a session, so stop waiting.
    const fallback = window.setTimeout(() => setLoading(false), 5000)
    return () => {
      window.clearTimeout(fallback)
      sub.subscription.unsubscribe()
    }
  }, [])

  function finishRecovery() {
    setRecoveryMode(false)
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }

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

  if (session && recoveryMode) {
    return <SetPasswordScreen onDone={finishRecovery} />
  }

  if (session) {
    return <AppShell session={session} />
  }

  return <AuthScreen />
}
