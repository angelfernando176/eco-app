import { useState, type FormEvent } from 'react'
import type { Subscription, User } from '@eco/shared'
import { Alert, Button, ConfirmDialog, Field } from '../../ui'
import { AGE_RANGES } from './ageRanges'
import { activateSubscription, notifySubscriptionActivated, updateUser } from './api'
import { USER_FIELD_LIMITS } from './limits'
import { validateUserInput, type UserFieldErrors } from './rules'
import type { UserInput } from './types'

function formatActivatedAt(activatedAt: string): string {
  return new Date(activatedAt).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' })
}

function toFormState(user: User): UserInput {
  return { firstName: user.firstName, lastName: user.lastName, ageRange: user.ageRange }
}

interface UserFormProps {
  user: User
  subscription: Subscription | null
  onUpdated: (user: User) => void
  onSubscriptionActivated: (subscription: Subscription) => void
}

export default function UserForm({ user, subscription, onUpdated, onSubscriptionActivated }: UserFormProps) {
  const [form, setForm] = useState<UserInput>(() => toFormState(user))
  const [fieldErrors, setFieldErrors] = useState<UserFieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  const [activateConfirmOpen, setActivateConfirmOpen] = useState(false)
  const [activateBusy, setActivateBusy] = useState(false)
  const [activateError, setActivateError] = useState<string | null>(null)
  const [activateSuccess, setActivateSuccess] = useState<string | null>(null)

  const isSubscriptionActive = subscription?.status === 'active'

  function setField<K extends keyof UserInput>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(null)

    const errors = validateUserInput(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      const updated = await updateUser(user.id, form)
      setSubmitSuccess('Usuario actualizado correctamente.')
      onUpdated(updated)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'No se pudo guardar el usuario.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleConfirmActivate() {
    setActivateBusy(true)
    setActivateError(null)
    try {
      const activated = await activateSubscription(user.id)
      notifySubscriptionActivated(user, activated)
      setActivateSuccess('Suscripción activada correctamente.')
      onSubscriptionActivated(activated)
      setActivateConfirmOpen(false)
    } catch (err) {
      setActivateError(err instanceof Error ? err.message : 'No se pudo activar la suscripción.')
    } finally {
      setActivateBusy(false)
    }
  }

  return (
    <div className="stack">
      <form className="stack user-form" onSubmit={handleSubmit}>
        <section className="form-section">
          <h3 className="form-section__title">Datos del usuario</h3>
          <div className="form-grid">
            <Field
              label="Nombre"
              value={form.firstName}
              onChange={(e) => setField('firstName', e.target.value)}
              error={fieldErrors.firstName}
              maxLength={USER_FIELD_LIMITS.firstName.max}
              required
            />
            <Field
              label="Apellido"
              value={form.lastName}
              onChange={(e) => setField('lastName', e.target.value)}
              error={fieldErrors.lastName}
              maxLength={USER_FIELD_LIMITS.lastName.max}
              required
            />
            <Field as="select" label="Rango de edad" value={form.ageRange} onChange={(e) => setField('ageRange', e.target.value)}>
              {AGE_RANGES.map((range) => (
                <option key={range} value={range}>
                  {range}
                </option>
              ))}
            </Field>
            <Field
              label="Correo electrónico"
              value={user.email}
              readOnly
              disabled
              hint="El correo no se puede editar desde esta pantalla: es la identidad de acceso del usuario."
            />
            <Field
              label="Tipo"
              value={user.type === 1 ? 'Web/escritorio' : 'Móvil'}
              readOnly
              disabled
              hint="El tipo se asigna al registrarse y no se puede editar desde esta pantalla."
            />
          </div>
        </section>

        {submitError && <Alert tone="error">{submitError}</Alert>}
        {submitSuccess && <Alert tone="success">{submitSuccess}</Alert>}

        <Button type="submit" loading={submitting}>
          {submitting ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </form>

      <section className="form-section">
        <h3 className="form-section__title">Suscripción</h3>
        {isSubscriptionActive && subscription?.activatedAt ? (
          <p className="field__hint">Activa desde el {formatActivatedAt(subscription.activatedAt)}.</p>
        ) : (
          <p className="field__hint">Sin suscripción activa.</p>
        )}

        <Button
          type="button"
          disabled={isSubscriptionActive}
          title={isSubscriptionActive ? 'La suscripción ya está activa.' : undefined}
          onClick={() => setActivateConfirmOpen(true)}
        >
          Activar suscripción
        </Button>

        {activateError && <Alert tone="error">{activateError}</Alert>}
        {activateSuccess && <Alert tone="success">{activateSuccess}</Alert>}
      </section>

      <ConfirmDialog
        open={activateConfirmOpen}
        title="Activar suscripción"
        message="Se activará la suscripción del usuario y se registrará la fecha de activación."
        confirmLabel="Activar"
        busy={activateBusy}
        onConfirm={handleConfirmActivate}
        onCancel={() => {
          setActivateConfirmOpen(false)
          setActivateError(null)
        }}
      />
    </div>
  )
}
