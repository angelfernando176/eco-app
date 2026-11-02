import { useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import { TextField } from '../components/TextField'
import { supabase } from '../lib/supabase'
import {
  buildRegisterPayload,
  mapSyncErrorToSpanish,
  validateBusinessInput,
  type BusinessFieldError,
} from '../services/mobileBusinessLogic'
import { colors, spacing, typography } from '../theme'

export interface BusinessAccessCreateScreenProps {
  ownerId: string
  coords: { latitude: number; longitude: number }
  onSaved: () => void
  onCancel: () => void
}

function errorFor(errors: BusinessFieldError[], field: BusinessFieldError['field']): string | undefined {
  return errors.find((e) => e.field === field)?.message
}

/**
 * Adds another business for the current (admin or subscribed) account directly in Supabase —
 * unlike BusinessFormScreen/RegisterMapScreen's first-business flow, this never touches the
 * single-row local `negocio` pending table: the user already has a remote identity here.
 */
export function BusinessAccessCreateScreen({ ownerId, coords, onSaved, onCancel }: BusinessAccessCreateScreenProps) {
  const [tradeName, setTradeName] = useState('')
  const [productName, setProductName] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [phone, setPhone] = useState('')
  const [ruc, setRuc] = useState('')
  const [errors, setErrors] = useState<BusinessFieldError[]>([])
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  async function handleGuardar() {
    const parsedPrice = Number(productPrice.replace(',', '.'))
    const input = { tradeName, ruc, phone, productName, productPrice: parsedPrice }

    const validationErrors = validateBusinessInput(input)
    setErrors(validationErrors)
    if (validationErrors.length > 0) return

    if (!supabase) {
      setAviso('La app no está configurada para conectarse a Supabase.')
      return
    }

    setAviso(null)
    setGuardando(true)
    const payload = buildRegisterPayload(ownerId, coords, input)
    const { error } = await supabase.rpc('register_mobile_business', payload)
    setGuardando(false)

    if (error) {
      setAviso(mapSyncErrorToSpanish(error))
      return
    }

    Alert.alert('Negocio agregado', 'El negocio se agregó correctamente a tu cuenta.')
    onSaved()
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={onCancel} style={styles.cancel}>
        <Text style={styles.cancelText}>‹ Cancelar</Text>
      </Pressable>

      <Text style={styles.title}>Agregar negocio</Text>

      {aviso ? <Banner variant="error" message={aviso} /> : null}

      <TextField
        label="Nombre comercial"
        value={tradeName}
        onChangeText={setTradeName}
        error={errorFor(errors, 'tradeName')}
        style={styles.field}
      />
      <TextField
        label="RUC"
        value={ruc}
        onChangeText={setRuc}
        error={errorFor(errors, 'ruc')}
        keyboardType="numeric"
        style={styles.field}
      />
      <TextField
        label="Teléfono"
        value={phone}
        onChangeText={setPhone}
        error={errorFor(errors, 'phone')}
        keyboardType="phone-pad"
        style={styles.field}
      />
      <TextField
        label="Producto principal"
        value={productName}
        onChangeText={setProductName}
        error={errorFor(errors, 'productName')}
        style={styles.field}
      />
      <TextField
        label="Precio"
        value={productPrice}
        onChangeText={setProductPrice}
        error={errorFor(errors, 'productPrice')}
        keyboardType="decimal-pad"
        style={styles.field}
      />

      <Button title="Guardar" onPress={() => void handleGuardar()} loading={guardando} style={styles.button} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    padding: spacing[6],
  },
  cancel: {
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
    marginBottom: spacing[4],
  },
  field: {
    marginBottom: spacing[3],
  },
  button: {
    marginTop: spacing[4],
  },
})
