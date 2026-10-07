import { useEffect, useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { guardarIngreso, obtenerIngreso, type Ingreso } from './src/db/ingreso'
import { initLocalDatabase } from './src/db/database'
import { obtenerNegocioLocal, prepararBajaPendiente, type Negocio } from './src/db/negocio'
import { BusinessDetailScreen } from './src/screens/BusinessDetailScreen'
import { BusinessFormScreen } from './src/screens/BusinessFormScreen'
import { BusinessManageScreen } from './src/screens/BusinessManageScreen'
import { DeactivationSurveyScreen } from './src/screens/DeactivationSurveyScreen'
import { FirstAccessScreen } from './src/screens/FirstAccessScreen'
import { RegisterMapScreen } from './src/screens/RegisterMapScreen'
import { SecondAccessScreen } from './src/screens/SecondAccessScreen'
import { SearchScreen } from './src/screens/SearchScreen'
import type { GeoPoint } from './src/services/geo'
import type { DeactivationReason } from './src/services/mobileBusinessLogic'
import type { BusinessResult } from './src/services/businessSearchLogic'
import { syncPending } from './src/services/sync'
import { colors } from './src/theme'

type Fase =
  | 'cargando'
  | 'primer'
  | 'segundo'
  | 'principal'
  | 'registrarMapa'
  | 'registrarFormulario'
  | 'verNegocio'
  | 'darDeBaja'

export default function App() {
  const [fase, setFase] = useState<Fase>('cargando')
  const [ingreso, setIngreso] = useState<Ingreso | null>(null)
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessResult | null>(null)
  const [negocioExistente, setNegocioExistente] = useState(false)
  const [coordsRegistro, setCoordsRegistro] = useState<GeoPoint | null>(null)
  const [negocio, setNegocio] = useState<Negocio | null>(null)

  useEffect(() => {
    initLocalDatabase()
    const ing = obtenerIngreso()
    setIngreso(ing)
    setNegocioExistente(obtenerNegocioLocal() !== null)
    setFase(ing ? 'segundo' : 'primer')
    if (ing) {
      void syncPending()
    }
  }, [])

  function handlePrimerAccesoCompletado(nombre: string, rangoEdad: string) {
    guardarIngreso(nombre, rangoEdad)
    setIngreso(obtenerIngreso())
    setFase('segundo')
  }

  function handleContinuar() {
    setFase('principal')
  }

  function handleRegistrarTelefono() {
    setFase('registrarMapa')
  }

  function handleVerNegocio() {
    setNegocio(obtenerNegocioLocal())
    setFase('verNegocio')
  }

  function handleNegocioActualizado() {
    setNegocio(obtenerNegocioLocal())
    setNegocioExistente(obtenerNegocioLocal() !== null)
    setFase('segundo')
  }

  function handleDarDeBaja() {
    setFase('darDeBaja')
  }

  async function handleBajaEnviada(reason: DeactivationReason, comment: string) {
    if (!negocio) return
    prepararBajaPendiente(negocio.id, reason, comment)
    await syncPending()
    setNegocio(obtenerNegocioLocal())
    setNegocioExistente(obtenerNegocioLocal() !== null)
    setFase('segundo')
  }

  function handleGestionarContenido() {
    Alert.alert('Fotos/Videos/Skills', 'Fotos/Videos/Skills — pendiente (T6)')
  }

  function handleIniciarRegistro(coords: GeoPoint) {
    setCoordsRegistro(coords)
    setFase('registrarFormulario')
  }

  function handleNegocioGuardado() {
    setNegocioExistente(obtenerNegocioLocal() !== null)
    setCoordsRegistro(null)
    setFase('segundo')
  }

  function handleCancelarRegistro() {
    setCoordsRegistro(null)
    setFase('segundo')
  }

  if (fase === 'cargando') {
    return (
      <View style={styles.container}>
        <Text>Cargando…</Text>
      </View>
    )
  }

  if (fase === 'primer') {
    return (
      <>
        <FirstAccessScreen onSubmit={handlePrimerAccesoCompletado} />
        <StatusBar style="auto" />
      </>
    )
  }

  if (fase === 'segundo') {
    return (
      <>
        <SecondAccessScreen
          negocioExistente={negocioExistente}
          onContinuar={handleContinuar}
          onRegistrarTelefono={handleRegistrarTelefono}
          onVerNegocio={handleVerNegocio}
        />
        <StatusBar style="auto" />
      </>
    )
  }

  if (fase === 'registrarMapa') {
    return (
      <>
        <RegisterMapScreen onIniciarRegistro={handleIniciarRegistro} onCancel={handleCancelarRegistro} />
        <StatusBar style="auto" />
      </>
    )
  }

  if (fase === 'registrarFormulario' && coordsRegistro) {
    return (
      <>
        <BusinessFormScreen
          nombreUsuario={ingreso?.nombre ?? ''}
          coords={coordsRegistro}
          ownerRemoteId={ingreso?.remoteUserId ?? null}
          onSaved={handleNegocioGuardado}
          onCancel={handleCancelarRegistro}
        />
        <StatusBar style="auto" />
      </>
    )
  }

  if (fase === 'verNegocio' && negocio) {
    return (
      <>
        <BusinessManageScreen
          negocio={negocio}
          onVolver={() => setFase('segundo')}
          onActualizado={handleNegocioActualizado}
          onDarDeBaja={handleDarDeBaja}
          onGestionarContenido={handleGestionarContenido}
        />
        <StatusBar style="auto" />
      </>
    )
  }

  if (fase === 'darDeBaja') {
    return (
      <>
        <DeactivationSurveyScreen onEnviado={handleBajaEnviada} onCancel={() => setFase('verNegocio')} />
        <StatusBar style="auto" />
      </>
    )
  }

  if (selectedBusiness) {
    return (
      <>
        <BusinessDetailScreen business={selectedBusiness} onBack={() => setSelectedBusiness(null)} />
        <StatusBar style="auto" />
      </>
    )
  }

  return (
    <>
      <SearchScreen nombre={ingreso?.nombre ?? ''} onSelectBusiness={setSelectedBusiness} />
      <StatusBar style="auto" />
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    padding: 24,
  },
})
