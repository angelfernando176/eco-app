import { useEffect, useState } from 'react'
import { Alert, Button, ConfirmDialog, Modal } from '../../ui'
import type { BusinessTabProps } from '../businesses/tabTypes'
import { isUnderLimit } from '../plan/rules'
import { createProduct, deleteProduct, listProductImages, listProducts, updateProduct } from './api'
import ProductForm, { type ProductFormFlags } from './ProductForm'
import ProductImages from './ProductImages'
import type { Product, ProductImage, ProductInput } from './types'

const CURRENCY_FORMATTER = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' })

export default function MenuTab({ business, plan, isAdmin }: BusinessTabProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [images, setImages] = useState<Record<string, ProductImage[]>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formBusy, setFormBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function reload() {
    setLoading(true)
    setLoadError(null)
    return listProducts(business.id)
      .then(async (list) => {
        setProducts(list)
        if (list.length === 0) {
          setImages({})
          return
        }
        const allImages = await listProductImages(list.map((product) => product.id))
        const grouped: Record<string, ProductImage[]> = {}
        for (const image of allImages) {
          grouped[image.productId] = [...(grouped[image.productId] ?? []), image]
        }
        setImages(grouped)
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'No se pudo cargar el menú.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id])

  function reloadImagesFor(productId: string) {
    return listProductImages(productId).then((list) => {
      setImages((prev) => ({ ...prev, [productId]: list }))
    })
  }

  const atLimit = !isUnderLimit(products.length, plan.products)
  const counterLabel =
    plan.products === null ? `${products.length} productos` : `${products.length} de ${plan.products} productos`
  const canMarkPrimarySecondary = isAdmin && plan.canMarkPrimarySecondary

  function openCreateForm() {
    setEditingProduct(null)
    setFormError(null)
    setFormOpen(true)
  }

  function openEditForm(product: Product) {
    setEditingProduct(product)
    setFormError(null)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingProduct(null)
    setFormError(null)
  }

  async function handleFormSubmit(input: ProductInput, flags: ProductFormFlags | null) {
    setFormError(null)
    setFormBusy(true)
    try {
      if (flags) {
        if (flags.isPrimary) {
          const previousPrimary = products.find((p) => p.isPrimary && p.id !== editingProduct?.id)
          if (previousPrimary) await updateProduct(previousPrimary.id, { isPrimary: false })
        }
        if (flags.isSecondary) {
          const previousSecondary = products.find((p) => p.isSecondary && p.id !== editingProduct?.id)
          if (previousSecondary) await updateProduct(previousSecondary.id, { isSecondary: false })
        }
      }

      if (editingProduct) {
        await updateProduct(editingProduct.id, { ...input, ...(flags ?? {}) })
      } else {
        const created = await createProduct(business.id, input)
        if (flags) await updateProduct(created.id, flags)
      }
      closeForm()
      await reload()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar el producto.')
    } finally {
      setFormBusy(false)
    }
  }

  async function handleConfirmDelete() {
    if (!deletingProduct) return
    setDeleteError(null)
    setDeleteBusy(true)
    try {
      await deleteProduct(deletingProduct.id)
      setDeletingProduct(null)
      await reload()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'No se pudo eliminar el producto.')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="stack">
      {loading && (
        <div className="stack stack--sm stack--center">
          <span className="spinner spinner--lg" aria-hidden="true" />
          <p>Cargando menú…</p>
        </div>
      )}

      {!loading && loadError && <Alert tone="error">{loadError}</Alert>}

      {!loading && !loadError && (
        <>
          <div className="menu-tab__header">
            <span className="field__hint">{counterLabel}</span>
            <Button type="button" onClick={openCreateForm} disabled={atLimit}>
              Agregar producto
            </Button>
          </div>

          {atLimit && (
            <span className="field__hint">
              Alcanzaste el límite de {plan.products} producto(s) de tu plan. Eliminá un producto para agregar otro.
            </span>
          )}

          {products.length === 0 && <p>Este negocio todavía no tiene productos.</p>}

          {products.map((product) => (
            <div key={product.id} className="card product-card">
              <div className="product-card__header">
                <div className="stack stack--sm">
                  <h3 className="product-card__name">{product.name}</h3>
                  {(product.isPrimary || product.isSecondary) && (
                    <div className="cluster">
                      {product.isPrimary && <span className="badge badge--admin">Principal</span>}
                      {product.isSecondary && <span className="badge badge--user">Secundario</span>}
                    </div>
                  )}
                </div>
                <span className="product-card__price">{CURRENCY_FORMATTER.format(product.price)}</span>
              </div>

              {product.description && <p className="product-card__description">{product.description}</p>}

              <div className="cluster">
                <Button type="button" variant="secondary" onClick={() => openEditForm(product)}>
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setDeleteError(null)
                    setDeletingProduct(product)
                  }}
                >
                  Eliminar
                </Button>
              </div>

              <ProductImages
                product={product}
                images={images[product.id] ?? []}
                canManage={plan.canManageImages}
                imagesLimit={plan.imagesPerProduct}
                businessId={business.id}
                onChanged={() => reloadImagesFor(product.id)}
              />
            </div>
          ))}

          {deleteError && <Alert tone="error">{deleteError}</Alert>}
        </>
      )}

      <Modal open={formOpen} title={editingProduct ? 'Editar producto' : 'Nuevo producto'} onClose={closeForm}>
        <ProductForm
          initial={editingProduct}
          canMarkPrimarySecondary={canMarkPrimarySecondary}
          busy={formBusy}
          error={formError}
          onSubmit={handleFormSubmit}
        />
      </Modal>

      <ConfirmDialog
        open={deletingProduct !== null}
        title="Eliminar producto"
        message={`¿Seguro que querés eliminar "${deletingProduct?.name}"? También se eliminarán sus imágenes y video asociado.`}
        confirmLabel="Eliminar"
        danger
        busy={deleteBusy}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingProduct(null)}
      />
    </div>
  )
}
