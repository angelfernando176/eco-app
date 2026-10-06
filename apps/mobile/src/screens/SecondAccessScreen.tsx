import { useState } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'
import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import { ecoWebUrl } from '../config'
import { syncPending } from '../services/sync'
import { colors, spacing, typography } from '../theme'

export interface SecondAccessScreenProps {
  onContinuar: () => void
}

export function SecondAccessScreen({ onContinuar }: SecondAccessScreenProps) {
  const [sincronizando, setSincronizando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  function handleRegistrar() {
    void Linking.openURL(ecoWebUrl)
  }

  async function handleContinuar() {
    setSincronizando(true)
    setAviso(null)
    const resultado = await syncPending()
    setSincronizando(false)
    if (resultado.error) {
      setAviso(`${resultado.error} Se reintentará más adelante.`)
    }
    onContinuar()
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ECO</Text>
      <Text style={styles.welcome}>
        Bienvenido a ECO. Si quieres registrar tu negocio debes dar clic en Registrar.
      </Text>
      {aviso ? <Banner variant="error" message={aviso} /> : null}
      <Button title="Registrar" onPress={handleRegistrar} style={styles.button} />
      <Button
        title="Continuar"
        variant="secondary"
        onPress={handleContinuar}
        loading={sincronizando}
        style={styles.button}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    padding: spacing[6],
  },
  title: {
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.bold as '700',
    color: colors.brand[700],
    marginBottom: spacing[4],
  },
  welcome: {
    fontSize: typography.size.base,
    color: colors.gray[700],
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  button: {
    marginTop: spacing[4],
  },
})
