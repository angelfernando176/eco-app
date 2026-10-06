import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { TextField } from '../components/TextField'
import { AGE_RANGES } from '../constants'
import { colors, spacing, typography } from '../theme'

export interface FirstAccessScreenProps {
  onSubmit: (nombre: string, rangoEdad: string) => void
}

export function FirstAccessScreen({ onSubmit }: FirstAccessScreenProps) {
  const [nombre, setNombre] = useState('')
  const [rangoEdad, setRangoEdad] = useState(AGE_RANGES[0])
  const [error, setError] = useState<string | null>(null)

  function handleContinuar() {
    const nombreLimpio = nombre.trim()
    if (nombreLimpio.length < 2 || nombreLimpio.length > 50) {
      setError('El nombre debe tener entre 2 y 50 caracteres.')
      return
    }
    setError(null)
    onSubmit(nombreLimpio, rangoEdad)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ECO</Text>
      <TextField
        label="Nombre"
        value={nombre}
        onChangeText={setNombre}
        placeholder="Tu nombre"
        error={error ?? undefined}
      />
      <Text style={styles.label}>Rango de edad</Text>
      <View style={styles.chips}>
        {AGE_RANGES.map((r) => (
          <Chip key={r} label={r} selected={rangoEdad === r} onPress={() => setRangoEdad(r)} />
        ))}
      </View>
      <Button title="Continuar" onPress={handleContinuar} style={styles.button} />
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
  label: {
    alignSelf: 'flex-start',
    marginTop: spacing[3],
    marginBottom: spacing[1],
    fontSize: typography.size.sm,
    color: colors.gray[700],
    fontWeight: typography.weight.medium as '500',
  },
  chips: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  button: {
    marginTop: spacing[6],
  },
})
