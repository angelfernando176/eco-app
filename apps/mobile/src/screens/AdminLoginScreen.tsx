import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import { TextField } from '../components/TextField'
import { signInAsAdmin } from '../services/adminAuth'
import { colors, spacing, typography } from '../theme'

export interface AdminLoginScreenProps {
  onSuccess: () => void
  onCancel: () => void
}

export function AdminLoginScreen({ onSuccess, onCancel }: AdminLoginScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleIngresar() {
    setLoading(true)
    setError(null)
    const resultado = await signInAsAdmin(email.trim(), password)
    setLoading(false)
    if (!resultado.ok) {
      setError(resultado.message)
      return
    }
    onSuccess()
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Acceso administrador</Text>

      {error ? <Banner variant="error" message={error} /> : null}

      <TextField
        label="Correo"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextField
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button title="Ingresar" onPress={handleIngresar} loading={loading} />
      <Button title="Cancelar" variant="ghost" onPress={onCancel} />
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
    gap: spacing[3],
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold as '700',
    color: colors.gray[900],
  },
})
