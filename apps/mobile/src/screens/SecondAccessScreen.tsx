import { useState } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'
import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import { ecoWebUrl } from '../config'
import { syncPending } from '../services/sync'
import { colors, spacing, typography } from '../theme'

export interface SecondAccessScreenProps {
  nombre: string
  negocioExistente: boolean
  onContinuar: () => void
  onRegistrarTelefono: () => void
  onVerNegocio: () => void
}

export function SecondAccessScreen({
  nombre,
  negocioExistente,
  onContinuar,
  onRegistrarTelefono,
  onVerNegocio,
}: SecondAccessScreenProps) {
  const [sincronizando, setSincronizando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [expandido, setExpandido] = useState(false)

  function handleRegistrar() {
    setExpandido((v) => !v)
  }

  function handleRegistrarComputadora() {
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
      <Text style={styles.welcome}>Hola {nombre}, bienvenido a ECO.</Text>
      {aviso ? <Banner variant="error" message={aviso} /> : null}

      <View style={styles.row}>
        {negocioExistente ? (
          <Button title="Ver negocio" onPress={onVerNegocio} style={styles.rowButton} />
        ) : (
          <Button title="Registrar" onPress={handleRegistrar} style={styles.rowButton} />
        )}
        <Button
          title="Continuar"
          variant="secondary"
          onPress={handleContinuar}
          loading={sincronizando}
          style={styles.rowButton}
        />
      </View>

      {!negocioExistente && expandido ? (
        <View style={styles.row}>
          <Button
            title="📱 Teléfono"
            variant="ghost"
            onPress={onRegistrarTelefono}
            style={styles.rowButton}
          />
          <Button
            title="🖥️ Computadora"
            variant="ghost"
            onPress={handleRegistrarComputadora}
            style={styles.rowButton}
          />
        </View>
      ) : null}
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
  row: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  rowButton: {
    flex: 1,
  },
})
