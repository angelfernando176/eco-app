import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { guardarIngreso, obtenerIngreso, type Ingreso } from './src/db/ingreso'
import { initLocalDatabase } from './src/db/database'
import { obtenerNegocioLocal, prepararBajaPendiente, type Negocio } from './src/db/negocio'
import { AppHeader } from './src/components/AppHeader'
import { AdminLoginScreen } from './src/screens/AdminLoginScreen'
import { BusinessAdminEditScreen } from './src/screens/BusinessAdminEditScreen'
import { BusinessDetailScreen } from './src/screens/BusinessDetailScreen'
import { BusinessFormScreen } from './src/screens/BusinessFormScreen'
import { BusinessListScreen } from './src/screens/BusinessListScreen'
import { BusinessManageScreen } from './src/screens/BusinessManageScreen'
import { DeactivationSurveyScreen } from './src/screens/DeactivationSurveyScreen'
import { FirstAccessScreen } from './src/screens/FirstAccessScreen'
import { MobileContentScreen } from './src/screens/MobileContentScreen'
import { RegisterMapScreen } from './src/screens/RegisterMapScreen'
import { SecondAccessScreen } from './src/screens/SecondAccessScreen'
import { SearchScreen } from './src/screens/SearchScreen'
import { signOutAdmin } from './src/services/adminAuth'
import type { AdminBusinessSummary } from './src/services/adminBusinessApi'
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
  | 'gestionarContenido'
  | 'adminLogin'
  | 'adminLista'
  | 'adminEditar'

export default function App() {
  const [fase, setFase] = useState<Fase>('cargando')
  const [ingreso, setIngreso] = useState<Ingreso | null>(null)
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessResult | null>(null)
  const [negocioExistente, setNegocioExistente] = useState(false)
  const [coordsRegistro, setCoordsRegistro] = useState<GeoPoint | null>(null)
  const [negocio, setNegocio] = useState<Negocio | null>(null)
  const [adminBusinessSeleccionado, setAdminBusinessSeleccionado] = useState<AdminBusinessSummary | null>(null)

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
    setFase('gestionarContenido')
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
        <AppHeader mode="home" onAction={() => {}} />
        <SecondAccessScreen
          negocioExistente={negocioExistente}
          onContinuar={handleContinuar}
          onRegistrarTelefono={handleRegistrarTelefono}
          onVerNegocio={handleVerNegocio}
          onVerNegociosAdmin={() => setFase('adminLogin')}
        />
        <StatusBar style="auto" />
      </>
    )
  }

  if (fase === 'adminLogin') {
    return (
      <>
        <AppHeader mode="back" onAction={() => setFase('segundo')} />
        <AdminLoginScreen onSuccess={() => setFase('adminLista')} onCancel={() => setFase('segundo')} />
        <StatusBar style="auto" />
      </>
    )
  }

  if (fase === 'adminLista') {
    return (
      <>
        <AppHeader
          mode="back"
          onAction={() => {
            // persistSession:false keeps the admin session in memory only; end it explicitly on leaving the admin area.
            void signOutAdmin()
            setFase('segundo')
          }}
        />
        <BusinessListScreen
          onSelect={(b) => {
            setAdminBusinessSeleccionado(b)
            setFase('adminEditar')
          }}
        />
        <StatusBar style="auto" />
      </>
    )
  }

  if (fase === 'adminEditar' && adminBusinessSeleccionado) {
    return (
      <>
        <AppHeader mode="back" onAction={() => setFase('adminLista')} />
        <BusinessAdminEditScreen businessId={adminBusinessSeleccionado.id} onSaved={() => setFase('adminLista')} />
        <StatusBar style="auto" />
      </>
    )
  }

  if (fase === 'registrarMapa') {
    return (
      <>
        <AppHeader mode="back" onAction={handleCancelarRegistro} />
        <RegisterMapScreen onIniciarRegistro={handleIniciarRegistro} onCancel={handleCancelarRegistro} />
        <StatusBar style="auto" />
      </>
    )
  }

  if (fase === 'registrarFormulario' && coordsRegistro) {
    return (
      <>
        <AppHeader mode="back" onAction={handleCancelarRegistro} />
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
        <AppHeader mode="back" onAction={() => setFase('segundo')} />
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

  if (fase === 'gestionarContenido' && negocio) {
    return (
      <>
        <AppHeader mode="back" onAction={() => setFase('verNegocio')} />
        <MobileContentScreen negocio={negocio} onVolver={() => setFase('verNegocio')} />
        <StatusBar style="auto" />
      </>
    )
  }

  if (fase === 'darDeBaja') {
    return (
      <>
        <AppHeader mode="back" onAction={() => setFase('verNegocio')} />
        <DeactivationSurveyScreen onEnviado={handleBajaEnviada} onCancel={() => setFase('verNegocio')} />
        <StatusBar style="auto" />
      </>
    )
  }

  if (selectedBusiness) {
    return (
      <>
        <AppHeader mode="back" onAction={() => setSelectedBusiness(null)} />
        <BusinessDetailScreen business={selectedBusiness} onBack={() => setSelectedBusiness(null)} />
        <StatusBar style="auto" />
      </>
    )
  }

  return (
    <>
      <AppHeader mode="back" onAction={() => setFase('segundo')} />
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
