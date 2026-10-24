import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import { TextField } from '../components/TextField'
import {
  addSkillAdmin,
  deleteSkillAdmin,
  getBusinessDetailAdmin,
  updateBusinessAdmin,
  type AdminBusinessDetail,
} from '../services/adminBusinessApi'
import { validateBusinessInput, type BusinessEditInput, type BusinessFieldError } from '../services/mobileBusinessLogic'
import { validateSkillName } from '../services/mobileContentLogic'
import { colors, spacing, typography } from '../theme'

export interface BusinessAdminEditScreenProps {
  businessId: string
  onSaved: () => void
}

function errorFor(errors: BusinessFieldError[], field: BusinessFieldError['field']): string | undefined {
  return errors.find((e) => e.field === field)?.message
}

export function BusinessAdminEditScreen({ businessId, onSaved }: BusinessAdminEditScreenProps) {
  const [detail, setDetail] = useState<AdminBusinessDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [tradeName, setTradeName] = useState('')
  const [ruc, setRuc] = useState('')
  const [phone, setPhone] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [productName, setProductName] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [skills, setSkills] = useState<{ id: string; name: string }[]>([])
  const [skillName, setSkillName] = useState('')
  const [skillError, setSkillError] = useState<string | undefined>(undefined)
  const [skillBusy, setSkillBusy] = useState(false)

  const [errors, setErrors] = useState<BusinessFieldError[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    void loadDetail()
  }, [businessId])

  async function loadDetail() {
    setLoadingDetail(true)
    setLoadError(null)
    try {
      const data = await getBusinessDetailAdmin(businessId)
      setDetail(data)
      setTradeName(data.tradeName)
      setRuc(data.ruc)
      setPhone(data.phone)
      setLatitude(String(data.latitude))
      setLongitude(String(data.longitude))
      setProductName(data.productName)
      setProductPrice(String(data.productPrice))
      setSkills(data.skills)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'No se pudo cargar el negocio.')
    } finally {
      setLoadingDetail(false)
    }
  }

  async function handleAgregarSkill() {
    if (!detail) return
    const trimmed = skillName.trim()
    const validationError = validateSkillName(trimmed)
    setSkillError(validationError ?? undefined)
    if (validationError) return

    setSkillBusy(true)
    try {
      await addSkillAdmin(detail.id, detail.ownerId, trimmed)
      const data = await getBusinessDetailAdmin(detail.id)
      setSkills(data.skills)
      setSkillName('')
    } catch (err) {
      setSkillError(err instanceof Error ? err.message : 'No se pudo agregar el skill.')
    } finally {
      setSkillBusy(false)
    }
  }

  async function handleEliminarSkill(skillId: string) {
    if (!detail) return
    setSkillBusy(true)
    try {
      await deleteSkillAdmin(skillId, detail.ownerId)
      setSkills((current) => current.filter((skill) => skill.id !== skillId))
    } catch (err) {
      setSkillError(err instanceof Error ? err.message : 'No se pudo eliminar el skill.')
    } finally {
      setSkillBusy(false)
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

      Alert.alert('Negocio actualizado', 'Los cambios se guardaron correctamente.')
      onSaved()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudo guardar el negocio.')
    } finally {
      setSaving(false)
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
      <View style={styles.container}>
        <Banner variant="error" message={loadError ?? 'No se pudo cargar el negocio.'} />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Editar negocio</Text>

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
        label="Producto principal"
        value={productName}
        onChangeText={setProductName}
        placeholder="Nombre del producto"
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

      <Text style={styles.label}>Skills</Text>
      {skills.map((skill) => (
        <View key={skill.id} style={styles.skillRow}>
          <Text style={styles.skillName}>{skill.name}</Text>
          <Button
            title="Eliminar"
            variant="ghost"
            onPress={() => void handleEliminarSkill(skill.id)}
            disabled={skillBusy}
            style={styles.skillDeleteButton}
          />
        </View>
      ))}

      <TextField
        value={skillName}
        onChangeText={setSkillName}
        placeholder="Ej: delivery, panadería artesanal"
        error={skillError}
      />
      <Button title="Agregar" variant="ghost" onPress={() => void handleAgregarSkill()} loading={skillBusy} />

      <Button title="Guardar" onPress={handleGuardar} loading={saving} style={styles.saveButton} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  content: {
    padding: spacing[6],
    gap: spacing[3],
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold as '700',
    color: colors.brand[700],
    marginBottom: spacing[2],
  },
  label: {
    marginBottom: spacing[1],
    fontSize: typography.size.sm,
    color: colors.gray[700],
    fontWeight: typography.weight.medium as '500',
  },
  passwordLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  skillName: {
    flex: 1,
    fontSize: typography.size.base,
    color: colors.gray[900],
  },
  skillDeleteButton: {
    alignSelf: 'flex-start',
  },
  saveButton: {
    marginTop: spacing[4],
  },
})
