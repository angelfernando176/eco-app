import type { ReactNode } from 'react'
import { SortAscIcon, SortDescIcon, SortNeutralIcon } from './icons'

export type SortDirection = 'asc' | 'desc'

export interface DataTableColumn<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  filterable?: boolean
  filterValue?: string
  onFilterChange?: (value: string) => void
  filterPlaceholder?: string
  /** Enables a clickable header for server-side sorting; the caller owns the actual sort query. */
  sortable?: boolean
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  loading?: boolean
  emptyMessage?: string
  rowActions?: (row: T) => ReactNode
  actionsHeader?: string
  sortKey?: string | null
  sortDirection?: SortDirection
  /** Called with the clicked column's key; the caller decides the next direction (e.g. toggle). */
  onSortChange?: (key: string) => void
}

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyMessage = 'No hay resultados.',
  rowActions,
  actionsHeader = 'Acciones',
  sortKey = null,
  sortDirection,
  onSortChange,
}: DataTableProps<T>) {
  const hasFilters = columns.some((c) => c.filterable)
  const columnCount = columns.length + (rowActions ? 1 : 0)

  return (
    <div className="data-table">
      <table className="data-table__table">
        <thead>
          <tr>
            {rowActions && <th scope="col">{actionsHeader}</th>}
            {columns.map((column) => {
              if (!column.sortable || !onSortChange) {
                return (
                  <th key={column.key} scope="col">
                    {column.header}
                  </th>
                )
              }
              const isActive = sortKey === column.key
              const ariaSort = isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'
              return (
                <th key={column.key} scope="col" aria-sort={ariaSort}>
                  <button
                    type="button"
                    className="data-table__sort-button"
                    onClick={() => onSortChange(column.key)}
                  >
                    {column.header}
                    {isActive && sortDirection === 'asc' && <SortAscIcon />}
                    {isActive && sortDirection === 'desc' && <SortDescIcon />}
                    {!isActive && <SortNeutralIcon className="data-table__sort-icon--idle" />}
                  </button>
                </th>
              )
            })}
          </tr>
          {hasFilters && (
            <tr className="data-table__filter-row">
              {rowActions && <th />}
              {columns.map((column) => (
                <th key={column.key}>
                  {column.filterable ? (
                    <input
                      type="text"
                      className="data-table__filter-input"
                      aria-label={`Filtrar por ${column.header}`}
                      placeholder={column.filterPlaceholder ?? column.header}
                      value={column.filterValue ?? ''}
                      onChange={(e) => column.onFilterChange?.(e.target.value)}
                    />
                  ) : null}
                </th>
              ))}
            </tr>
          )}
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={columnCount} className="data-table__status">
                Cargando…
              </td>
            </tr>
          )}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={columnCount} className="data-table__status">
                {emptyMessage}
              </td>
            </tr>
          )}
          {!loading &&
            rows.map((row) => (
              <tr key={rowKey(row)}>
                {rowActions && <td className="data-table__actions">{rowActions(row)}</td>}
                {columns.map((column) => <td key={column.key}>{column.render(row)}</td>)}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}
