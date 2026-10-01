import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type View = 'signin' | 'signup' | 'forgot' | 'confirm'

const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+']

/**
 * Autenticación web/escritorio (Administrador y Usuario web/escritorio):
 * iniciar sesión, registrarse (nombre, apellido, correo, rango de edad),
 * confirmación por correo y recuperación de credenciales.
 */
export default function AuthScreen() {
  const [view, setView] = useState<View>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [ageRange, setAgeRange] = useState(AGE_RANGES[0])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!supabase) return null
  const client = supabase

  async function handleSignIn(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    const { error } = await client.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setError(error.message)
  }

  async function handleSignUp(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName, age_range: ageRange } },
    })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    if (!data.session) {
      setNotice('Te enviamos un correo para confirmar tu cuenta. Revisalo y luego iniciá sesión.')
      setView('confirm')
    }
  }

  async function handleForgot(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    const { error } = await client.auth.resetPasswordForEmail(email)
    setBusy(false)
    if (error) setError(error.message)
    else setNotice('Te enviamos un enlace para recuperar tus credenciales.')
  }

  function resetTo(view: View) {
    setView(view)
    setError(null)
    setNotice(null)
  }

  if (view === 'confirm') {
    return (
      <section>
        <h2>Confirmá tu cuenta</h2>
        <p>{notice ?? 'Te enviamos un correo de confirmación.'}</p>
        <button onClick={() => resetTo('signin')}>Volver a iniciar sesión</button>
      </section>
    )
  }

  return (
    <section>
      {view === 'signin' && (
        <form onSubmit={handleSignIn}>
          <h2>Iniciar sesión</h2>
          <label>
            Correo electrónico
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Contraseña
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button type="submit" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
          <p>
            <button type="button" onClick={() => resetTo('signup')}>Crear cuenta</button>
            {' · '}
            <button type="button" onClick={() => resetTo('forgot')}>Olvidé mi contraseña</button>
          </p>
        </form>
      )}

      {view === 'signup' && (
        <form onSubmit={handleSignUp}>
          <h2>Crear cuenta</h2>
          <label>
            Nombre
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </label>
          <label>
            Apellido
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </label>
          <label>
            Correo electrónico
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Rango de edad
            <select value={ageRange} onChange={(e) => setAgeRange(e.target.value)}>
              {AGE_RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label>
            Contraseña
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </label>
          <button type="submit" disabled={busy}>{busy ? 'Creando…' : 'Registrarme'}</button>
          <p>
            <button type="button" onClick={() => resetTo('signin')}>Ya tengo cuenta</button>
          </p>
        </form>
      )}

      {view === 'forgot' && (
        <form onSubmit={handleForgot}>
          <h2>Recuperar credenciales</h2>
          <label>
            Correo electrónico
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <button type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Enviar enlace'}</button>
          <p>
            <button type="button" onClick={() => resetTo('signin')}>Volver a iniciar sesión</button>
          </p>
        </form>
      )}

      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
    </section>
  )
}
