import type { ReactNode } from 'react'

export interface DataTableColumn<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  filterable?: boolean
  filterValue?: string
  onFilterChange?: (value: string) => void
  filterPlaceholder?: string
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  loading?: boolean
  emptyMessage?: string
  rowActions?: (row: T) => ReactNode
  actionsHeader?: string
}

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyMessage = 'No hay resultados.',
  rowActions,
  actionsHeader = 'Acciones',
}: DataTableProps<T>) {
  const hasFilters = columns.some((c) => c.filterable)
  const columnCount = columns.length + (rowActions ? 1 : 0)

  return (
    <div className="data-table">
      <table className="data-table__table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.header}
              </th>
            ))}
            {rowActions && <th scope="col">{actionsHeader}</th>}
          </tr>
          {hasFilters && (
            <tr className="data-table__filter-row">
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
              {rowActions && <th />}
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
                {columns.map((column) => <td key={column.key}>{column.render(row)}</td>)}
                {rowActions && <td className="data-table__actions">{rowActions(row)}</td>}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}
