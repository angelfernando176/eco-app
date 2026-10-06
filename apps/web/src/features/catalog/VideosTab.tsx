import { useEffect, useState } from 'react'
import { Alert, Button, ConfirmDialog, Field, FileInput } from '../../ui'
import type { BusinessTabProps } from '../businesses/tabTypes'
import { isUnderLimit } from '../plan/rules'
import { addVideo, deleteVideo, listProducts, listVideos, replaceVideo } from './api'
import type { Product, Video } from './types'

const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime'

export default function VideosTab({ business, plan }: BusinessTabProps) {
  const [videos, setVideos] = useState<Video[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [selectedProductId, setSelectedProductId] = useState('')
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [busyVideoId, setBusyVideoId] = useState<string | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)

  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  function reload() {
    setLoading(true)
    setLoadError(null)
    return Promise.all([listVideos(business.id), listProducts(business.id)])
      .then(([videoList, productList]) => {
        setVideos(videoList)
        setProducts(productList)
        setSelectedProductId((current) => (current ? current : productList[0]?.id ?? ''))
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'No se pudo cargar los videos.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id])

  function productName(productId: string): string {
    return products.find((product) => product.id === productId)?.name ?? ''
  }

  const atLimit = !isUnderLimit(videos.length, plan.videosPerBusiness)
  const counterLabel =
    plan.videosPerBusiness === null
      ? `${videos.length} videos`
      : `${videos.length} de ${plan.videosPerBusiness} videos`
  const hasProducts = products.length > 0

  async function handleAddVideo(file: File) {
    if (!selectedProductId) return
    setAddError(null)
    setAddBusy(true)
    try {
      await addVideo(business.id, selectedProductId, file)
      await reload()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'No se pudo agregar el video.')
    } finally {
      setAddBusy(false)
    }
  }

  async function handleReplaceVideo(videoId: string, file: File) {
    setVideoError(null)
    setBusyVideoId(videoId)
    try {
      await replaceVideo(videoId, file)
      await reload()
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : 'No se pudo reemplazar el video.')
    } finally {
      setBusyVideoId(null)
    }
  }

  async function handleConfirmDelete() {
    if (!deletingVideoId) return
    setDeleteBusy(true)
    setVideoError(null)
    try {
      await deleteVideo(deletingVideoId)
      setDeletingVideoId(null)
      await reload()
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : 'No se pudo eliminar el video.')
    } finally {
      setDeleteBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="stack stack--sm stack--center">
        <span className="spinner spinner--lg" aria-hidden="true" />
        <p>Cargando videos…</p>
      </div>
    )
  }

  if (loadError) {
    return <Alert tone="error">{loadError}</Alert>
  }

  if (!plan.canManageVideos) {
    return (
      <div className="stack">
        <Alert tone="info">
          Tu plan no permite cargar videos. Activá una suscripción para habilitarlos.
        </Alert>

        {videos.length === 0 && <p>Este negocio todavía no tiene videos.</p>}

        {videos.length > 0 && (
          <div className="videos-tab__grid">
            {videos.map((video) => (
              <div key={video.id} className="card video-card">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video className="video-card__player" src={video.url} preload="metadata" />
                <p className="video-card__product">{productName(video.productId)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="videos-tab__header">
        <span className="field__hint">{counterLabel}</span>
      </div>

      {videos.length === 0 && <p>Este negocio todavía no tiene videos.</p>}

      {videos.length > 0 && (
        <div className="videos-tab__grid">
          {videos.map((video) => (
            <div key={video.id} className="card video-card">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video className="video-card__player" controls preload="metadata" src={video.url} />
              <p className="video-card__product">{productName(video.productId)}</p>
              <div className="cluster video-card__actions">
                <FileInput
                  label="Reemplazar"
                  accept={VIDEO_ACCEPT}
                  hint="Hasta 50 MB."
                  disabled={busyVideoId === video.id}
                  onFileSelected={(file) => handleReplaceVideo(video.id, file)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busyVideoId === video.id}
                  onClick={() => {
                    setVideoError(null)
                    setDeletingVideoId(video.id)
                  }}
                >
                  Eliminar
                </Button>
              </div>
              {busyVideoId === video.id && <span className="field__hint">Subiendo…</span>}
            </div>
          ))}
        </div>
      )}

      {videoError && <Alert tone="error">{videoError}</Alert>}

      <div className="videos-tab__add">
        {!hasProducts && <span className="field__hint">Primero agregá un producto en la pestaña Menú.</span>}

        {hasProducts && (
          <Field
            as="select"
            label="Producto"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            disabled={atLimit}
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </Field>
        )}

        <FileInput
          label="Agregar video"
          accept={VIDEO_ACCEPT}
          hint="Hasta 50 MB."
          disabled={!hasProducts || atLimit || addBusy}
          onFileSelected={handleAddVideo}
        />
        {addBusy && <span className="field__hint">Subiendo…</span>}

        {atLimit && (
          <span className="field__hint">
            Alcanzaste el límite de {plan.videosPerBusiness} video(s) por negocio de tu plan. Eliminá un video para
            agregar otro.
          </span>
        )}

        {addError && <Alert tone="error">{addError}</Alert>}
      </div>

      <ConfirmDialog
        open={deletingVideoId !== null}
        title="Eliminar video"
        message="¿Seguro que querés eliminar este video?"
        confirmLabel="Eliminar"
        danger
        busy={deleteBusy}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingVideoId(null)}
      />
    </div>
  )
}
