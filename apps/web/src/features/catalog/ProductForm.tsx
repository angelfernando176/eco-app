import { useState, type FormEvent } from 'react'
import { Alert, Button, Field } from '../../ui'
import { CATALOG_FIELD_LIMITS, validatePrice, validateProductDescription, validateProductName } from './rules'
import type { Product, ProductInput } from './types'

export interface ProductFormFlags {
  isPrimary: boolean
  isSecondary: boolean
}

interface ProductFormProps {
  initial: Product | null
  canMarkPrimarySecondary: boolean
  busy: boolean
  error: string | null
  onSubmit: (input: ProductInput, flags: ProductFormFlags | null) => void
}

export default function ProductForm({ initial, canMarkPrimarySecondary, busy, error, onSubmit }: ProductFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [priceText, setPriceText] = useState(initial ? initial.price.toFixed(2) : '')
  const [isPrimary, setIsPrimary] = useState(initial?.isPrimary ?? false)
  const [isSecondary, setIsSecondary] = useState(initial?.isSecondary ?? false)

  const [nameError, setNameError] = useState<string | null>(null)
  const [descriptionError, setDescriptionError] = useState<string | null>(null)
  const [priceError, setPriceError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const nameValidation = validateProductName(name)
    const descriptionValidation = validateProductDescription(description)
    const price = Number(priceText.trim().replace(',', '.'))
    const priceValidation = validatePrice(price)

    setNameError(nameValidation)
    setDescriptionError(descriptionValidation)
    setPriceError(priceValidation)

    if (nameValidation || descriptionValidation || priceValidation) return

    onSubmit({ name: name.trim(), description, price }, canMarkPrimarySecondary ? { isPrimary, isSecondary } : null)
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <Field
        label="Nombre"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={nameError ?? undefined}
        maxLength={CATALOG_FIELD_LIMITS.productName.max}
        required
      />
      <Field
        as="textarea"
        label="Descripción"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        error={descriptionError ?? undefined}
        maxLength={CATALOG_FIELD_LIMITS.productDescription.max}
        showCounter
        rows={4}
      />
      <Field
        label="Precio (USD)"
        value={priceText}
        onChange={(e) => setPriceText(e.target.value)}
        error={priceError ?? undefined}
        inputMode="decimal"
        placeholder="0.00"
        required
      />

      {canMarkPrimarySecondary && (
        <div className="cluster">
          <label className="checkbox-field">
            <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
            Producto principal
          </label>
          <label className="checkbox-field">
            <input type="checkbox" checked={isSecondary} onChange={(e) => setIsSecondary(e.target.checked)} />
            Producto secundario
          </label>
        </div>
      )}

      {error && <Alert tone="error">{error}</Alert>}

      <Button type="submit" loading={busy}>
        {initial ? 'Guardar cambios' : 'Crear producto'}
      </Button>
    </form>
  )
}
