import { useEffect, useState, type FormEvent } from 'react'
import type { Business, User } from '@eco/shared'
import { Alert, Button, Field } from '../../ui'
import { createBusiness, listWebUsers, updateBusiness } from './api'
import { validateBusinessInput, type BusinessFieldErrors } from './rules'
import type { BusinessInput, WebUserOption } from './types'

interface FormState {
  tradeName: string
  ruc: string
  phone: string
  representativeEmail: string
  latitude: string
  longitude: string
  mainStreet: string
  secondaryStreet: string
  number: string
  reference: string
}

function toFormState(business: Business | null): FormState {
  if (!business) {
    return {
      tradeName: '',
      ruc: '',
      phone: '',
      representativeEmail: '',
      latitude: '',
      longitude: '',
      mainStreet: '',
      secondaryStreet: '',
      number: '',
      reference: '',
    }
  }
  return {
    tradeName: business.tradeName,
    ruc: business.ruc,
    phone: business.phone,
    representativeEmail: business.representativeEmail,
    latitude: String(business.coordinates.latitude),
    longitude: String(business.coordinates.longitude),
    mainStreet: business.address.mainStreet,
    secondaryStreet: business.address.secondaryStreet,
    number: business.address.number,
    reference: business.address.reference,
  }
}

interface BusinessFormProps {
  profile: User
  isAdmin: boolean
  business: Business | null
  onCreated: (business: Business) => void
  onUpdated: (business: Business) => void
}

export default function BusinessForm({ profile, isAdmin, business, onCreated, onUpdated }: BusinessFormProps) {
  const isCreate = business === null
  const [form, setForm] = useState<FormState>(() => toFormState(business))
  const [fieldErrors, setFieldErrors] = useState<BusinessFieldErrors>({})

  const [owners, setOwners] = useState<WebUserOption[]>([])
  const [ownerId, setOwnerId] = useState('')
  const [ownerError, setOwnerError] = useState<string | null>(null)
  const [ownersLoading, setOwnersLoading] = useState(false)
  const [ownersError, setOwnersError] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  const showOwnerPicker = isAdmin && isCreate

  useEffect(() => {
    if (!showOwnerPicker) return
    let cancelled = false
    setOwnersLoading(true)
    setOwnersError(null)
    listWebUsers()
      .then((list) => {
        if (!cancelled) setOwners(list)
      })
      .catch((err) => {
        if (!cancelled) setOwnersError(err instanceof Error ? err.message : 'No se pudo cargar la lista de usuarios.')
      })
      .finally(() => {
        if (!cancelled) setOwnersLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [showOwnerPicker])

  function setField<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(null)

    const input: BusinessInput = {
      tradeName: form.tradeName,
      ruc: form.ruc,
      phone: form.phone,
      representativeEmail: form.representativeEmail,
      latitude: form.latitude.trim() === '' ? Number.NaN : Number(form.latitude),
      longitude: form.longitude.trim() === '' ? Number.NaN : Number(form.longitude),
      mainStreet: form.mainStreet,
      secondaryStreet: form.secondaryStreet,
      number: form.number,
      reference: form.reference,
    }

    const errors = validateBusinessInput(input)
    setFieldErrors(errors)

    let ownerIdToUse = profile.id
    let ownerIsInvalid = false
    if (showOwnerPicker) {
      if (!ownerId) {
        ownerIsInvalid = true
        setOwnerError('Seleccioná el dueño del negocio.')
      } else {
        ownerIdToUse = ownerId
        setOwnerError(null)
      }
    }

    if (Object.keys(errors).length > 0 || ownerIsInvalid) return

    setSubmitting(true)
    try {
      if (business) {
        const updated = await updateBusiness(business.id, input)
        setSubmitSuccess('Negocio actualizado correctamente.')
        onUpdated(updated)
      } else {
        const created = await createBusiness({ ...input, ownerId: ownerIdToUse })
        setSubmitSuccess('Negocio creado correctamente.')
        onCreated(created)
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'No se pudo guardar el negocio.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="stack business-form" onSubmit={handleSubmit}>
      {showOwnerPicker && (
        <section className="form-section">
          <h3 className="form-section__title">Dueño</h3>
          {ownersLoading && <p>Cargando usuarios…</p>}
          {ownersError && <Alert tone="error">{ownersError}</Alert>}
          {!ownersLoading && !ownersError && (
            <Field
              as="select"
              label="Dueño del negocio"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              error={ownerError ?? undefined}
              required
            >
              <option value="">Seleccioná un dueño</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.firstName} {owner.lastName} — {owner.email}
                </option>
              ))}
            </Field>
          )}
        </section>
      )}

      <section className="form-section">
        <h3 className="form-section__title">Datos del negocio</h3>
        <div className="form-grid">
          <Field
            label="Nombre comercial"
            value={form.tradeName}
            onChange={(e) => setField('tradeName', e.target.value)}
            error={fieldErrors.tradeName}
            required
          />
          <Field
            label="RUC"
            value={form.ruc}
            onChange={(e) => setField('ruc', e.target.value)}
            error={fieldErrors.ruc}
            required
          />
          <Field
            label="Teléfono"
            value={form.phone}
            onChange={(e) => setField('phone', e.target.value)}
            error={fieldErrors.phone}
            required
          />
          <Field
            label="Correo del representante"
            type="email"
            value={form.representativeEmail}
            onChange={(e) => setField('representativeEmail', e.target.value)}
            error={fieldErrors.representativeEmail}
            required
          />
        </div>
      </section>

      <section className="form-section">
        <h3 className="form-section__title">Ubicación</h3>
        <div className="form-grid">
          <Field
            label="Latitud"
            type="number"
            step="any"
            value={form.latitude}
            onChange={(e) => setField('latitude', e.target.value)}
            error={fieldErrors.latitude}
            required
          />
          <Field
            label="Longitud"
            type="number"
            step="any"
            value={form.longitude}
            onChange={(e) => setField('longitude', e.target.value)}
            error={fieldErrors.longitude}
            required
          />
          <Field
            label="Calle principal"
            value={form.mainStreet}
            onChange={(e) => setField('mainStreet', e.target.value)}
            error={fieldErrors.mainStreet}
            required
          />
          <Field
            label="Calle secundaria"
            value={form.secondaryStreet}
            onChange={(e) => setField('secondaryStreet', e.target.value)}
            error={fieldErrors.secondaryStreet}
            required
          />
          <Field
            label="Número"
            value={form.number}
            onChange={(e) => setField('number', e.target.value)}
            error={fieldErrors.number}
            required
          />
          <Field
            label="Referencia"
            value={form.reference}
            onChange={(e) => setField('reference', e.target.value)}
            error={fieldErrors.reference}
            required
          />
        </div>
      </section>

      {submitError && <Alert tone="error">{submitError}</Alert>}
      {submitSuccess && <Alert tone="success">{submitSuccess}</Alert>}

      <Button type="submit" loading={submitting}>
        {submitting ? 'Guardando…' : isCreate ? 'Crear negocio' : 'Guardar cambios'}
      </Button>
    </form>
  )
}
