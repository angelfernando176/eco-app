import type { ReactNode } from 'react'

interface IconButtonProps {
  icon: ReactNode
  /** Accessible name and tooltip text: rendered as both `aria-label` and the native `title`. */
  label: string
  onClick?: () => void
  disabled?: boolean
  danger?: boolean
}

/** Icon-only action button; the label never renders as text, only as the hover tooltip / screen-reader name. */
export default function IconButton({ icon, label, onClick, disabled, danger }: IconButtonProps) {
  return (
    <button
      type="button"
      className={['icon-button', danger ? 'icon-button--danger' : ''].filter(Boolean).join(' ')}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
    </button>
  )
}
