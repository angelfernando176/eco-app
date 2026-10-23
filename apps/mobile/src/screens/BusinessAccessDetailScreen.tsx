import { useEffect, useState } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'
import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import { SectionState } from '../components/SectionState'
import { ecoWebUrl } from '../config'
import { getBusinessAccessDetail, requestSubscriptionActivation, type BusinessAccessDetail } from '../services/businessAccess'
import { colors, spacing, typography } from '../theme'

export interface BusinessAccessDetailScreenProps {
  businessId: string
  role: 'none' | 'subscribed' | 'admin'
}

export function BusinessAccessDetailScreen({ businessId, role }: BusinessAccessDetailScreenProps) {
  const [negocio, setNegocio] = useState<BusinessAccessDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activating, setActivating] = useState(false)
  const [activationResult, setActivationResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    void loadDetail()
  }, [businessId])

  async function loadDetail() {
    setLoading(true)
    setError(null)
    try {
      const result = await getBusinessAccessDetail(businessId)
      setNegocio(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el negocio.')
    } finally {
      setLoading(false)
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

  function handleActualizarInformacion() {
    void Linking.openURL(ecoWebUrl)
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <SectionState loading />
      </View>
    )
  }

  if (error || !negocio) {
    return (
      <View style={styles.container}>
        <SectionState errorMessage={error ?? 'No se pudo cargar el negocio.'} onRetry={() => void loadDetail()} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{negocio.tradeName}</Text>

      <View style={styles.readOnlyField}>
        <Text style={styles.label}>Negocio</Text>
        <Text style={styles.readOnlyValue}>{negocio.tradeName}</Text>
      </View>

      <View style={styles.readOnlyField}>
        <Text style={styles.label}>RUC</Text>
        <Text style={styles.readOnlyValue}>{negocio.ruc}</Text>
      </View>

      <View style={styles.readOnlyField}>
        <Text style={styles.label}>Teléfono</Text>
        <Text style={styles.readOnlyValue}>{negocio.phone}</Text>
      </View>

      <View style={styles.readOnlyField}>
        <Text style={styles.label}>Producto principal</Text>
        <Text style={styles.readOnlyValue}>{negocio.productName}</Text>
      </View>

      <View style={styles.readOnlyField}>
        <Text style={styles.label}>Precio</Text>
        <Text style={styles.readOnlyValue}>{negocio.productPrice}</Text>
      </View>

      {role === 'none' ? (
        <View style={styles.actionArea}>
          <Banner
            variant="info"
            message="Con la suscripción del negocio puede actualizar la información además de agregar videos, imágenes"
          />
          <Button
            title="Activar la suscripción"
            onPress={() => void handleActivarSuscripcion()}
            loading={activating}
            style={styles.actionButton}
          />
          {activationResult ? (
            <Banner variant={activationResult.ok ? 'info' : 'error'} message={activationResult.message} />
          ) : null}
        </View>
      ) : (
        <View style={styles.actionArea}>
          <Button title="Actualizar información" onPress={handleActualizarInformacion} style={styles.actionButton} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing[6],
    gap: spacing[3],
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
  actionArea: {
    marginTop: spacing[4],
    gap: spacing[3],
  },
  actionButton: {
    marginTop: spacing[1],
  },
})
