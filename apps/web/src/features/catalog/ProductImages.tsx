import { useState } from 'react'
import { Alert, Button, ConfirmDialog, Field, FileInput } from '../../ui'
import { isUnderLimit } from '../plan/rules'
import { addProductImage, deleteProductImage, updateProductImage } from './api'
import { CATALOG_FIELD_LIMITS, validateImageDescription } from './rules'
import type { Product, ProductImage } from './types'

interface ProductImagesProps {
  product: Product
  images: ProductImage[]
  canManage: boolean
  imagesLimit: number | null
  businessId: string
  onChanged: () => void
}

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

export default function ProductImages({ product, images, canManage, imagesLimit, businessId, onChanged }: ProductImagesProps) {
  const [newDescription, setNewDescription] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [addBusy, setAddBusy] = useState(false)

  const [busyImageId, setBusyImageId] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)

  const [editingImageId, setEditingImageId] = useState<string | null>(null)
  const [editingDescription, setEditingDescription] = useState('')
  const [editingError, setEditingError] = useState<string | null>(null)

  const [deletingImageId, setDeletingImageId] = useState<string | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const atLimit = !isUnderLimit(images.length, imagesLimit)
  const counterLabel = imagesLimit === null ? `${images.length} imágenes` : `${images.length} de ${imagesLimit} imágenes`

  if (!canManage) {
    return (
      <div className="product-images">
        <span className="field__hint">
          Tu plan no permite cargar imágenes. Activá una suscripción para habilitarlas.
        </span>
        {images.length > 0 && (
          <div className="product-images__grid">
            {images.map((image) => (
              <div key={image.id} className="product-image">
                <img className="product-image__thumb" src={image.url} alt={image.description || product.name} />
                {image.description && <p className="product-image__description">{image.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  async function handleAddImage(file: File) {
    setAddError(null)
    const descriptionError = validateImageDescription(newDescription)
    if (descriptionError) {
      setAddError(descriptionError)
      return
    }
    setAddBusy(true)
    try {
      await addProductImage(product.id, businessId, file, newDescription)
      setNewDescription('')
      onChanged()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'No se pudo agregar la imagen.')
    } finally {
      setAddBusy(false)
    }
  }

  function startEditing(image: ProductImage) {
    setEditingImageId(image.id)
    setEditingDescription(image.description)
    setEditingError(null)
  }

  async function handleSaveDescription(imageId: string) {
    const descriptionError = validateImageDescription(editingDescription)
    setEditingError(descriptionError)
    if (descriptionError) return
    setBusyImageId(imageId)
    setImageError(null)
    try {
      await updateProductImage(imageId, { description: editingDescription })
      setEditingImageId(null)
      onChanged()
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'No se pudo actualizar la descripción.')
    } finally {
      setBusyImageId(null)
    }
  }

  async function handleReplaceFile(imageId: string, file: File) {
    setImageError(null)
    setBusyImageId(imageId)
    try {
      await updateProductImage(imageId, { file })
      onChanged()
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'No se pudo reemplazar la imagen.')
    } finally {
      setBusyImageId(null)
    }
  }

  async function handleConfirmDeleteImage() {
    if (!deletingImageId) return
    setDeleteBusy(true)
    setImageError(null)
    try {
      await deleteProductImage(deletingImageId)
      setDeletingImageId(null)
      onChanged()
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'No se pudo eliminar la imagen.')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="product-images">
      <div className="product-images__header">
        <span className="field__hint">{counterLabel}</span>
      </div>

      {imageError && <Alert tone="error">{imageError}</Alert>}

      {images.length > 0 && (
        <div className="product-images__grid">
          {images.map((image) => (
            <div key={image.id} className="product-image">
              <img className="product-image__thumb" src={image.url} alt={image.description || product.name} />

              {editingImageId === image.id ? (
                <div className="stack stack--sm">
                  <Field
                    label="Descripción"
                    value={editingDescription}
                    onChange={(e) => setEditingDescription(e.target.value)}
                    error={editingError ?? undefined}
                    maxLength={CATALOG_FIELD_LIMITS.imageDescription.max}
                    showCounter
                  />
                  <div className="cluster">
                    <Button
                      type="button"
                      loading={busyImageId === image.id}
                      onClick={() => handleSaveDescription(image.id)}
                    >
                      Guardar
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busyImageId === image.id}
                      onClick={() => setEditingImageId(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {image.description && <p className="product-image__description">{image.description}</p>}
                  <div className="cluster product-image__actions">
                    <Button type="button" variant="secondary" onClick={() => startEditing(image)}>
                      Editar descripción
                    </Button>
                    <FileInput
                      label="Cambiar imagen"
                      accept={IMAGE_ACCEPT}
                      disabled={busyImageId === image.id}
                      onFileSelected={(file) => handleReplaceFile(image.id, file)}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busyImageId === image.id}
                      onClick={() => setDeletingImageId(image.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="product-images__add">
        <Field
          label="Descripción de la nueva imagen"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          maxLength={CATALOG_FIELD_LIMITS.imageDescription.max}
          showCounter
          disabled={atLimit}
        />
        <FileInput label="Agregar imagen" accept={IMAGE_ACCEPT} disabled={atLimit || addBusy} onFileSelected={handleAddImage} />
        {atLimit && (
          <span className="field__hint">Alcanzaste el límite de {imagesLimit} imagen(es) por producto de tu plan.</span>
        )}
        {addError && <Alert tone="error">{addError}</Alert>}
      </div>

      <ConfirmDialog
        open={deletingImageId !== null}
        title="Eliminar imagen"
        message="¿Seguro que querés eliminar esta imagen?"
        confirmLabel="Eliminar"
        danger
        busy={deleteBusy}
        onConfirm={handleConfirmDeleteImage}
        onCancel={() => setDeletingImageId(null)}
      />
    </div>
  )
}
