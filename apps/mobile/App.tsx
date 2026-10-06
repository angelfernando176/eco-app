import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { guardarIngreso, obtenerIngreso, type Ingreso } from './src/db/ingreso'
import { initLocalDatabase } from './src/db/database'
import { FirstAccessScreen } from './src/screens/FirstAccessScreen'
import { SecondAccessScreen } from './src/screens/SecondAccessScreen'
import { SearchScreen } from './src/screens/SearchScreen'
import type { BusinessResult } from './src/services/businessSearchLogic'
import { syncPending } from './src/services/sync'
import { colors, spacing, typography } from './src/theme'

type Fase = 'cargando' | 'primer' | 'segundo' | 'principal'

export default function App() {
  const [fase, setFase] = useState<Fase>('cargando')
  const [ingreso, setIngreso] = useState<Ingreso | null>(null)
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessResult | null>(null)

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

  if (selectedBusiness) {
    return (
      <>
        <BusinessDetailPlaceholder business={selectedBusiness} onBack={() => setSelectedBusiness(null)} />
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

interface BusinessDetailPlaceholderProps {
  business: BusinessResult
  onBack: () => void
}

/** Minimal seam for the next task (the real detail sheet: map, videos, ranking, menu, contact, rate). */
function BusinessDetailPlaceholder({ business, onBack }: BusinessDetailPlaceholderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.detailTitle}>{business.tradeName}</Text>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>Volver</Text>
      </Pressable>
    </View>
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
  detailTitle: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold as '700',
    color: colors.brand[700],
    marginBottom: spacing[6],
  },
  backButton: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
  },
  backButtonText: {
    fontSize: typography.size.base,
    color: colors.brand[600],
    fontWeight: typography.weight.semibold as '600',
  },
})
