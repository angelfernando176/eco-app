import { useEffect, useState } from 'react'
import type { Business, User } from '@eco/shared'
import { Alert, Button, ConfirmDialog, DataTable, PageHeader, Pagination, type DataTableColumn } from '../../ui'
import { countOwnedBusinesses, deleteBusiness, listBusinesses } from './api'
import { canCreateBusiness, canDeleteBusiness } from './rules'
import type { SearchableField } from './types'

const PAGE_SIZE = 10
const FILTER_DEBOUNCE_MS = 300

const COLUMNS: { field: SearchableField; header: string }[] = [
  { field: 'trade_name', header: 'Nombre comercial' },
  { field: 'ruc', header: 'RUC' },
  { field: 'phone', header: 'Teléfono' },
  { field: 'representative_email', header: 'Correo representante' },
  { field: 'main_street', header: 'Calle principal' },
  { field: 'secondary_street', header: 'Calle secundaria' },
  { field: 'number', header: 'Número' },
  { field: 'reference', header: 'Referencia' },
]

function getFieldValue(business: Business, field: SearchableField): string {
  switch (field) {
    case 'trade_name':
      return business.tradeName
    case 'ruc':
      return business.ruc
    case 'phone':
      return business.phone
    case 'representative_email':
      return business.representativeEmail
    case 'main_street':
      return business.address.mainStreet
    case 'secondary_street':
      return business.address.secondaryStreet
    case 'number':
      return business.address.number
    case 'reference':
      return business.address.reference
  }
}

type FilterState = Partial<Record<SearchableField, string>>

interface BusinessListPageProps {
  profile: User
  isAdmin: boolean
  hasActiveSubscription: boolean
  onCreate: () => void
  onEdit: (businessId: string) => void
}

export default function BusinessListPage({
  profile,
  isAdmin,
  hasActiveSubscription,
  onCreate,
  onEdit,
}: BusinessListPageProps) {
  const [page, setPage] = useState(0)
  const [filterInputs, setFilterInputs] = useState<FilterState>({})
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({})
  const [rows, setRows] = useState<Business[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ownedCount, setOwnedCount] = useState(0)
  const [reloadVersion, setReloadVersion] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<Business | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    const handle = setTimeout(() => {
      setAppliedFilters(filterInputs)
      setPage(0)
    }, FILTER_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [filterInputs])

  const filtersKey = JSON.stringify(appliedFilters)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    listBusinesses({
      ownerId: isAdmin ? undefined : profile.id,
      page,
      pageSize: PAGE_SIZE,
      filters: appliedFilters,
    })
      .then((result) => {
        if (cancelled) return
        setRows(result.rows)
        setTotal(result.total)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'No se pudo cargar el listado.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // appliedFilters is represented by filtersKey below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filtersKey, isAdmin, profile.id, reloadVersion])

  useEffect(() => {
    if (isAdmin) return
    let cancelled = false
    countOwnedBusinesses(profile.id)
      .then((count) => {
        if (!cancelled) setOwnedCount(count)
      })
      .catch(() => {
        /* non-blocking: only used to compute the create-button hint */
      })
    return () => {
      cancelled = true
    }
  }, [isAdmin, profile.id, reloadVersion])

  const canCreate = canCreateBusiness({ isAdmin, hasActiveSubscription, ownedCount })

  function updateFilter(field: SearchableField, value: string) {
    setFilterInputs((prev) => ({ ...prev, [field]: value }))
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await deleteBusiness(deleteTarget.id)
      setDeleteTarget(null)
      setReloadVersion((v) => v + 1)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'No se pudo borrar el negocio.')
    } finally {
      setDeleteBusy(false)
    }
  }

  const columns: DataTableColumn<Business>[] = COLUMNS.map(({ field, header }) => ({
    key: field,
    header,
    render: (row) => getFieldValue(row, field),
    filterable: true,
    filterValue: filterInputs[field] ?? '',
    onFilterChange: (value) => updateFilter(field, value),
  }))

  return (
    <div className="page__content page__content--wide">
      <PageHeader
        title="Negocios"
        actions={
          <div className="list-page__create">
            <Button type="button" onClick={onCreate} disabled={!canCreate}>
              Crear negocio
            </Button>
            {!canCreate && (
              <span className="field__hint">Sin suscripción activa solo podés tener 1 negocio.</span>
            )}
          </div>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}
      {deleteError && <Alert tone="error">{deleteError}</Alert>}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        loading={loading}
        emptyMessage="No hay negocios registrados."
        rowActions={(row) => (
          <div className="cluster">
            <Button type="button" variant="secondary" onClick={() => onEdit(row.id)}>
              Editar
            </Button>
            {canDeleteBusiness({ isAdmin }) && (
              <Button type="button" variant="secondary" onClick={() => setDeleteTarget(row)}>
                Borrar
              </Button>
            )}
          </div>
        )}
      />

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Borrar negocio"
        message={
          deleteTarget
            ? `¿Seguro que querés borrar "${deleteTarget.tradeName}"? Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Borrar"
        danger
        busy={deleteBusy}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteTarget(null)
          setDeleteError(null)
        }}
      />
    </div>
  )
}
