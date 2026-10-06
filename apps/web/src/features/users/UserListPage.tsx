import { useEffect, useState } from 'react'
import type { User, UserTypeValue } from '@eco/shared'
import { Alert, Button, ConfirmDialog, DataTable, PageHeader, Pagination, Tag, type DataTableColumn } from '../../ui'
import { deactivateUser, listUsers, type UserListRow } from './api'
import { canDeactivateUser } from './rules'
import type { SearchableField } from './types'

const PAGE_SIZE = 10
const FILTER_DEBOUNCE_MS = 300

const COLUMNS: { field: SearchableField; header: string }[] = [
  { field: 'first_name', header: 'Nombre' },
  { field: 'last_name', header: 'Apellido' },
  { field: 'age_range', header: 'Rango de edad' },
  { field: 'email', header: 'Correo' },
]

function getFieldValue(user: User, field: SearchableField): string {
  switch (field) {
    case 'first_name':
      return user.firstName
    case 'last_name':
      return user.lastName
    case 'age_range':
      return user.ageRange
    case 'email':
      return user.email
  }
}

function formatType(type: UserTypeValue): string {
  return type === 1 ? 'Web/escritorio' : 'Móvil'
}

type FieldFilterState = Partial<Record<SearchableField, string>>

interface UserListPageProps {
  profile: User
  onEdit: (userId: string) => void
}

export default function UserListPage({ profile, onEdit }: UserListPageProps) {
  const [page, setPage] = useState(0)
  const [filterInputs, setFilterInputs] = useState<FieldFilterState>({})
  const [typeFilter, setTypeFilter] = useState<'' | UserTypeValue>('')
  const [appliedFilters, setAppliedFilters] = useState<FieldFilterState>({})
  const [appliedType, setAppliedType] = useState<'' | UserTypeValue>('')
  const [rows, setRows] = useState<UserListRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadVersion, setReloadVersion] = useState(0)
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null)
  const [deactivateBusy, setDeactivateBusy] = useState(false)
  const [deactivateError, setDeactivateError] = useState<string | null>(null)

  useEffect(() => {
    const handle = setTimeout(() => {
      setAppliedFilters(filterInputs)
      setAppliedType(typeFilter)
      setPage(0)
    }, FILTER_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [filterInputs, typeFilter])

  const filtersKey = JSON.stringify(appliedFilters)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    listUsers({
      page,
      pageSize: PAGE_SIZE,
      filters: { ...appliedFilters, type: appliedType || undefined },
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
  }, [page, filtersKey, appliedType, reloadVersion])

  function updateFilter(field: SearchableField, value: string) {
    setFilterInputs((prev) => ({ ...prev, [field]: value }))
  }

  async function handleConfirmDeactivate() {
    if (!deactivateTarget) return
    setDeactivateBusy(true)
    setDeactivateError(null)
    try {
      await deactivateUser(deactivateTarget.id)
      setDeactivateTarget(null)
      setReloadVersion((v) => v + 1)
    } catch (err) {
      setDeactivateError(err instanceof Error ? err.message : 'No se pudo borrar el usuario.')
    } finally {
      setDeactivateBusy(false)
    }
  }

  const columns: DataTableColumn<UserListRow>[] = [
    ...COLUMNS.map(({ field, header }) => ({
      key: field,
      header,
      render: (row: UserListRow) => getFieldValue(row.user, field),
      filterable: true,
      filterValue: filterInputs[field] ?? '',
      onFilterChange: (value: string) => updateFilter(field, value),
    })),
    { key: 'type', header: 'Tipo', render: (row) => formatType(row.user.type) },
    {
      key: 'subscription',
      header: 'Suscripción',
      render: (row) => (
        <Tag>{row.subscriptionState === 'active' ? 'Activa' : 'Sin suscripción'}</Tag>
      ),
    },
  ]

  return (
    <div className="page__content page__content--wide">
      <PageHeader
        title="Usuarios"
        actions={
          <Button type="button" disabled title="Próximamente">
            Crear usuario
          </Button>
        }
      />

      <div className="list-page__filter-bar">
        <label className="field">
          <span className="field__label">Tipo</span>
          <select
            className="field__control"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value ? (Number(e.target.value) as UserTypeValue) : '')}
          >
            <option value="">Todos</option>
            <option value="1">Web/escritorio</option>
            <option value="2">Móvil</option>
          </select>
        </label>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {deactivateError && <Alert tone="error">{deactivateError}</Alert>}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.user.id}
        loading={loading}
        emptyMessage="No hay usuarios registrados."
        rowActions={(row) => {
          const isSelf = row.user.id === profile.id
          const canDeactivate = canDeactivateUser({ isSelf })
          return (
            <div className="cluster">
              <Button type="button" variant="secondary" onClick={() => onEdit(row.user.id)}>
                Editar
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!canDeactivate}
                title={!canDeactivate ? 'No podés borrar tu propio usuario.' : undefined}
                onClick={() => setDeactivateTarget(row.user)}
              >
                Borrar
              </Button>
            </div>
          )
        }}
      />

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />

      <ConfirmDialog
        open={deactivateTarget !== null}
        title="Borrar usuario"
        message="El usuario pasará a estado inactivo y dejará de aparecer en el listado."
        confirmLabel="Borrar"
        danger
        busy={deactivateBusy}
        onConfirm={handleConfirmDeactivate}
        onCancel={() => {
          setDeactivateTarget(null)
          setDeactivateError(null)
        }}
      />
    </div>
  )
}
