import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

interface FieldBaseProps {
  label: string
  hint?: string
  error?: string
  /** Shows a "current/max" character counter; `max` defaults to the control's `maxLength`. */
  showCounter?: boolean
}

interface FieldInputProps extends FieldBaseProps, InputHTMLAttributes<HTMLInputElement> {
  as?: 'input'
}

interface FieldSelectProps extends FieldBaseProps, SelectHTMLAttributes<HTMLSelectElement> {
  as: 'select'
  children: ReactNode
}

interface FieldTextareaProps extends FieldBaseProps, TextareaHTMLAttributes<HTMLTextAreaElement> {
  as: 'textarea'
}

type FieldProps = FieldInputProps | FieldSelectProps | FieldTextareaProps

export default function Field(props: FieldProps) {
  const generatedId = useId()
  const { label, hint, error, showCounter, as = 'input', id, className, ...rest } = props
  const controlId = id ?? generatedId
  const hintId = hint ? `${controlId}-hint` : undefined
  const errorId = error ? `${controlId}-error` : undefined
  const counterId = showCounter ? `${controlId}-counter` : undefined
  const describedBy = [hintId, errorId, counterId].filter(Boolean).join(' ') || undefined

  const fieldClasses = ['field', error ? 'field--error' : ''].filter(Boolean).join(' ')
  const controlClasses = ['field__control', className ?? ''].filter(Boolean).join(' ')

  const currentLength = typeof rest.value === 'string' ? rest.value.length : 0
  const maxLength = 'maxLength' in rest ? rest.maxLength : undefined

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
      ) : as === 'textarea' ? (
        <textarea
          id={controlId}
          className={controlClasses}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          id={controlId}
          className={controlClasses}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {showCounter && maxLength != null && (
        <span className="field__counter" id={counterId}>
          {currentLength}/{maxLength}
        </span>
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
