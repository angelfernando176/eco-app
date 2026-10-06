import { useState } from 'react'
import { FlatList, Platform, StyleSheet, Text, View } from 'react-native'
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Chip } from '../components/Chip'
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
            <Text style={styles.title}>ECO</Text>
            <Text style={styles.greeting}>Hola{nombre ? `, ${nombre}` : ''}. ¿Qué negocio buscas?</Text>

            <TextField
              label="Nombre o palabra clave"
              value={term}
              onChangeText={setTerm}
              placeholder="Ej: panadería"
            />

            <Text style={styles.label}>Radio de búsqueda</Text>
            <View style={styles.chips}>
              {RADIUS_OPTIONS_KM.map((option) => (
                <Chip
                  key={option}
                  label={`${option} km`}
                  selected={radiusKm === option}
                  onPress={() => setRadiusKm(option)}
                />
              ))}
            </View>

            <Button title="Buscar" onPress={handleBuscar} loading={status === 'loading'} style={styles.button} />

            {status === 'error' && errorMessage ? (
              <View style={styles.banner}>
                <Banner variant="error" message={errorMessage} />
                <Button title="Reintentar" variant="ghost" onPress={handleBuscar} style={styles.retryButton} />
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
          <Card style={styles.resultCard}>
            <Text style={styles.resultName} onPress={() => onSelectBusiness(item)}>
              {item.tradeName}
            </Text>
            <Text style={styles.resultAddress}>
              {item.mainStreet} {item.number}, {item.secondaryStreet}
            </Text>
            <Text style={styles.resultDistance}>{formatDistance(item.distanceKm)}</Text>
          </Card>
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
  title: {
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.bold as '700',
    color: colors.brand[700],
  },
  greeting: {
    fontSize: typography.size.base,
    color: colors.gray[700],
    marginBottom: spacing[2],
  },
  label: {
    fontSize: typography.size.sm,
    color: colors.gray[700],
    fontWeight: typography.weight.medium as '500',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  button: {
    marginTop: spacing[2],
  },
  banner: {
    gap: spacing[2],
  },
  retryButton: {
    alignSelf: 'flex-start',
  },
  mapContainer: {
    height: 260,
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
    gap: spacing[1],
  },
  resultName: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold as '600',
    color: colors.brand[700],
  },
  resultAddress: {
    fontSize: typography.size.sm,
    color: colors.gray[700],
  },
  resultDistance: {
    fontSize: typography.size.sm,
    color: colors.gray[500],
  },
})
