import { useState } from 'react'
import type { Business } from '@eco/shared'
import { Alert, ConfirmDialog, FileInput } from '../../ui'
import { setBusinessLogo, removeBusinessLogo } from '../catalog/api'
import { validateMediaFile } from '../storage/mediaStorage'
import type { PlanLimits } from '../plan/limits'

interface LogoUploaderProps {
  business: Business
  plan: PlanLimits
  onChanged: (business: Business) => void
}

export default function LogoUploader({ business, plan, onChanged }: LogoUploaderProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false)

  if (!plan.canUploadLogo) {
    return (
      <section className="form-section">
        <h3 className="form-section__title">Logo</h3>
        <span className="field__hint">Tu plan no permite cargar un logo. Activá una suscripción para habilitarlo.</span>
      </section>
    )
  }

  async function handleFileSelected(file: File) {
    setError(null)
    const validationError = validateMediaFile('logos', file)
    if (validationError) {
      setError(validationError)
      return
    }
    setBusy(true)
    try {
      const logoUrl = await setBusinessLogo(business.id, file)
      onChanged({ ...business, logoUrl })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el logo.')
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirmRemove() {
    setError(null)
    setBusy(true)
    try {
      await removeBusinessLogo(business.id)
      onChanged({ ...business, logoUrl: null })
      setConfirmRemoveOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el logo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="form-section">
      <h3 className="form-section__title">Logo</h3>
      <div className="media-preview">
        {business.logoUrl ? (
          <img className="media-preview__image" src={business.logoUrl} alt={`Logo de ${business.tradeName}`} />
        ) : (
          <span className="media-preview__placeholder">Sin logo</span>
        )}
        <div className="media-preview__actions">
          <FileInput
            label={business.logoUrl ? 'Cambiar logo' : 'Subir logo'}
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={busy}
            onFileSelected={handleFileSelected}
          />
          {business.logoUrl && (
            <button
              type="button"
              className="btn btn--secondary"
              disabled={busy}
              onClick={() => setConfirmRemoveOpen(true)}
            >
              Quitar logo
            </button>
          )}
        </div>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      <ConfirmDialog
        open={confirmRemoveOpen}
        title="Quitar logo"
        message="¿Seguro que querés quitar el logo de este negocio?"
        confirmLabel="Quitar"
        danger
        busy={busy}
        onConfirm={handleConfirmRemove}
        onCancel={() => setConfirmRemoveOpen(false)}
      />
    </section>
  )
}
