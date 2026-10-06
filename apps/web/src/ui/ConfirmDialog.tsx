import { useEffect, useRef, type ReactNode } from 'react'
import Button from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    function handleCancel(event: Event) {
      event.preventDefault()
      onCancel()
    }
    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [onCancel])

  if (!open) return null

  return (
    <dialog ref={dialogRef} className="dialog-surface confirm-dialog" aria-labelledby="confirm-dialog-title">
      <h2 id="confirm-dialog-title" className="confirm-dialog__title">
        {title}
      </h2>
      <div className="confirm-dialog__message">{message}</div>
      <div className="confirm-dialog__actions cluster">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant="primary"
          className={danger ? 'btn--danger' : ''}
          onClick={onConfirm}
          loading={busy}
        >
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}
