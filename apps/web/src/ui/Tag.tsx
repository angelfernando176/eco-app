interface TagProps {
  children: string
  onRemove?: () => void
  removeLabel?: string
  disabled?: boolean
}

export default function Tag({ children, onRemove, removeLabel = 'Quitar', disabled = false }: TagProps) {
  return (
    <span className="tag">
      {children}
      {onRemove && (
        <button
          type="button"
          className="tag__remove"
          aria-label={`${removeLabel} ${children}`}
          onClick={onRemove}
          disabled={disabled}
        >
          ×
        </button>
      )}
    </span>
  )
}
