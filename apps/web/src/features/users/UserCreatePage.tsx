import { useState, type FormEvent } from 'react'
import { Alert, Button, Field, PageHeader } from '../../ui'
import { AGE_RANGES } from './ageRanges'
import { createWebUser, WebFunctionError } from './api'
import { USER_FIELD_LIMITS } from './limits'
import { validateCreateUserInput, type CreateUserFieldErrors } from './rules'
import type { CreateUserInput } from './types'

const INITIAL_FORM: CreateUserInput = { email: '', firstName: '', lastName: '', ageRange: AGE_RANGES[0] ?? '' }

interface CreateOutcome {
  email: string
  emailSent: boolean
  emailError?: string
}

interface UserCreatePageProps {
  onBack: () => void
  onCreated: () => void
}

export default function UserCreatePage({ onBack, onCreated }: UserCreatePageProps) {
  const [form, setForm] = useState<CreateUserInput>(INITIAL_FORM)
  const [fieldErrors, setFieldErrors] = useState<CreateUserFieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<CreateOutcome | null>(null)

  function setField<K extends keyof CreateUserInput>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitError(null)

    const errors = validateCreateUserInput(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      const response = await createWebUser(form)
      setOutcome({ email: form.email, emailSent: response.emailSent, emailError: response.emailError })
      onCreated()
    } catch (err) {
      if (err instanceof WebFunctionError && err.status === 409) {
        setFieldErrors((prev) => ({ ...prev, email: err.message }))
      } else {
        setSubmitError(err instanceof Error ? err.message : 'No se pudo crear el usuario.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const backButton = (
    <Button type="button" variant="secondary" onClick={onBack}>
      Volver al listado
    </Button>
  )

  if (outcome) {
    return (
      <div className="page__content page__content--wide">
        <PageHeader title="Crear usuario" actions={backButton} />
        {outcome.emailSent ? (
          <Alert tone="success">
            La cuenta se creó correctamente y se envió un correo a {outcome.email} para que defina su contraseña.
          </Alert>
        ) : (
          <Alert tone="error">
            La cuenta se creó correctamente, pero no se pudo enviar el correo de invitación a {outcome.email}
            {outcome.emailError ? `: ${outcome.emailError}` : '.'}
          </Alert>
        )}
        {backButton}
      </div>
    )
  }

  return (
    <div className="page__content page__content--wide">
      <PageHeader title="Crear usuario" actions={backButton} />

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
            <Field
              label="Correo electrónico"
              type="email"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              error={fieldErrors.email}
              required
            />
            <Field
              as="select"
              label="Rango de edad"
              value={form.ageRange}
              onChange={(e) => setField('ageRange', e.target.value)}
              error={fieldErrors.ageRange}
            >
              {AGE_RANGES.map((range) => (
                <option key={range} value={range}>
                  {range}
                </option>
              ))}
            </Field>
          </div>
          <span className="field__hint">
            Se creará una cuenta de usuario web/escritorio y se le enviará un correo para que defina su contraseña.
          </span>
        </section>

        {submitError && <Alert tone="error">{submitError}</Alert>}

        <Button type="submit" loading={submitting}>
          {submitting ? 'Creando…' : 'Crear usuario'}
        </Button>
      </form>
    </div>
  )
}
