import { useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import { HelpTooltip } from '../components/HelpTooltip'
import { TextField } from '../components/TextField'
import { crearNegocioPendiente } from '../db/negocio'
import { obtenerIngreso } from '../db/ingreso'
import {
  validateBusinessInput,
  validatePassword,
  type BusinessFieldError,
} from '../services/mobileBusinessLogic'
import { syncPending } from '../services/sync'
import { colors, spacing, typography } from '../theme'

export interface BusinessFormScreenProps {
  nombreUsuario: string
  coords: { latitude: number; longitude: number }
  ownerRemoteId: string | null
  onSaved: () => void
  onCancel: () => void
}

function errorFor(errors: BusinessFieldError[], field: BusinessFieldError['field']): string | undefined {
  return errors.find((e) => e.field === field)?.message
}

export function BusinessFormScreen({
  nombreUsuario,
  coords,
  ownerRemoteId,
  onSaved,
  onCancel,
}: BusinessFormScreenProps) {
  const [tradeName, setTradeName] = useState('')
  const [productName, setProductName] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [phone, setPhone] = useState('')
  const [ruc, setRuc] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<BusinessFieldError[]>([])
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  async function handleGuardar() {
    const parsedPrice = Number(productPrice.replace(',', '.'))
    const input = {
      tradeName,
      ruc,
      phone,
      productName,
      productPrice: parsedPrice,
      password,
      confirmPassword,
    }

    const validationErrors = validateBusinessInput(input)
    setErrors(validationErrors)
    if (validationErrors.length > 0) return

    setAviso(null)

    const ingresoActual = obtenerIngreso()
    const ownerId = ingresoActual?.remoteUserId ?? ownerRemoteId
    if (!ownerId) {
      setAviso('Conéctate a Internet al menos una vez antes de registrar tu negocio, para poder vincularlo a tu usuario.')
      return
    }

    setGuardando(true)
    crearNegocioPendiente({
      ownerRemoteId: ownerId,
      tradeName: tradeName.trim(),
      ruc: ruc.trim(),
      phone: phone.trim(),
      latitude: coords.latitude,
      longitude: coords.longitude,
      productName: productName.trim(),
      productPrice: parsedPrice,
      password,
    })

    Alert.alert(
      'Negocio registrado',
      'Recuerda el usuario y password ingresados, estos te permitirán administrar la cuenta de tu negocio en el futuro.'
    )

    const resultado = await syncPending()
    setGuardando(false)
    if (resultado.error || resultado.businessSync?.ok === false) {
      setAviso(`${resultado.businessSync?.error ?? resultado.error} Se reintentará más adelante.`)
    }
    onSaved()
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={onCancel} style={styles.cancel}>
        <Text style={styles.cancelText}>‹ Cancelar</Text>
      </Pressable>

      <Text style={styles.title}>Registrar negocio</Text>

      {aviso ? <Banner variant="error" message={aviso} /> : null}

      <View style={styles.readOnlyField}>
        <Text style={styles.label}>Usuario</Text>
        <Text style={styles.readOnlyValue}>{nombreUsuario}</Text>
      </View>

      <View style={styles.readOnlyField}>
        <Text style={styles.label}>Latitud</Text>
        <Text style={styles.readOnlyValue}>{coords.latitude}</Text>
      </View>

      <View style={styles.readOnlyField}>
        <Text style={styles.label}>Longitud</Text>
        <Text style={styles.readOnlyValue}>{coords.longitude}</Text>
      </View>

      <TextField
        label="Negocio"
        value={tradeName}
        onChangeText={setTradeName}
        placeholder="Nombre del negocio"
        error={errorFor(errors, 'tradeName')}
      />

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

      <TextField
        label="Teléfono"
        value={phone}
        onChangeText={setPhone}
        placeholder="Teléfono"
        keyboardType="phone-pad"
        error={errorFor(errors, 'phone')}
      />

      <TextField label="RUC" value={ruc} onChangeText={setRuc} placeholder="RUC" error={errorFor(errors, 'ruc')} />

      <View style={styles.passwordLabelRow}>
        <Text style={styles.label}>Password</Text>
        <HelpTooltip message={validatePassword('') ?? ''} />
      </View>
      <TextField
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        error={errorFor(errors, 'password')}
      />

      <TextField
        label="Confirmar Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Confirmar password"
        secureTextEntry
        error={errorFor(errors, 'confirmPassword')}
      />

      <Button title="Guardar" onPress={handleGuardar} loading={guardando} style={styles.saveButton} />
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
    gap: spacing[3],
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
    marginBottom: spacing[2],
  },
  readOnlyField: {
    alignSelf: 'stretch',
  },
  label: {
    marginBottom: spacing[1],
    fontSize: typography.size.sm,
    color: colors.gray[700],
    fontWeight: typography.weight.medium as '500',
  },
  readOnlyValue: {
    fontSize: typography.size.base,
    color: colors.gray[900],
  },
  passwordLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  saveButton: {
    marginTop: spacing[4],
  },
})
