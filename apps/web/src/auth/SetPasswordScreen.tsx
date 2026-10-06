import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { Alert, AuthLayout, Button, Field } from '../ui'

interface SetPasswordScreenProps {
  onDone: () => void
}

/**
 * Shown instead of the app shell when an invitation or password-recovery link logs the user
 * in without a password (Supabase has no built-in screen for this step).
 */
export default function SetPasswordScreen({ onDone }: SetPasswordScreenProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!supabase) return null
  const client = supabase

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setBusy(true)
    const { error: updateError } = await client.auth.updateUser({ password })
    setBusy(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setNotice('Contraseña actualizada correctamente.')
  }

  return (
    <AuthLayout title="Definí tu contraseña" subtitle="Elegí una contraseña para acceder a tu cuenta.">
      <div className="stack">
        {notice ? (
          <>
            <Alert tone="success">{notice}</Alert>
            <Button type="button" block onClick={onDone}>
              Continuar
            </Button>
          </>
        ) : (
          <form className="stack" onSubmit={handleSubmit}>
            <Field
              label="Nueva contraseña"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <Field
              label="Confirmar contraseña"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
            {error && <Alert tone="error">{error}</Alert>}
            <Button type="submit" block loading={busy}>
              {busy ? 'Guardando…' : 'Guardar contraseña'}
            </Button>
          </form>
        )}
      </div>
    </AuthLayout>
  )
}
