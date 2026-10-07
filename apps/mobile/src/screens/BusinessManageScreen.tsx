import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import { HelpTooltip } from '../components/HelpTooltip'
import { TextField } from '../components/TextField'
import { supabase } from '../lib/supabase'
import { actualizarNegocioPendiente, type Negocio } from '../db/negocio'
import {
  validateBusinessInput,
  validatePassword,
  type BusinessEditInput,
  type BusinessFieldError,
} from '../services/mobileBusinessLogic'
import { getCurrentPosition } from '../services/location'
import { syncPending } from '../services/sync'
import { colors, spacing, typography } from '../theme'

export interface BusinessManageScreenProps {
  negocio: Negocio
  onVolver: () => void
  onActualizado: () => void
  onDarDeBaja: () => void
  onGestionarContenido: () => void
}

function errorFor(errors: BusinessFieldError[], field: BusinessFieldError['field']): string | undefined {
  return errors.find((e) => e.field === field)?.message
}

export function BusinessManageScreen({
  negocio,
  onVolver,
  onActualizado,
  onDarDeBaja,
  onGestionarContenido,
}: BusinessManageScreenProps) {
  const [tradeName, setTradeName] = useState(negocio.tradeName)
  const [productName, setProductName] = useState(negocio.productName)
  const [productPrice, setProductPrice] = useState(String(negocio.productPrice))
  const [phone, setPhone] = useState(negocio.phone)
  const [ruc, setRuc] = useState(negocio.ruc)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [coords, setCoords] = useState({ latitude: negocio.latitude, longitude: negocio.longitude })
  const [errors, setErrors] = useState<BusinessFieldError[]>([])
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [ubicando, setUbicando] = useState(false)
  const [contenidoDisponible, setContenidoDisponible] = useState(false)

  const esActivo = negocio.status === 'active'

  useEffect(() => {
    if (!esActivo) return
    void verificarContenidoDisponible()
  }, [esActivo])

  async function verificarContenidoDisponible() {
    if (!supabase || !negocio.remoteId) {
      setContenidoDisponible(false)
      return
    }
    try {
      const { data, error } = await supabase.rpc('get_mobile_business_status', {
        p_business_id: negocio.remoteId,
        p_owner_id: negocio.ownerRemoteId,
      })
      if (error) throw error
      const estado = Array.isArray(data) ? data[0] : data
      setContenidoDisponible(Boolean(estado?.has_active_subscription))
    } catch {
      setContenidoDisponible(false)
    }
  }

  async function handleActualizarUbicacion() {
    setUbicando(true)
    setAviso(null)
    const location = await getCurrentPosition()
    setUbicando(false)
    if (!location.ok) {
      setAviso(location.message)
      return
    }
    setCoords(location.coords)
  }

  async function handleGuardar() {
    const parsedPrice = Number(productPrice.replace(',', '.'))
    const passwordCambiado = password.length > 0
    const input: BusinessEditInput = {
      tradeName,
      ruc,
      phone,
      productName,
      productPrice: parsedPrice,
      ...(passwordCambiado ? { password, confirmPassword } : {}),
    }

    const validationErrors = validateBusinessInput(input)
    setErrors(validationErrors)
    if (validationErrors.length > 0) return

    setAviso(null)
    setGuardando(true)

    actualizarNegocioPendiente(negocio.id, {
      tradeName: tradeName.trim(),
      ruc: ruc.trim(),
      phone: phone.trim(),
      latitude: coords.latitude,
      longitude: coords.longitude,
      productName: productName.trim(),
      productPrice: parsedPrice,
      ...(passwordCambiado ? { password } : {}),
    })

    const resultado = await syncPending()
    setGuardando(false)
    if (resultado.error || resultado.businessSync?.ok === false) {
      setAviso(`${resultado.businessSync?.error ?? resultado.error} Se reintentará más adelante.`)
    }
    onActualizado()
  }

  if (!esActivo) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Pressable onPress={onVolver} style={styles.cancel}>
          <Text style={styles.cancelText}>‹ Volver</Text>
        </Pressable>

        <Text style={styles.title}>Negocio</Text>

        <Banner variant="info" message="Este negocio está dado de baja." />

        <View style={styles.readOnlyField}>
          <Text style={styles.label}>Negocio</Text>
          <Text style={styles.readOnlyValue}>{negocio.tradeName}</Text>
        </View>

        <View style={styles.readOnlyField}>
          <Text style={styles.label}>Producto principal</Text>
          <Text style={styles.readOnlyValue}>{negocio.productName}</Text>
        </View>

        <View style={styles.readOnlyField}>
          <Text style={styles.label}>Precio</Text>
          <Text style={styles.readOnlyValue}>{negocio.productPrice}</Text>
        </View>

        <View style={styles.readOnlyField}>
          <Text style={styles.label}>Teléfono</Text>
          <Text style={styles.readOnlyValue}>{negocio.phone}</Text>
        </View>

        <View style={styles.readOnlyField}>
          <Text style={styles.label}>RUC</Text>
          <Text style={styles.readOnlyValue}>{negocio.ruc}</Text>
        </View>

        <View style={styles.readOnlyField}>
          <Text style={styles.label}>Latitud</Text>
          <Text style={styles.readOnlyValue}>{negocio.latitude}</Text>
        </View>

        <View style={styles.readOnlyField}>
          <Text style={styles.label}>Longitud</Text>
          <Text style={styles.readOnlyValue}>{negocio.longitude}</Text>
        </View>
      </ScrollView>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={onVolver} style={styles.cancel}>
        <Text style={styles.cancelText}>‹ Volver</Text>
      </Pressable>

      <Text style={styles.title}>Ver negocio</Text>

      {aviso ? <Banner variant="error" message={aviso} /> : null}

      <View style={styles.readOnlyField}>
        <Text style={styles.label}>Latitud</Text>
        <Text style={styles.readOnlyValue}>{coords.latitude}</Text>
      </View>

      <View style={styles.readOnlyField}>
        <Text style={styles.label}>Longitud</Text>
        <Text style={styles.readOnlyValue}>{coords.longitude}</Text>
      </View>

      <Button
        title="📍 Actualizar ubicación actual"
        variant="ghost"
        onPress={handleActualizarUbicacion}
        loading={ubicando}
        style={styles.updateLocationButton}
      />

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
        placeholder="Dejar en blanco para no cambiarlo"
        secureTextEntry
        error={errorFor(errors, 'password')}
      />

      {password.length > 0 ? (
        <TextField
          label="Confirmar Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirmar password"
          secureTextEntry
          error={errorFor(errors, 'confirmPassword')}
        />
      ) : null}

      <Button title="Guardar" onPress={handleGuardar} loading={guardando} style={styles.saveButton} />

      <Button title="Dar de baja" variant="secondary" onPress={onDarDeBaja} style={styles.deactivateButton} />

      {contenidoDisponible ? (
        <Button
          title="Fotos / Videos / Skills"
          variant="ghost"
          onPress={onGestionarContenido}
          style={styles.contentButton}
        />
      ) : (
        <Text style={styles.contentNote}>Conéctate a internet para gestionar fotos, videos y skills.</Text>
      )}
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
  updateLocationButton: {
    alignSelf: 'flex-start',
  },
  passwordLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  saveButton: {
    marginTop: spacing[4],
  },
  deactivateButton: {
    marginTop: spacing[2],
  },
  contentButton: {
    marginTop: spacing[2],
  },
  contentNote: {
    marginTop: spacing[2],
    fontSize: typography.size.xs,
    color: colors.gray[500],
    textAlign: 'center',
  },
})
