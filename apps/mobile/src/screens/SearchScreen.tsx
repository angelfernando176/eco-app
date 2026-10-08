import { Picker } from '@react-native-picker/picker'
import { useState } from 'react'
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { RadarLoading } from '../components/RadarLoading'
import { TextField } from '../components/TextField'
import { googleMapsApiKey } from '../config'
import { guardarBusqueda } from '../db/busquedas'
import { searchBusinesses } from '../services/businessSearch'
import type { BusinessResult } from '../services/businessSearchLogic'
import { formatDistance, RADIUS_OPTIONS_KM, regionForRadius, type GeoPoint, type RadiusKm } from '../services/geo'
import { getCurrentPosition } from '../services/location'
import { colors, radius, spacing, typography } from '../theme'

export interface SearchScreenProps {
  nombre: string
  onSelectBusiness: (business: BusinessResult) => void
}

type Status = 'idle' | 'loading' | 'results' | 'empty' | 'error'

const useGoogleProvider = Platform.OS === 'android' && Boolean(googleMapsApiKey)

export function SearchScreen({ nombre, onSelectBusiness }: SearchScreenProps) {
  const [term, setTerm] = useState('')
  const [radiusKm, setRadiusKm] = useState<RadiusKm>(5)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [results, setResults] = useState<BusinessResult[]>([])
  const [center, setCenter] = useState<GeoPoint | null>(null)

  async function handleBuscar() {
    setStatus('loading')
    setErrorMessage(null)

    const location = await getCurrentPosition()
    if (!location.ok) {
      setStatus('error')
      setErrorMessage(location.message)
      return
    }

    try {
      const found = await searchBusinesses({
        center: location.coords,
        radiusKm,
        term: term.trim() || undefined,
      })
      guardarBusqueda({
        termino: term.trim() || null,
        radioKm: radiusKm,
        latitud: location.coords.latitude,
        longitud: location.coords.longitude,
        resultados: found.length,
      })
      setCenter(location.coords)
      setResults(found)
      setStatus(found.length > 0 ? 'results' : 'empty')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'No se pudo completar la búsqueda.')
    }
  }

  const region = center ? regionForRadius(center, radiusKm) : null

  return (
    <View style={styles.container}>
      <FlatList
        data={status === 'results' ? results : []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>ECO</Text>
              <Text style={styles.greeting} numberOfLines={1} ellipsizeMode="tail">
                Hola{nombre ? `, ${nombre}` : ''}. ¿Qué negocio buscas?
              </Text>
            </View>

            <View style={styles.searchRow}>
              <View style={styles.searchField}>
                <TextField
                  label="Tu búsqueda:"
                  value={term}
                  onChangeText={setTerm}
                  placeholder="Ej: panadería"
                />
              </View>
              <View style={styles.radiusField}>
                <Text style={styles.label}>Radio de búsqueda</Text>
                <Picker
                  selectedValue={String(radiusKm)}
                  onValueChange={(value) => setRadiusKm(Number(value) as RadiusKm)}
                  style={styles.picker}
                >
                  {RADIUS_OPTIONS_KM.map((option) => (
                    <Picker.Item key={option} label={`${option} km`} value={String(option)} />
                  ))}
                </Picker>
              </View>
            </View>

            <Button title="Buscar" onPress={handleBuscar} loading={status === 'loading'} style={styles.button} />

            {status === 'error' && errorMessage ? (
              <View style={styles.banner}>
                <Banner variant="error" message={errorMessage} />
                <Button title="Reintentar" variant="ghost" onPress={handleBuscar} style={styles.retryButton} />
              </View>
            ) : null}

            {status === 'loading' ? (
              <View style={styles.radarContainer}>
                <RadarLoading />
                <Text style={styles.radarCaption}>Buscando negocios cerca tuyo…</Text>
              </View>
            ) : null}

            {status === 'empty' ? (
              <View style={styles.banner}>
                <Banner variant="info" message="No encontramos negocios en ese radio. Prueba con uno mayor." />
              </View>
            ) : null}

            {status === 'results' && center && region ? (
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  provider={useGoogleProvider ? PROVIDER_GOOGLE : undefined}
                  region={region}
                >
                  <Marker coordinate={center} title="Tu ubicación" pinColor={colors.brand[600]} />
                  <Circle
                    center={center}
                    radius={radiusKm * 1000}
                    strokeColor={colors.brand[600]}
                    fillColor="rgba(16, 185, 129, 0.15)"
                  />
                  {results.map((business) => (
                    <Marker
                      key={business.id}
                      coordinate={{ latitude: business.latitude, longitude: business.longitude }}
                      title={business.tradeName}
                      onPress={() => onSelectBusiness(business)}
                    />
                  ))}
                </MapView>
              </View>
            ) : null}

            {status === 'results' ? (
              <Text style={styles.resultsCount}>
                {results.length} {results.length === 1 ? 'negocio encontrado' : 'negocios encontrados'}
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => onSelectBusiness(item)}>
            <Card style={styles.resultCard}>
              <Text style={styles.resultName} numberOfLines={1} ellipsizeMode="tail">
                {item.tradeName}
              </Text>
              <Text style={styles.resultPhone} numberOfLines={1} ellipsizeMode="tail">
                {item.phone}
              </Text>
              <Text style={styles.resultDistance} numberOfLines={1}>
                {formatDistance(item.distanceKm)}
              </Text>
            </Card>
          </Pressable>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  listContent: {
    padding: spacing[6],
    gap: spacing[3],
  },
  header: {
    gap: spacing[3],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing[2],
  },
  title: {
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.bold as '700',
    color: colors.brand[700],
  },
  greeting: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.gray[600],
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[3],
  },
  searchField: {
    flex: 1,
  },
  radiusField: {
    width: 120,
    gap: spacing[1],
  },
  picker: {
    width: 120,
  },
  label: {
    fontSize: typography.size.sm,
    color: colors.gray[700],
    fontWeight: typography.weight.medium as '500',
  },
  button: {
    marginTop: spacing[2],
  },
  banner: {
    gap: spacing[2],
  },
  radarContainer: {
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[6],
  },
  radarCaption: {
    fontSize: typography.size.sm,
    color: colors.gray[600],
  },
  retryButton: {
    alignSelf: 'flex-start',
  },
  mapContainer: {
    height: 360,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  resultsCount: {
    fontSize: typography.size.sm,
    color: colors.gray[600],
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  resultName: {
    flex: 2,
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold as '600',
    color: colors.brand[700],
  },
  resultPhone: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.gray[700],
  },
  resultDistance: {
    width: 60,
    textAlign: 'right',
    fontSize: typography.size.sm,
    color: colors.gray[500],
  },
})
