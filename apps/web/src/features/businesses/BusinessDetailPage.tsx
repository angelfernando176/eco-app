import { useEffect, useState } from 'react'
import type { Business, User } from '@eco/shared'
import { Alert, Button, PageHeader, Tabs, type TabItem } from '../../ui'
import { getBusiness } from './api'
import BusinessForm from './BusinessForm'

const COMING_SOON_HINT = 'Disponible próximamente'

const TABS: TabItem[] = [
  { id: 'info', label: 'Información' },
  { id: 'menu', label: 'Menú', disabled: true, disabledHint: COMING_SOON_HINT },
  { id: 'videos', label: 'Videos', disabled: true, disabledHint: COMING_SOON_HINT },
  { id: 'skills', label: 'Skills', disabled: true, disabledHint: COMING_SOON_HINT },
]

interface BusinessDetailPageProps {
  profile: User
  isAdmin: boolean
  businessId: string | null
  onBack: () => void
}

export default function BusinessDetailPage({ profile, isAdmin, businessId, onBack }: BusinessDetailPageProps) {
  const [currentId, setCurrentId] = useState<string | null>(businessId)
  const [activeTab, setActiveTab] = useState('info')
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(currentId !== null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!currentId) {
      setBusiness(null)
      setLoading(false)
      setLoadError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    getBusiness(currentId)
      .then((loaded) => {
        if (!cancelled) setBusiness(loaded)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'No se pudo cargar el negocio.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [currentId])

  const isCreate = currentId === null

  return (
    <div className="page__content page__content--wide">
      <PageHeader
        title={isCreate ? 'Crear negocio' : 'Editar negocio'}
        actions={
          <Button type="button" variant="secondary" onClick={onBack}>
            Volver al listado
          </Button>
        }
      />

      {loading && (
        <div className="stack stack--sm stack--center">
          <span className="spinner spinner--lg" aria-hidden="true" />
          <p>Cargando…</p>
        </div>
      )}

      {!loading && loadError && <Alert tone="error">{loadError}</Alert>}

      {!loading && !loadError && (
        <Tabs tabs={TABS} activeId={activeTab} onChange={setActiveTab}>
          {activeTab === 'info' && (
            <BusinessForm
              profile={profile}
              isAdmin={isAdmin}
              business={business}
              onCreated={(created) => {
                setCurrentId(created.id)
                setBusiness(created)
              }}
              onUpdated={(updated) => setBusiness(updated)}
            />
          )}
        </Tabs>
      )}
    </div>
  )
}
