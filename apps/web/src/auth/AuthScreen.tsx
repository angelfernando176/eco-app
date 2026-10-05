import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { Alert, AuthLayout, Button, Field } from '../ui'

type View = 'signin' | 'signup' | 'forgot' | 'confirm'

const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+']

const VIEW_TITLES: Record<View, string> = {
  signin: 'Iniciar sesión',
  signup: 'Crear cuenta',
  forgot: 'Recuperar credenciales',
  confirm: 'Confirmá tu cuenta',
}

interface EmailFieldProps {
  value: string
  onChange: (value: string) => void
}

function EmailField({ value, onChange }: EmailFieldProps) {
  return (
    <Field
      label="Correo electrónico"
      type="email"
      autoComplete="email"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
    />
  )
}

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
      <AuthLayout title={VIEW_TITLES.confirm}>
        <div className="stack">
          <Alert tone="info">{notice ?? 'Te enviamos un correo de confirmación.'}</Alert>
          <Button variant="secondary" block onClick={() => resetTo('signin')}>
            Volver a iniciar sesión
          </Button>
        </div>
      </AuthLayout>
    )
  }

  const subtitle = view === 'signin' ? 'Buscá negocios registrados.' : undefined

  return (
    <AuthLayout title={VIEW_TITLES[view]} subtitle={subtitle}>
      <div className="stack">
        {view === 'signin' && (
          <form className="stack" onSubmit={handleSignIn}>
            <EmailField value={email} onChange={setEmail} />
            <Field
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" block loading={busy}>
              {busy ? 'Ingresando…' : 'Ingresar'}
            </Button>
            <div className="cluster">
              <Button type="button" variant="link" onClick={() => resetTo('signup')}>
                Crear cuenta
              </Button>
              <Button type="button" variant="link" onClick={() => resetTo('forgot')}>
                Olvidé mi contraseña
              </Button>
            </div>
          </form>
        )}

        {view === 'signup' && (
          <form className="stack" onSubmit={handleSignUp}>
            <Field
              label="Nombre"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Field
              label="Apellido"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
            <EmailField value={email} onChange={setEmail} />
            <Field as="select" label="Rango de edad" value={ageRange} onChange={(e) => setAgeRange(e.target.value)}>
              {AGE_RANGES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Field>
            <Field
              label="Contraseña"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <Button type="submit" block loading={busy}>
              {busy ? 'Creando…' : 'Registrarme'}
            </Button>
            <Button type="button" variant="link" onClick={() => resetTo('signin')}>
              Ya tengo cuenta
            </Button>
          </form>
        )}

        {view === 'forgot' && (
          <form className="stack" onSubmit={handleForgot}>
            <EmailField value={email} onChange={setEmail} />
            <Button type="submit" block loading={busy}>
              {busy ? 'Enviando…' : 'Enviar enlace'}
            </Button>
            <Button type="button" variant="link" onClick={() => resetTo('signin')}>
              Volver a iniciar sesión
            </Button>
          </form>
        )}

        {error && <Alert tone="error">{error}</Alert>}
        {notice && <Alert tone="info">{notice}</Alert>}
      </div>
    </AuthLayout>
  )
}
