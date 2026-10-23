import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import {
  actualizarRol,
  guardarCredenciales,
  guardarIngreso,
  limpiarPassword,
  marcarIngresoSincronizado,
  obtenerIngreso,
  type Ingreso,
} from './src/db/ingreso'
import { initLocalDatabase } from './src/db/database'
import { obtenerNegocioLocal } from './src/db/negocio'
import { AppHeader } from './src/components/AppHeader'
import { BusinessAccessDetailScreen } from './src/screens/BusinessAccessDetailScreen'
import { BusinessAccessListScreen } from './src/screens/BusinessAccessListScreen'
import { BusinessDetailScreen } from './src/screens/BusinessDetailScreen'
import { BusinessFormScreen } from './src/screens/BusinessFormScreen'
import { FirstAccessScreen } from './src/screens/FirstAccessScreen'
import { RegisterMapScreen } from './src/screens/RegisterMapScreen'
import { SecondAccessScreen } from './src/screens/SecondAccessScreen'
import { SearchScreen } from './src/screens/SearchScreen'
import { VerifyPasswordScreen } from './src/screens/VerifyPasswordScreen'
import { signInAsAdmin, signOutAdmin } from './src/services/adminAuth'
import { verifyAccount } from './src/services/accountAuth'
import type { GeoPoint } from './src/services/geo'
import type { BusinessResult } from './src/services/businessSearchLogic'
import { syncPending } from './src/services/sync'
import { colors } from './src/theme'

type Rol = 'none' | 'subscribed' | 'admin'

type Fase =
  | 'cargando'
  | 'primer'
  | 'segundo'
  | 'principal'
  | 'registrarMapa'
  | 'registrarFormulario'
  | 'verificandoAcceso'
  | 'verificarClave'
  | 'listaNegocios'
  | 'detalleNegocio'

export default function App() {
  const [fase, setFase] = useState<Fase>('cargando')
  const [ingreso, setIngreso] = useState<Ingreso | null>(null)
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessResult | null>(null)
  const [negocioExistente, setNegocioExistente] = useState(false)
  const [coordsRegistro, setCoordsRegistro] = useState<GeoPoint | null>(null)
  const [accesoNegocios, setAccesoNegocios] = useState<{ ownerId: string; role: Rol } | null>(null)
  const [negocioAccesoId, setNegocioAccesoId] = useState<string | null>(null)

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

  function handlePrimerAccesoCompletado(
    nombre: string,
    rangoEdad: string,
    email: string,
    password: string,
    remoteUserId: string,
    role: Rol
  ) {
    guardarIngreso(nombre, rangoEdad)
    const nuevoIngreso = obtenerIngreso()
    if (nuevoIngreso) {
      guardarCredenciales(nuevoIngreso.id, email, password)
      actualizarRol(nuevoIngreso.id, role)
      marcarIngresoSincronizado(nuevoIngreso.id, remoteUserId)
    }
    setIngreso(obtenerIngreso())
    setFase('segundo')
  }

  function handleContinuar() {
    setFase('principal')
  }

  function handleRegistrarTelefono() {
    setFase('registrarMapa')
  }

  /** Resuelve el rol real (admin exige además una sesión de Auth real para las políticas RLS). */
  async function completarAccesoNegocios(userId: string, role: Rol, email: string, password: string) {
    if (ingreso) {
      guardarCredenciales(ingreso.id, email, password)
      actualizarRol(ingreso.id, role)
      setIngreso(obtenerIngreso())
    }

    let rolFinal = role
    if (rolFinal === 'admin') {
      const adminResult = await signInAsAdmin(email, password)
      if (!adminResult.ok) rolFinal = 'subscribed'
    }

    setAccesoNegocios({ ownerId: userId, role: rolFinal })
    setFase('listaNegocios')
  }

  async function handleVerNegocio() {
    if (ingreso?.email && ingreso.password) {
      setFase('verificandoAcceso')
      const result = await verifyAccount(ingreso.email, ingreso.password)
      if (result.ok) {
        await completarAccesoNegocios(result.userId, result.role, ingreso.email, ingreso.password)
      } else {
        limpiarPassword(ingreso.id)
        setIngreso(obtenerIngreso())
        setFase('verificarClave')
      }
      return
    }
    setFase('verificarClave')
  }

  function handleClaveVerificada(userId: string, _firstName: string, role: Rol, password: string) {
    void completarAccesoNegocios(userId, role, ingreso?.email ?? '', password)
  }

  async function handleSalirDeNegocios() {
    if (accesoNegocios?.role === 'admin') {
      await signOutAdmin()
    }
    setAccesoNegocios(null)
    setNegocioAccesoId(null)
    setFase('segundo')
  }

  function handleCerrarSesion() {
    if (!ingreso) return
    limpiarPassword(ingreso.id)
    setIngreso(obtenerIngreso())
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

  if (fase === 'cargando' || fase === 'verificandoAcceso') {
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
        <AppHeader mode="home" onAction={() => {}} onLogout={handleCerrarSesion} />
        <SecondAccessScreen
          nombre={ingreso?.nombre ?? ''}
          negocioExistente={negocioExistente}
          onContinuar={handleContinuar}
          onRegistrarTelefono={handleRegistrarTelefono}
          onVerNegocio={handleVerNegocio}
        />
        <StatusBar style="auto" />
      </>
    )
  }

  if (fase === 'verificarClave') {
    return (
      <>
        <AppHeader mode="back" onAction={() => setFase('segundo')} />
        <VerifyPasswordScreen
          email={ingreso?.email ?? ''}
          onVerified={handleClaveVerificada}
          onCancel={() => setFase('segundo')}
        />
        <StatusBar style="auto" />
      </>
    )
  }

  if (fase === 'listaNegocios' && accesoNegocios) {
    return (
      <>
        <AppHeader mode="back" onAction={() => void handleSalirDeNegocios()} />
        <BusinessAccessListScreen
          role={accesoNegocios.role}
          ownerId={accesoNegocios.ownerId}
          onSelect={(id) => {
            setNegocioAccesoId(id)
            setFase('detalleNegocio')
          }}
        />
        <StatusBar style="auto" />
      </>
    )
  }

  if (fase === 'detalleNegocio' && accesoNegocios && negocioAccesoId) {
    return (
      <>
        <AppHeader mode="back" onAction={() => setFase('listaNegocios')} />
        <BusinessAccessDetailScreen businessId={negocioAccesoId} role={accesoNegocios.role} />
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
