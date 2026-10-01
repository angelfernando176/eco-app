import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import AuthScreen from './auth/AuthScreen'

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
      <main>
        <h1>ECO</h1>
        <p>Faltan las credenciales de Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).</p>
      </main>
    )
  }

  if (loading) {
    return (
      <main>
        <h1>ECO</h1>
        <p>Cargando…</p>
      </main>
    )
  }

  if (session) {
    return (
      <main>
        <h1>ECO</h1>
        <p>
          Sesión iniciada como <strong>{session.user.email}</strong>.
        </p>
        <button onClick={() => supabase!.auth.signOut()}>Cerrar sesión</button>
      </main>
    )
  }

  return (
    <main>
      <h1>ECO</h1>
      <p>Buscá negocios registrados.</p>
      <AuthScreen />
    </main>
  )
}
