import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'

interface FieldBaseProps {
  label: string
  hint?: string
  error?: string
}

interface FieldInputProps extends FieldBaseProps, InputHTMLAttributes<HTMLInputElement> {
  as?: 'input'
}

interface FieldSelectProps extends FieldBaseProps, SelectHTMLAttributes<HTMLSelectElement> {
  as: 'select'
  children: ReactNode
}

type FieldProps = FieldInputProps | FieldSelectProps

export default function Field(props: FieldProps) {
  const generatedId = useId()
  const { label, hint, error, as = 'input', id, className, ...rest } = props
  const controlId = id ?? generatedId
  const hintId = hint ? `${controlId}-hint` : undefined
  const errorId = error ? `${controlId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  const fieldClasses = ['field', error ? 'field--error' : ''].filter(Boolean).join(' ')
  const controlClasses = ['field__control', className ?? ''].filter(Boolean).join(' ')

  return (
    <div className={fieldClasses}>
      <label className="field__label" htmlFor={controlId}>
        {label}
      </label>
      {as === 'select' ? (
        <select
          id={controlId}
          className={controlClasses}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          {...(rest as SelectHTMLAttributes<HTMLSelectElement>)}
        >
          {(props as FieldSelectProps).children}
        </select>
      ) : (
        <input
          id={controlId}
          className={controlClasses}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
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
