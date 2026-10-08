import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import type { Business, User } from '@eco/shared'
import { Alert, Button, Field, Modal } from '../../ui'
import type { PlanLimits } from '../plan/limits'
import { createBusiness, listWebUsers, updateBusiness } from './api'
import LogoUploader from './LogoUploader'
import { BUSINESS_FIELD_LIMITS } from './limits'
import { parseCoordinate, validateBusinessInput, type BusinessFieldErrors } from './rules'
import type { BusinessInput, WebUserOption } from './types'

interface AddressLookupState {
  status: 'idle' | 'loading' | 'found' | 'not_found' | 'error'
  proposedMainStreet?: string | null
  proposedSecondaryStreet?: string | null
  message?: string
}

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
  plan: PlanLimits
  business: Business | null
  onCreated: (business: Business) => void
  onUpdated: (business: Business) => void
}

export default function BusinessForm({ profile, isAdmin, plan, business, onCreated, onUpdated }: BusinessFormProps) {
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
  const [coordsHelpOpen, setCoordsHelpOpen] = useState(false)
  const [addressLookup, setAddressLookup] = useState<AddressLookupState>({ status: 'idle' })

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

  async function handleReviewAddress() {
    const lat = parseCoordinate(form.latitude)
    const lon = parseCoordinate(form.longitude)

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      setAddressLookup({ status: 'error', message: 'Ingresá latitud y longitud válidas antes de revisar la dirección.' })
      return
    }

    window.open(`https://www.google.com/maps?q=${lat},${lon}`, '_blank', 'noopener,noreferrer')

    setAddressLookup({ status: 'loading' })
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1&email=soporte@eco.app`,
      )
      if (!response.ok) {
        setAddressLookup({
          status: 'error',
          message: 'No se pudo consultar la dirección (sin conexión o límite de uso alcanzado). Podés revisar el mapa manualmente.',
        })
        return
      }
      const data = await response.json()
      const address = data?.address ?? {}
      const proposedMainStreet = address.road ?? address.pedestrian ?? address.residential ?? null
      const proposedSecondaryStreet = address.neighbourhood ?? address.suburb ?? address.quarter ?? null

      if (!proposedMainStreet && !proposedSecondaryStreet) {
        setAddressLookup({
          status: 'not_found',
          message: 'No se pudo determinar la dirección automáticamente desde el mapa. Revisá el mapa manualmente.',
        })
        return
      }

      setAddressLookup({ status: 'found', proposedMainStreet, proposedSecondaryStreet })
    } catch {
      setAddressLookup({
        status: 'error',
        message: 'No se pudo consultar la dirección (sin conexión o límite de uso alcanzado). Podés revisar el mapa manualmente.',
      })
    }
  }

  function applyAddressLookup() {
    if (addressLookup.proposedMainStreet) setField('mainStreet', addressLookup.proposedMainStreet)
    if (addressLookup.proposedSecondaryStreet) setField('secondaryStreet', addressLookup.proposedSecondaryStreet)
    setAddressLookup({ status: 'idle' })
  }

  function discardAddressLookup() {
    setAddressLookup({ status: 'idle' })
  }

  function handleRucChange(event: ChangeEvent<HTMLInputElement>) {
    setField('ruc', event.target.value.replace(/\D/g, ''))
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
      latitude: parseCoordinate(form.latitude),
      longitude: parseCoordinate(form.longitude),
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
            maxLength={BUSINESS_FIELD_LIMITS.tradeName.max}
            required
          />
          <Field
            label="RUC"
            value={form.ruc}
            onChange={handleRucChange}
            error={fieldErrors.ruc}
            inputMode="numeric"
            maxLength={BUSINESS_FIELD_LIMITS.ruc.max}
            required
          />
          <Field
            label="Teléfono"
            value={form.phone}
            onChange={(e) => setField('phone', e.target.value)}
            error={fieldErrors.phone}
            maxLength={BUSINESS_FIELD_LIMITS.phone.max}
            required
          />
          <Field
            label="Correo del representante"
            type="email"
            value={form.representativeEmail}
            onChange={(e) => setField('representativeEmail', e.target.value)}
            error={fieldErrors.representativeEmail}
            maxLength={BUSINESS_FIELD_LIMITS.representativeEmail.max}
            required
          />
        </div>
      </section>

      <section className="form-section">
        <h3 className="form-section__title">Ubicación</h3>
        <div className="form-grid">
          <div className="coords-row field--full-width">
            <Field
              label="Latitud"
              value={form.latitude}
              onChange={(e) => setField('latitude', e.target.value)}
              error={fieldErrors.latitude}
              inputMode="decimal"
              placeholder="-0.180653"
              required
            />
            <Field
              label="Longitud"
              value={form.longitude}
              onChange={(e) => setField('longitude', e.target.value)}
              error={fieldErrors.longitude}
              inputMode="decimal"
              placeholder="-78.467834"
              required
            />
            <button
              type="button"
              className="coords-help-trigger"
              aria-label="¿Cómo obtener la latitud y longitud?"
              onClick={() => setCoordsHelpOpen(true)}
            >
              ¿?
            </button>
          </div>
          <div className="field--full-width">
            <Button
              type="button"
              variant="secondary"
              loading={addressLookup.status === 'loading'}
              onClick={handleReviewAddress}
            >
              {addressLookup.status === 'loading' ? 'Buscando…' : 'Revisar dirección'}
            </Button>
            {addressLookup.status === 'error' && (
              <Alert tone="error">{addressLookup.message}</Alert>
            )}
            {addressLookup.status === 'not_found' && (
              <Alert tone="error">{addressLookup.message}</Alert>
            )}
            {addressLookup.status === 'found' && (
              <Alert tone="success">
                Dirección sugerida: {addressLookup.proposedMainStreet ?? '—'}
                {addressLookup.proposedSecondaryStreet ? ` / ${addressLookup.proposedSecondaryStreet}` : ''}
                <div className="cluster">
                  <Button type="button" variant="secondary" onClick={applyAddressLookup}>
                    Aplicar sugerencia
                  </Button>
                  <Button type="button" variant="ghost" onClick={discardAddressLookup}>
                    Descartar
                  </Button>
                </div>
              </Alert>
            )}
          </div>
          <Field
            label="Calle principal"
            value={form.mainStreet}
            onChange={(e) => setField('mainStreet', e.target.value)}
            error={fieldErrors.mainStreet}
            maxLength={BUSINESS_FIELD_LIMITS.mainStreet.max}
            required
          />
          <Field
            label="Calle secundaria"
            value={form.secondaryStreet}
            onChange={(e) => setField('secondaryStreet', e.target.value)}
            error={fieldErrors.secondaryStreet}
            maxLength={BUSINESS_FIELD_LIMITS.secondaryStreet.max}
            required
          />
          <Field
            label="Número"
            value={form.number}
            onChange={(e) => setField('number', e.target.value)}
            error={fieldErrors.number}
            maxLength={BUSINESS_FIELD_LIMITS.number.max}
            required
          />
          <div className="field--full-width">
            <Field
              as="textarea"
              label="Referencia"
              value={form.reference}
              onChange={(e) => setField('reference', e.target.value)}
              error={fieldErrors.reference}
              maxLength={BUSINESS_FIELD_LIMITS.reference.max}
              showCounter
              rows={5}
              required
            />
          </div>
        </div>
      </section>

      {business ? (
        <LogoUploader business={business} plan={plan} onChanged={onUpdated} />
      ) : (
        <section className="form-section">
          <h3 className="form-section__title">Logo</h3>
          <span className="field__hint">Guardá el negocio para poder cargar el logo.</span>
        </section>
      )}

      <Modal open={coordsHelpOpen} title="¿Cómo obtener la latitud y longitud?" onClose={() => setCoordsHelpOpen(false)}>
        <p>
          Abrí Google Maps y hacé clic derecho (o mantené presionado en el celular) sobre el lugar exacto del
          negocio.
        </p>
        <p>
          En el menú que aparece, tocá las coordenadas que se muestran arriba (por ejemplo{' '}
          <strong>-0.180653, -78.467834</strong>) para copiarlas.
        </p>
        <p>
          El primer número es la <strong>latitud</strong> y el segundo es la <strong>longitud</strong>. Pegá cada
          uno en su campo correspondiente.
        </p>
        <p>Las coordenadas usan formato de grados decimales (por ejemplo, con punto o coma como separador).</p>
      </Modal>

      {submitError && <Alert tone="error">{submitError}</Alert>}
      {submitSuccess && <Alert tone="success">{submitSuccess}</Alert>}

      <Button type="submit" loading={submitting}>
        {submitting ? 'Guardando…' : isCreate ? 'Crear negocio' : 'Guardar cambios'}
      </Button>
    </form>
  )
}
