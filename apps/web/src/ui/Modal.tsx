import { useEffect, useId, useRef, type ReactNode } from 'react'
import Button from './Button'

interface ModalProps {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
}

/** Generic informational dialog built on native <dialog>, sharing styles with ConfirmDialog. */
export default function Modal({ open, title, children, onClose }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

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
      onClose()
    }
    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [onClose])

  if (!open) return null

  return (
    <dialog ref={dialogRef} className="dialog-surface modal" aria-labelledby={titleId}>
      <div className="modal__header">
        <h2 id={titleId} className="modal__title">
          {title}
        </h2>
        <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
      </div>
      <div className="modal__content">{children}</div>
      <div className="modal__actions cluster">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </dialog>
  )
}
