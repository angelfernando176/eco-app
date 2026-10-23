import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Button } from '../components/Button'
import { TextField } from '../components/TextField'
import { verifyAccount } from '../services/accountAuth'
import { colors, spacing, typography } from '../theme'

export interface VerifyPasswordScreenProps {
  email: string
  onVerified: (userId: string, firstName: string, role: 'none' | 'subscribed' | 'admin', password: string) => void
  onCancel: () => void
}

export function VerifyPasswordScreen({ email, onVerified, onCancel }: VerifyPasswordScreenProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleConfirmar() {
    if (!password) {
      setError('Ingresa tu clave.')
      return
    }
    setError(null)
    setLoading(true)
    const result = await verifyAccount(email, password)
    setLoading(false)
    if (!result.ok) {
      setError('Clave incorrecta.')
      return
    }
    onVerified(result.userId, result.firstName, result.role, password)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Confirmá tu clave</Text>
      <Text style={styles.email}>{email}</Text>
      <TextField
        label="Clave"
        value={password}
        onChangeText={setPassword}
        placeholder="Clave"
        secureTextEntry
        error={error ?? undefined}
        style={styles.field}
      />
      <Button title="Confirmar" onPress={() => void handleConfirmar()} loading={loading} style={styles.button} />
      <Button title="Cancelar" variant="ghost" onPress={onCancel} style={styles.button} />
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
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold as '700',
    color: colors.brand[700],
    marginBottom: spacing[2],
  },
  email: {
    fontSize: typography.size.base,
    color: colors.gray[700],
    marginBottom: spacing[4],
  },
  field: {
    alignSelf: 'stretch',
  },
  button: {
    marginTop: spacing[3],
  },
})
