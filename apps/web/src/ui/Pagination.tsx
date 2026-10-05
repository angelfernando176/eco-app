import Button from './Button'

interface PaginationProps {
  /** 0-indexed current page. */
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
}

export default function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const lastPage = Math.max(0, Math.ceil(total / pageSize) - 1)
  const from = total === 0 ? 0 : page * pageSize + 1
  const to = Math.min(total, (page + 1) * pageSize)

  return (
    <nav className="pagination" aria-label="Paginación">
      <span className="pagination__summary">
        {from}–{to} de {total}
      </span>
      <div className="cluster">
        <Button
          type="button"
          variant="secondary"
          disabled={page <= 0}
          onClick={() => onChange(page - 1)}
        >
          Anterior
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={page >= lastPage}
          onClick={() => onChange(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </nav>
  )
}
