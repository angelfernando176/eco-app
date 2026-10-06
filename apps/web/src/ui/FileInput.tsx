import { useId, useRef, type ChangeEvent } from 'react'

interface FileInputProps {
  label: string
  accept?: string
  hint?: string
  error?: string
  disabled?: boolean
  onFileSelected: (file: File) => void
}

/** Native file input styled as a button + selected file name, for logo/image/video pickers. */
export default function FileInput({ label, accept, hint, error, disabled = false, onFileSelected }: FileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const controlId = useId()
  const hintId = hint ? `${controlId}-hint` : undefined
  const errorId = error ? `${controlId}-error` : undefined

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) onFileSelected(file)
    event.target.value = ''
  }

  return (
    <div className="file-input">
      <input
        ref={inputRef}
        id={controlId}
        type="file"
        className="file-input__native"
        accept={accept}
        disabled={disabled}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        onChange={handleChange}
      />
      <button
        type="button"
        className="btn btn--secondary file-input__trigger"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </button>
      {hint && !error && (
        <span className="field__hint" id={hintId}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field__error" id={errorId}>
          {error}
        </span>
      )}
    </div>
  )
}
