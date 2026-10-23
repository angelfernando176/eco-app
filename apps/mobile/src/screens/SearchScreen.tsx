import { Picker } from '@react-native-picker/picker'
import { useEffect, useState } from 'react'
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { HelpTooltip } from '../components/HelpTooltip'
import { RadarLoading } from '../components/RadarLoading'
import { TextField } from '../components/TextField'
import { TimeStepperField } from '../components/TimeStepperField'
import { googleMapsApiKey } from '../config'
import { guardarBusqueda } from '../db/busquedas'
import { searchPlacesStructured, type PlaceSuggestion } from '../services/geocoding'
import { searchBusinesses } from '../services/businessSearch'
import type { BusinessResult } from '../services/businessSearchLogic'
import { formatDistance, RADIUS_OPTIONS_KM, regionForRadius, type GeoPoint, type RadiusKm } from '../services/geo'
import { getCurrentPosition } from '../services/location'
import { colors, radius, spacing, typography } from '../theme'

function formatHora(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function esHoraValida(hour: number, minute: number): boolean {
  const now = new Date()
  const minutosIngresados = hour * 60 + minute
  const minutosActuales = now.getHours() * 60 + now.getMinutes()
  return minutosIngresados > minutosActuales
}

function horaInicial(): { hour: number; minute: number } {
  const now = new Date()
  let hour = now.getHours()
  let minute = now.getMinutes() + 1
  if (minute >= 60) {
    minute = 0
    hour = (hour + 1) % 24
  }
  return { hour, minute }
}

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

  const [otroLugarAbierto, setOtroLugarAbierto] = useState(false)
  const [ciudadTexto, setCiudadTexto] = useState('')
  const [callePrincipalTexto, setCallePrincipalTexto] = useState('')
  const [calleSecundariaTexto, setCalleSecundariaTexto] = useState('')
  const [lugarSeleccionado, setLugarSeleccionado] = useState<PlaceSuggestion | null>(null)
  const [sugerencias, setSugerencias] = useState<PlaceSuggestion[]>([])
  const [horaHabilitada, setHoraHabilitada] = useState(false)
  const [horaHour, setHoraHour] = useState(0)
  const [horaMinute, setHoraMinute] = useState(0)
  const horaError =
    horaHabilitada && !esHoraValida(horaHour, horaMinute)
      ? 'Ingresá una hora posterior a la actual.'
      : undefined

  useEffect(() => {
    if (!ciudadTexto || lugarSeleccionado) {
      setSugerencias([])
      return
    }
    const timeoutId = setTimeout(() => {
      searchPlacesStructured({
        city: ciudadTexto,
        mainStreet: callePrincipalTexto,
        secondaryStreet: calleSecundariaTexto,
      }).then(setSugerencias)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [ciudadTexto, callePrincipalTexto, calleSecundariaTexto, lugarSeleccionado])

  function handleCiudadTextoChange(value: string) {
    setCiudadTexto(value)
    setLugarSeleccionado(null)
  }

  function handleCallePrincipalTextoChange(value: string) {
    setCallePrincipalTexto(value)
    setLugarSeleccionado(null)
  }

  function handleCalleSecundariaTextoChange(value: string) {
    setCalleSecundariaTexto(value)
    setLugarSeleccionado(null)
  }

  function handleSeleccionarSugerencia(suggestion: PlaceSuggestion) {
    setLugarSeleccionado(suggestion)
    setSugerencias([])
  }

  function handleToggleHora() {
    if (horaHabilitada) {
      setHoraHabilitada(false)
      return
    }
    const inicial = horaInicial()
    setHoraHour(inicial.hour)
    setHoraMinute(inicial.minute)
    setHoraHabilitada(true)
  }

  async function handleBuscar() {
    setStatus('loading')
    setErrorMessage(null)

    let coords: GeoPoint
    if (lugarSeleccionado) {
      coords = { latitude: lugarSeleccionado.latitude, longitude: lugarSeleccionado.longitude }
    } else {
      const location = await getCurrentPosition()
      if (!location.ok) {
        setStatus('error')
        setErrorMessage(location.message)
        return
      }
      coords = location.coords
    }

    try {
      const found = await searchBusinesses({
        center: coords,
        radiusKm,
        term: term.trim() || undefined,
      })
      guardarBusqueda({
        termino: term.trim() || null,
        radioKm: radiusKm,
        latitud: coords.latitude,
        longitud: coords.longitude,
        resultados: found.length,
        horaBuscada: horaHabilitada && esHoraValida(horaHour, horaMinute) ? formatHora(horaHour, horaMinute) : null,
      })
      setCenter(coords)
      setResults(found)
      setStatus(found.length > 0 ? 'results' : 'empty')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'No se pudo completar la búsqueda.')
    }
  }

  const region = center ? regionForRadius(center, radiusKm) : null
  const terminoValido = term.trim().length > 2
  const puedeBuscar =
    terminoValido &&
    (!otroLugarAbierto ||
      (ciudadTexto.trim().length > 0 && callePrincipalTexto.trim().length > 0 && calleSecundariaTexto.trim().length > 0))

  return (
    <View style={styles.container}>
      <FlatList
        data={status === 'results' ? results : []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.greeting}>
              Hola{nombre ? `, ${nombre}` : ''}. ¿Qué negocio buscas?
            </Text>

            <View style={styles.searchRow}>
              <View style={styles.searchField}>
                <TextField
                  label="Qué deseas buscar"
                  value={term}
                  onChangeText={setTerm}
                  placeholder="Ej: panadería"
                />
              </View>
              <View style={styles.radiusField}>
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

            {!otroLugarAbierto ? (
              <View style={styles.buttonRow}>
                <Button
                  title="Buscar"
                  onPress={handleBuscar}
                  loading={status === 'loading'}
                  disabled={!puedeBuscar}
                  style={styles.rowButton}
                />
                <Button
                  title="Buscar en otro lugar"
                  variant="ghost"
                  onPress={() => setOtroLugarAbierto(true)}
                  style={styles.rowButton}
                />
              </View>
            ) : null}

            {otroLugarAbierto ? (
              <View style={styles.otroLugarPanel}>
                <View style={styles.lugarCampos}>
                  <TextField
                    label="Ciudad:"
                    value={ciudadTexto}
                    onChangeText={handleCiudadTextoChange}
                    placeholder="Ej: Quito"
                  />
                  <TextField
                    label="Calle principal:"
                    value={callePrincipalTexto}
                    onChangeText={handleCallePrincipalTextoChange}
                    placeholder="Ej: Av. Amazonas"
                  />
                  <TextField
                    label="Calle secundaria (opcional):"
                    value={calleSecundariaTexto}
                    onChangeText={handleCalleSecundariaTextoChange}
                    placeholder="Ej: Naciones Unidas"
                  />
                  {sugerencias.length > 0 && !lugarSeleccionado ? (
                    <View style={styles.sugerenciasList}>
                      {sugerencias.map((suggestion, index) => (
                        <Pressable
                          key={`${suggestion.latitude}-${suggestion.longitude}-${index}`}
                          onPress={() => handleSeleccionarSugerencia(suggestion)}
                          style={styles.sugerenciaRow}
                        >
                          <Text style={styles.sugerenciaText} numberOfLines={1} ellipsizeMode="tail">
                            {suggestion.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                  {lugarSeleccionado ? (
                    <Text style={styles.lugarSeleccionadoText} numberOfLines={2} ellipsizeMode="tail">
                      Ubicación elegida: {lugarSeleccionado.label}
                    </Text>
                  ) : null}
                </View>

                <View>
                  <View style={styles.horaLabelRow}>
                    <Text style={styles.label}>En qué momento deseas buscar:</Text>
                    <HelpTooltip message="Busca la disponibilidad de un producto/servicio en una hora determinada" />
                  </View>
                  {horaHabilitada ? (
                    <>
                      <TimeStepperField
                        hour={horaHour}
                        minute={horaMinute}
                        onChangeHour={setHoraHour}
                        onChangeMinute={setHoraMinute}
                        error={horaError}
                      />
                      <Button
                        title="Quitar hora"
                        variant="ghost"
                        onPress={handleToggleHora}
                        style={styles.quitarHoraButton}
                      />
                    </>
                  ) : (
                    <Button title="Agregar hora" variant="ghost" onPress={handleToggleHora} style={styles.quitarHoraButton} />
                  )}
                </View>

                <View style={styles.buttonRow}>
                  <Button
                    title="Buscar"
                    onPress={handleBuscar}
                    loading={status === 'loading'}
                    disabled={!puedeBuscar}
                    style={styles.rowButton}
                  />
                  <Button
                    title="Buscar aquí"
                    variant="ghost"
                    onPress={() => setOtroLugarAbierto(false)}
                    style={styles.rowButton}
                  />
                </View>
              </View>
            ) : null}

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
  greeting: {
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
  },
  picker: {
    width: 120,
  },
  button: {
    marginTop: spacing[2],
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  rowButton: {
    flex: 1,
  },
  otroLugarPanel: {
    gap: spacing[3],
  },
  lugarCampos: {
    gap: spacing[2],
  },
  lugarSeleccionadoText: {
    fontSize: typography.size.sm,
    color: colors.brand[700],
  },
  sugerenciasList: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: radius.md,
    marginTop: spacing[1],
  },
  sugerenciaRow: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  sugerenciaText: {
    fontSize: typography.size.sm,
    color: colors.gray[700],
  },
  horaLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quitarHoraButton: {
    alignSelf: 'flex-start',
    marginTop: spacing[2],
  },
  label: {
    fontSize: typography.size.sm,
    color: colors.gray[700],
    fontWeight: typography.weight.medium as '500',
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
