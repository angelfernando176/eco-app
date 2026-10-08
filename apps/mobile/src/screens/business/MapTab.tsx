import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import { Platform } from 'react-native'
import { Button } from '../../components/Button'
import { googleMapsApiKey } from '../../config'
import { buildGoogleMapsUrls } from '../../services/businessDetailLogic'
import type { BusinessResult } from '../../services/businessSearchLogic'
import { colors, radius, spacing, typography } from '../../theme'

export interface MapTabProps {
  business: BusinessResult
}

const useGoogleProvider = Platform.OS === 'android' && Boolean(googleMapsApiKey)

export function MapTab({ business }: MapTabProps) {
  const coordinate = { latitude: business.latitude, longitude: business.longitude }
  const { directionsUrl } = buildGoogleMapsUrls(business.latitude, business.longitude, business.tradeName)

  function handleComoLlegar() {
    void Linking.openURL(directionsUrl)
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          provider={useGoogleProvider ? PROVIDER_GOOGLE : undefined}
          initialRegion={{
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Marker coordinate={coordinate} title={business.tradeName} pinColor={colors.brand[600]} />
        </MapView>
      </View>
      <Text style={styles.address}>
        {business.mainStreet} {business.number}, {business.secondaryStreet}
      </Text>
      {business.reference ? <Text style={styles.reference}>{business.reference}</Text> : null}
      <Button title="Cómo llegar" onPress={handleComoLlegar} style={styles.button} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    padding: spacing[4],
    gap: spacing[1],
  },
  mapContainer: {
    height: 260,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  address: {
    fontSize: typography.size.base,
    color: colors.gray[800],
  },
  reference: {
    fontSize: typography.size.sm,
    color: colors.gray[600],
  },
  button: {
    marginTop: 0,
  },
})
