import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import { ListRow } from '../components/ListRow'
import { SectionState } from '../components/SectionState'
import { TabBar } from '../components/TabBar'
import { TextField } from '../components/TextField'
import { supabase } from '../lib/supabase'
import { getBusinessDetailAdmin, updateBusinessAdmin } from '../services/adminBusinessApi'
import { getBusinessAccessDetail, requestSubscriptionActivation } from '../services/businessAccess'
import {
  addProduct,
  addSkill,
  fetchProducts,
  fetchSkills,
  fetchVideosReadOnly,
  removeProduct,
  removeSkill,
  type CatalogProduct,
  type CatalogSkill,
  type CatalogVideo,
} from '../services/mobileCatalogAccess'
import { buildUpdatePayload, validateBusinessInput, type BusinessEditInput, type BusinessFieldError } from '../services/mobileBusinessLogic'
import { mapUploadErrorToSpanish, validateProductName, validateSkillName } from '../services/mobileContentLogic'
import { commonStyles } from '../styles/common'
import { colors, spacing, typography } from '../theme'

export interface BusinessEditScreenProps {
  businessId: string
  role: 'none' | 'subscribed' | 'admin'
  ownerId: string
  onSaved: () => void
}

interface LoadedBusiness {
  id: string
  ownerId: string
  tradeName: string
  ruc: string
  phone: string
  latitude: number
  longitude: number
  productId: string | null
  productName: string
  productPrice: number
}

type TabKey = 'skills' | 'productos' | 'videos'

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: 'skills', label: 'Skills' },
  { key: 'productos', label: 'Productos' },
  { key: 'videos', label: 'Videos' },
]

function errorFor(errors: BusinessFieldError[], field: BusinessFieldError['field']): string | undefined {
  return errors.find((e) => e.field === field)?.message
}

export function BusinessEditScreen({ businessId, role, ownerId, onSaved }: BusinessEditScreenProps) {
  const [detail, setDetail] = useState<LoadedBusiness | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [tradeName, setTradeName] = useState('')
  const [ruc, setRuc] = useState('')
  const [phone, setPhone] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [productName, setProductName] = useState('')
  const [productPrice, setProductPrice] = useState('')

  const [errors, setErrors] = useState<BusinessFieldError[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [activating, setActivating] = useState(false)
  const [activationResult, setActivationResult] = useState<{ ok: boolean; message: string } | null>(null)

  const [activeTab, setActiveTab] = useState<TabKey>('skills')
  const [visitedTabs, setVisitedTabs] = useState<ReadonlySet<TabKey>>(new Set(['skills']))

  useEffect(() => {
    void loadDetail()
  }, [businessId])

  async function loadDetail() {
    setLoadingDetail(true)
    setLoadError(null)
    try {
      let loaded: LoadedBusiness
      if (role === 'admin') {
        const data = await getBusinessDetailAdmin(businessId)
        loaded = {
          id: data.id,
          ownerId: data.ownerId,
          tradeName: data.tradeName,
          ruc: data.ruc,
          phone: data.phone,
          latitude: data.latitude,
          longitude: data.longitude,
          productId: data.productId,
          productName: data.productName,
          productPrice: data.productPrice,
        }
      } else {
        const data = await getBusinessAccessDetail(businessId)
        loaded = {
          id: data.id,
          ownerId,
          tradeName: data.tradeName,
          ruc: data.ruc,
          phone: data.phone,
          latitude: data.latitude,
          longitude: data.longitude,
          productId: data.productId,
          productName: data.productName,
          productPrice: data.productPrice,
        }
      }
      setDetail(loaded)
      setTradeName(loaded.tradeName)
      setRuc(loaded.ruc)
      setPhone(loaded.phone)
      setLatitude(String(loaded.latitude))
      setLongitude(String(loaded.longitude))
      setProductName(loaded.productName)
      setProductPrice(String(loaded.productPrice))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'No se pudo cargar el negocio.')
    } finally {
      setLoadingDetail(false)
    }
  }

  async function handleActivarSuscripcion() {
    setActivating(true)
    setActivationResult(null)
    const result = await requestSubscriptionActivation(businessId)
    setActivating(false)
    if (result.ok) {
      setActivationResult({ ok: true, message: 'Se envió tu solicitud. El equipo de ECO se pondrá en contacto.' })
    } else {
      setActivationResult({ ok: false, message: result.message })
    }
  }

  async function handleGuardar() {
    if (!detail) return

    const parsedLatitude = Number(latitude.replace(',', '.'))
    const parsedLongitude = Number(longitude.replace(',', '.'))
    const parsedPrice = Number(productPrice.replace(',', '.'))

    const input: BusinessEditInput = {
      tradeName,
      ruc,
      phone,
      productName,
      productPrice: parsedPrice,
    }

    const validationErrors = validateBusinessInput(input)
    setErrors(validationErrors)
    if (validationErrors.length > 0) return

    setSaveError(null)
    setSaving(true)
    try {
      if (role === 'admin') {
        await updateBusinessAdmin(
          detail.id,
          {
            tradeName: tradeName.trim(),
            ruc: ruc.trim(),
            phone: phone.trim(),
            latitude: parsedLatitude,
            longitude: parsedLongitude,
            productName: productName.trim(),
            productPrice: parsedPrice,
          },
          detail.productId
        )
      } else {
        if (!supabase) throw new Error('La app no está configurada para conectarse a Supabase.')
        const payload = buildUpdatePayload(
          detail.id,
          detail.ownerId,
          { latitude: parsedLatitude, longitude: parsedLongitude },
          input
        )
        const { error } = await supabase.rpc('update_mobile_business', payload)
        if (error) throw error
      }

      Alert.alert('Negocio actualizado', 'Los cambios se guardaron correctamente.')
      onSaved()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudo guardar el negocio.')
    } finally {
      setSaving(false)
    }
  }

  function handleSelectTab(tab: TabKey) {
    setActiveTab(tab)
    if (!visitedTabs.has(tab)) {
      setVisitedTabs(new Set([...visitedTabs, tab]))
    }
  }

  if (loadingDetail) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand[600]} />
      </View>
    )
  }

  if (loadError || !detail) {
    return (
      <View style={commonStyles.container}>
        <Banner variant="error" message={loadError ?? 'No se pudo cargar el negocio.'} />
      </View>
    )
  }

  return (
    <View style={commonStyles.container}>
      <ScrollView contentContainerStyle={commonStyles.content}>
        <View style={styles.headerRow}>
          <Text style={[commonStyles.title, styles.titleNoMargin]}>Editar negocio</Text>
          <Button title="Guardar" onPress={handleGuardar} loading={saving} style={styles.saveButton} />
        </View>

        {saveError ? <Banner variant="error" message={saveError} /> : null}

        <TextField
          label="Negocio"
          value={tradeName}
          onChangeText={setTradeName}
          placeholder="Nombre del negocio"
          error={errorFor(errors, 'tradeName')}
        />

        <TextField label="RUC" value={ruc} onChangeText={setRuc} placeholder="RUC" error={errorFor(errors, 'ruc')} />

        <TextField
          label="Teléfono"
          value={phone}
          onChangeText={setPhone}
          placeholder="Teléfono"
          keyboardType="phone-pad"
          error={errorFor(errors, 'phone')}
        />

        <TextField label="Latitud" value={latitude} onChangeText={setLatitude} keyboardType="numeric" />

        <TextField label="Longitud" value={longitude} onChangeText={setLongitude} keyboardType="numeric" />

        <TextField
          label="Producto/servicio principal"
          value={productName}
          onChangeText={setProductName}
          placeholder="Nombre del producto/servicio"
          error={errorFor(errors, 'productName')}
        />

        <TextField
          label="Precio"
          value={productPrice}
          onChangeText={setProductPrice}
          placeholder="0.00"
          keyboardType="numeric"
          error={errorFor(errors, 'productPrice')}
        />

        {role === 'none' ? (
          <View style={styles.activationArea}>
            <Banner
              variant="info"
              message="Con la suscripción del negocio puede actualizar la información además de agregar videos, imágenes"
            />
            <Button
              title="Activar la suscripción"
              onPress={() => void handleActivarSuscripcion()}
              loading={activating}
            />
            {activationResult ? (
              <Banner variant={activationResult.ok ? 'info' : 'error'} message={activationResult.message} />
            ) : null}
          </View>
        ) : null}

        <TabBar tabs={TABS} activeTab={activeTab} onSelect={handleSelectTab} />

        <View style={styles.tabArea}>
          {visitedTabs.has('skills') ? (
            <View style={hiddenStyle(activeTab !== 'skills')}>
              <SkillsTab businessId={detail.id} ownerId={detail.ownerId} />
            </View>
          ) : null}

          {visitedTabs.has('productos') ? (
            <View style={hiddenStyle(activeTab !== 'productos')}>
              <ProductsTab businessId={detail.id} ownerId={detail.ownerId} />
            </View>
          ) : null}

          {visitedTabs.has('videos') ? (
            <View style={hiddenStyle(activeTab !== 'videos')}>
              <VideosTab businessId={detail.id} />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  )
}

function hiddenStyle(hidden: boolean) {
  return [styles.tabContent, hidden && styles.tabContentHidden]
}

type SectionStatus = 'loading' | 'loaded' | 'empty' | 'error'

interface SkillsTabProps {
  businessId: string
  ownerId: string
}

function SkillsTab({ businessId, ownerId }: SkillsTabProps) {
  const [status, setStatus] = useState<SectionStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [skills, setSkills] = useState<CatalogSkill[]>([])
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function load() {
    setStatus('loading')
    setErrorMessage(null)
    try {
      const found = await fetchSkills(businessId)
      setSkills(found)
      setStatus(found.length > 0 ? 'loaded' : 'empty')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'No se pudieron cargar los skills.')
    }
  }

  useEffect(() => {
    void load()
  }, [businessId])

  async function handleAgregar() {
    const validationError = validateSkillName(name)
    setNameError(validationError)
    if (validationError) return

    setAdding(true)
    setActionError(null)
    try {
      await addSkill({ businessId, ownerId, name })
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
      await removeSkill({ skillId: id, ownerId })
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : mapUploadErrorToSpanish(err))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <View style={styles.tabContentInner}>
      {actionError ? <Banner variant="error" message={actionError} /> : null}

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
          renderItem={({ item, index }) => (
            <ListRow
              index={index}
              label={item.name}
              deleting={deletingId === item.id}
              onDelete={() => handleDelete(item.id)}
            />
          )}
        />
      )}

      <TextField
        value={name}
        onChangeText={setName}
        placeholder="Ej: delivery, panadería artesanal"
        error={nameError ?? undefined}
      />
      <Button title="Agregar" onPress={() => void handleAgregar()} loading={adding} />
    </View>
  )
}

interface ProductsTabProps {
  businessId: string
  ownerId: string
}

function ProductsTab({ businessId, ownerId }: ProductsTabProps) {
  const [status, setStatus] = useState<SectionStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function load() {
    setStatus('loading')
    setErrorMessage(null)
    try {
      const found = await fetchProducts(businessId)
      setProducts(found)
      setStatus(found.length > 0 ? 'loaded' : 'empty')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'No se pudieron cargar los productos.')
    }
  }

  useEffect(() => {
    void load()
  }, [businessId])

  async function handleAgregar() {
    const validationError = validateProductName(name)
    setNameError(validationError)
    if (validationError) return

    setAdding(true)
    setActionError(null)
    try {
      await addProduct({ businessId, ownerId, name })
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
      await removeProduct({ productId: id, ownerId })
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : mapUploadErrorToSpanish(err))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <View style={styles.tabContentInner}>
      {actionError ? <Banner variant="error" message={actionError} /> : null}

      {status !== 'loaded' ? (
        <SectionState
          loading={status === 'loading'}
          errorMessage={status === 'error' ? errorMessage : null}
          onRetry={load}
          emptyMessage={status === 'empty' ? 'Este negocio aún no tiene productos/servicios.' : null}
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <ListRow
              index={index}
              label={item.name}
              deleting={deletingId === item.id}
              onDelete={() => handleDelete(item.id)}
            />
          )}
        />
      )}

      <TextField
        value={name}
        onChangeText={setName}
        placeholder="Nombre del producto/servicio"
        error={nameError ?? undefined}
      />
      <Button title="Agregar" onPress={() => void handleAgregar()} loading={adding} />
    </View>
  )
}

interface VideosTabProps {
  businessId: string
}

function VideosTab({ businessId }: VideosTabProps) {
  const [status, setStatus] = useState<SectionStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [videos, setVideos] = useState<CatalogVideo[]>([])

  async function load() {
    setStatus('loading')
    setErrorMessage(null)
    try {
      const found = await fetchVideosReadOnly(businessId)
      setVideos(found)
      setStatus(found.length > 0 ? 'loaded' : 'empty')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'No se pudieron cargar los videos.')
    }
  }

  useEffect(() => {
    void load()
  }, [businessId])

  return (
    <View style={styles.tabContentInner}>
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
          renderItem={({ item, index }) => <ListRow index={index} label={item.url} />}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  titleNoMargin: {
    marginBottom: 0,
  },
  saveButton: {
    alignSelf: 'auto',
    paddingHorizontal: spacing[4],
  },
  activationArea: {
    gap: spacing[3],
  },
  tabArea: {
    minHeight: 200,
  },
  tabContent: {
    flex: 1,
  },
  tabContentHidden: {
    display: 'none',
  },
  tabContentInner: {
    gap: spacing[3],
  },
  list: {
    gap: spacing[2],
  },
})
