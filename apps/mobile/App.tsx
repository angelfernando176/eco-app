import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { guardarIngreso, obtenerIngreso, type Ingreso } from './src/db/ingreso'
import { initLocalDatabase } from './src/db/database'
import { FirstAccessScreen } from './src/screens/FirstAccessScreen'
import { SecondAccessScreen } from './src/screens/SecondAccessScreen'
import { HomeScreen } from './src/screens/HomeScreen'
import { syncPending } from './src/services/sync'
import { colors } from './src/theme'

type Fase = 'cargando' | 'primer' | 'segundo' | 'principal'

export default function App() {
  const [fase, setFase] = useState<Fase>('cargando')
  const [ingreso, setIngreso] = useState<Ingreso | null>(null)

  useEffect(() => {
    initLocalDatabase()
    const ing = obtenerIngreso()
    setIngreso(ing)
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
        <SecondAccessScreen onContinuar={handleContinuar} />
        <StatusBar style="auto" />
      </>
    )
  }

  return (
    <>
      <HomeScreen nombre={ingreso?.nombre ?? ''} />
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
