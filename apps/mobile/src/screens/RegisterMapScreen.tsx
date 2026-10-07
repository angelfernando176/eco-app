import { useEffect, useState } from 'react'
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import { googleMapsApiKey } from '../config'
import { getCurrentPosition } from '../services/location'
import type { GeoPoint } from '../services/geo'
import { colors, radius, spacing, typography } from '../theme'

export interface RegisterMapScreenProps {
  onIniciarRegistro: (coords: GeoPoint) => void
  onCancel: () => void
}

type Status = 'loading' | 'ready' | 'error'

const useGoogleProvider = Platform.OS === 'android' && Boolean(googleMapsApiKey)

export function RegisterMapScreen({ onIniciarRegistro, onCancel }: RegisterMapScreenProps) {
  const [status, setStatus] = useState<Status>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [coords, setCoords] = useState<GeoPoint | null>(null)

  useEffect(() => {
    void cargarUbicacion()
  }, [])

  async function cargarUbicacion() {
    setStatus('loading')
    setErrorMessage(null)
    const location = await getCurrentPosition()
    if (!location.ok) {
      setStatus('error')
      setErrorMessage(location.message)
      return
    }
    setCoords(location.coords)
    setStatus('ready')
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={onCancel} style={styles.cancel}>
        <Text style={styles.cancelText}>‹ Cancelar</Text>
      </Pressable>

      {status === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand[600]} />
          <Text style={styles.loadingText}>Obteniendo tu ubicación…</Text>
        </View>
      ) : null}

      {status === 'error' && errorMessage ? (
        <View style={styles.center}>
          <Banner variant="error" message={errorMessage} />
          <Button title="Reintentar" variant="ghost" onPress={cargarUbicacion} style={styles.retryButton} />
        </View>
      ) : null}

      {status === 'ready' && coords ? (
        <>
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              provider={useGoogleProvider ? PROVIDER_GOOGLE : undefined}
              initialRegion={{
                latitude: coords.latitude,
                longitude: coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Marker coordinate={coords} title="Ubicación actual" pinColor={colors.brand[600]} />
            </MapView>
          </View>
          <Button
            title="▶ Iniciar registro"
            onPress={() => onIniciarRegistro(coords)}
            style={styles.startButton}
          />
        </>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  cancel: {
    padding: spacing[4],
  },
  cancelText: {
    fontSize: typography.size.base,
    color: colors.brand[700],
    fontWeight: typography.weight.medium as '500',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
    gap: spacing[3],
  },
  loadingText: {
    fontSize: typography.size.base,
    color: colors.gray[700],
  },
  retryButton: {
    alignSelf: 'center',
  },
  mapContainer: {
    flex: 1,
    margin: spacing[4],
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  startButton: {
    margin: spacing[4],
  },
})
