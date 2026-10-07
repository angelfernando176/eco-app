import { useEffect, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { SectionState } from '../components/SectionState'
import { TabBar } from '../components/TabBar'
import { TextField } from '../components/TextField'
import type { Negocio } from '../db/negocio'
import {
  addSkill,
  deleteMedia,
  fetchMainProductId,
  fetchPhotos,
  fetchSkills,
  fetchVideos,
  removeSkill,
  uploadMedia,
  type MobilePhoto,
  type MobileSkill,
  type MobileVideo,
} from '../services/mobileContent'
import { inferMimeType, mapUploadErrorToSpanish, validateSkillName } from '../services/mobileContentLogic'
import { colors, spacing, typography } from '../theme'

export interface MobileContentScreenProps {
  negocio: Negocio
  onVolver: () => void
}

type TabKey = 'fotos' | 'videos' | 'skills'

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: 'fotos', label: 'Fotos' },
  { key: 'videos', label: 'Videos' },
  { key: 'skills', label: 'Skills' },
]

export function MobileContentScreen({ negocio, onVolver }: MobileContentScreenProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('fotos')
  const [productId, setProductId] = useState<string | null>(null)
  const [productIdError, setProductIdError] = useState<string | null>(null)
  const [productIdLoading, setProductIdLoading] = useState(true)

  useEffect(() => {
    void resolveProductId()
  }, [])

  async function resolveProductId() {
    if (!negocio.remoteId) {
      setProductIdLoading(false)
      return
    }
    setProductIdLoading(true)
    setProductIdError(null)
    try {
      const id = await fetchMainProductId(negocio.remoteId)
      setProductId(id)
    } catch (err) {
      setProductIdError(err instanceof Error ? err.message : 'No se pudo buscar el producto principal.')
    } finally {
      setProductIdLoading(false)
    }
  }

  if (!negocio.remoteId) {
    return (
      <View style={styles.container}>
        <Pressable onPress={onVolver} style={styles.cancel}>
          <Text style={styles.cancelText}>‹ Volver</Text>
        </Pressable>
        <Banner variant="info" message="El negocio debe sincronizarse con el servidor antes de gestionar contenido." />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={onVolver} style={styles.cancel}>
        <Text style={styles.cancelText}>‹ Volver</Text>
      </Pressable>

      <Text style={styles.title}>Fotos / Videos / Skills</Text>

      <TabBar tabs={TABS} activeTab={activeTab} onSelect={setActiveTab} />

      <View style={styles.content}>
        {productIdLoading ? (
          <SectionState loading />
        ) : productIdError ? (
          <SectionState errorMessage={productIdError} onRetry={resolveProductId} />
        ) : !productId ? (
          <SectionState emptyMessage="El producto principal todavía no se sincronizó. Intentá más tarde." />
        ) : activeTab === 'fotos' ? (
          <PhotosTab negocio={negocio} productId={productId} />
        ) : activeTab === 'videos' ? (
          <VideosManageTab negocio={negocio} productId={productId} />
        ) : (
          <SkillsTab negocio={negocio} />
        )}
      </View>
    </View>
  )
}

type SectionStatus = 'loading' | 'loaded' | 'empty' | 'error'

interface PhotosTabProps {
  negocio: Negocio
  productId: string
}

function PhotosTab({ negocio, productId }: PhotosTabProps) {
  const [status, setStatus] = useState<SectionStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [photos, setPhotos] = useState<MobilePhoto[]>([])
  const [pickedAsset, setPickedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null)
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function load() {
    setStatus('loading')
    setErrorMessage(null)
    try {
      const found = await fetchPhotos(productId)
      setPhotos(found)
      setStatus(found.length > 0 ? 'loaded' : 'empty')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'No se pudieron cargar las fotos.')
    }
  }

  useEffect(() => {
    void load()
  }, [productId])

  async function handlePick() {
    setUploadError(null)
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7,
    })
    if (result.canceled || result.assets.length === 0) return
    setPickedAsset(result.assets[0])
    setDescription('')
  }

  async function handleConfirmUpload() {
    if (!pickedAsset?.base64) return
    const mimeType = pickedAsset.mimeType ?? inferMimeType(pickedAsset.fileName ?? pickedAsset.uri, 'photo')
    if (!mimeType) {
      setUploadError('No se pudo determinar el tipo de archivo de la imagen seleccionada.')
      return
    }

    setUploading(true)
    setUploadError(null)
    try {
      await uploadMedia({
        ownerId: negocio.ownerRemoteId,
        businessId: negocio.remoteId as string,
        productId,
        kind: 'photo',
        description,
        fileBase64: pickedAsset.base64,
        mimeType,
      })
      setPickedAsset(null)
      setDescription('')
      await load()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : mapUploadErrorToSpanish(err))
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    setUploadError(null)
    try {
      await deleteMedia({ ownerId: negocio.ownerRemoteId, kind: 'photo', mediaId: id })
      await load()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : mapUploadErrorToSpanish(err))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <View style={styles.tabContent}>
      {uploadError ? <Banner variant="error" message={uploadError} /> : null}

      {pickedAsset ? (
        <Card style={styles.pickedCard}>
          <Text style={styles.pickedLabel}>Foto seleccionada</Text>
          <TextField
            label="Descripción (opcional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Descripción"
          />
          <Button title="Subir" onPress={handleConfirmUpload} loading={uploading} />
          <Button title="Cancelar" variant="ghost" onPress={() => setPickedAsset(null)} disabled={uploading} />
        </Card>
      ) : (
        <Button title="Agregar foto" onPress={handlePick} />
      )}

      {status !== 'loaded' ? (
        <SectionState
          loading={status === 'loading'}
          errorMessage={status === 'error' ? errorMessage : null}
          onRetry={load}
          emptyMessage={status === 'empty' ? 'Este negocio aún no tiene fotos.' : null}
        />
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <MediaRow
              label={item.description || item.url}
              deleting={deletingId === item.id}
              onDelete={() => handleDelete(item.id)}
            />
          )}
        />
      )}
    </View>
  )
}

interface VideosManageTabProps {
  negocio: Negocio
  productId: string
}

function VideosManageTab({ negocio, productId }: VideosManageTabProps) {
  const [status, setStatus] = useState<SectionStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [videos, setVideos] = useState<MobileVideo[]>([])
  const [pickedAsset, setPickedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function load() {
    setStatus('loading')
    setErrorMessage(null)
    try {
      const found = await fetchVideos(negocio.remoteId as string)
      setVideos(found)
      setStatus(found.length > 0 ? 'loaded' : 'empty')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'No se pudieron cargar los videos.')
    }
  }

  useEffect(() => {
    void load()
  }, [productId])

  async function handlePick() {
    setUploadError(null)
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      base64: true,
    })
    if (result.canceled || result.assets.length === 0) return
    setPickedAsset(result.assets[0])
  }

  async function handleConfirmUpload() {
    if (!pickedAsset?.base64) return
    const mimeType = pickedAsset.mimeType ?? inferMimeType(pickedAsset.fileName ?? pickedAsset.uri, 'video')
    if (!mimeType) {
      setUploadError('No se pudo determinar el tipo de archivo del video seleccionado.')
      return
    }

    setUploading(true)
    setUploadError(null)
    try {
      await uploadMedia({
        ownerId: negocio.ownerRemoteId,
        businessId: negocio.remoteId as string,
        productId,
        kind: 'video',
        description: '',
        fileBase64: pickedAsset.base64,
        mimeType,
      })
      setPickedAsset(null)
      await load()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : mapUploadErrorToSpanish(err))
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    setUploadError(null)
    try {
      await deleteMedia({ ownerId: negocio.ownerRemoteId, kind: 'video', mediaId: id })
      await load()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : mapUploadErrorToSpanish(err))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <View style={styles.tabContent}>
      {uploadError ? <Banner variant="error" message={uploadError} /> : null}

      {pickedAsset ? (
        <Card style={styles.pickedCard}>
          <Text style={styles.pickedLabel}>Video seleccionado</Text>
          <Button title="Subir" onPress={handleConfirmUpload} loading={uploading} />
          <Button title="Cancelar" variant="ghost" onPress={() => setPickedAsset(null)} disabled={uploading} />
        </Card>
      ) : (
        <Button title="Agregar video" onPress={handlePick} />
      )}

      {status !== 'loaded' ? (
        <SectionState
          loading={status === 'loading'}
          errorMessage={status === 'error' ? errorMessage : null}
          onRetry={load}
          emptyMessage={status === 'empty' ? 'Este negocio aún no tiene videos.' : null}
        />
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <MediaRow label={item.url} deleting={deletingId === item.id} onDelete={() => handleDelete(item.id)} />
          )}
        />
      )}
    </View>
  )
}

interface SkillsTabProps {
  negocio: Negocio
}

function SkillsTab({ negocio }: SkillsTabProps) {
  const [status, setStatus] = useState<SectionStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [skills, setSkills] = useState<MobileSkill[]>([])
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function load() {
    setStatus('loading')
    setErrorMessage(null)
    try {
      const found = await fetchSkills(negocio.remoteId as string)
      setSkills(found)
      setStatus(found.length > 0 ? 'loaded' : 'empty')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'No se pudieron cargar los skills.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleAgregar() {
    const validationError = validateSkillName(name)
    setNameError(validationError)
    if (validationError) return

    setAdding(true)
    setActionError(null)
    try {
      await addSkill({ businessId: negocio.remoteId as string, ownerId: negocio.ownerRemoteId, name })
      setName('')
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : mapUploadErrorToSpanish(err))
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    setActionError(null)
    try {
      await removeSkill({ skillId: id, ownerId: negocio.ownerRemoteId })
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : mapUploadErrorToSpanish(err))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <View style={styles.tabContent}>
      {actionError ? <Banner variant="error" message={actionError} /> : null}

      <TextField
        label="Nuevo skill"
        value={name}
        onChangeText={setName}
        placeholder="Nombre del skill"
        error={nameError ?? undefined}
      />
      <Button title="Agregar" onPress={handleAgregar} loading={adding} />

      {status !== 'loaded' ? (
        <SectionState
          loading={status === 'loading'}
          errorMessage={status === 'error' ? errorMessage : null}
          onRetry={load}
          emptyMessage={status === 'empty' ? 'Este negocio aún no tiene skills.' : null}
        />
      ) : (
        <FlatList
          data={skills}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <MediaRow label={item.name} deleting={deletingId === item.id} onDelete={() => handleDelete(item.id)} />
          )}
        />
      )}
    </View>
  )
}

interface MediaRowProps {
  label: string
  deleting: boolean
  onDelete: () => void
}

function MediaRow({ label, deleting, onDelete }: MediaRowProps) {
  return (
    <Card style={styles.row}>
      <Text style={styles.rowLabel} numberOfLines={1}>
        {label}
      </Text>
      <Pressable onPress={onDelete} disabled={deleting} style={styles.deleteButton}>
        <Text style={styles.deleteButtonText}>{deleting ? '…' : '✕'}</Text>
      </Pressable>
    </Card>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
  },
  cancel: {
    marginTop: spacing[6],
    marginHorizontal: spacing[6],
    marginBottom: spacing[2],
  },
  cancelText: {
    fontSize: typography.size.base,
    color: colors.brand[700],
    fontWeight: typography.weight.medium as '500',
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold as '700',
    color: colors.brand[700],
    marginHorizontal: spacing[6],
    marginBottom: spacing[2],
  },
  tabContent: {
    flex: 1,
    padding: spacing[4],
    gap: spacing[3],
  },
  pickedCard: {
    gap: spacing[2],
  },
  pickedLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold as '600',
    color: colors.gray[700],
  },
  list: {
    gap: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  rowLabel: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.gray[900],
  },
  deleteButton: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  deleteButtonText: {
    fontSize: typography.size.base,
    color: colors.danger[600],
    fontWeight: typography.weight.semibold as '600',
  },
})
