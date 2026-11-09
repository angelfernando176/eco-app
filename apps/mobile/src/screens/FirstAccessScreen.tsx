import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { TextField } from '../components/TextField'
import { AGE_RANGES, GENDERS } from '../constants'
import { getDeviceRegisteredEmail } from '../native/deviceEmail'
import { registerOrLogin } from '../services/accountAuth'
import { commonStyles } from '../styles/common'
import { colors, spacing, typography } from '../theme'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_RE = /^(?=.*[a-zA-Z])(?=.*\d).{6,}$/

export interface FirstAccessScreenProps {
  onSubmit: (
    nombre: string,
    rangoEdad: string,
    email: string,
    password: string,
    gender: 1 | 2 | 3,
    remoteUserId: string,
    role: 'none' | 'subscribed' | 'admin'
  ) => void
}

export function FirstAccessScreen({ onSubmit }: FirstAccessScreenProps) {
  const [nombre, setNombre] = useState('')
  const [rangoEdad, setRangoEdad] = useState(AGE_RANGES[0])
  const [gender, setGender] = useState<1 | 2 | 3 | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const emailTouchedRef = useRef(false)

  useEffect(() => {
    getDeviceRegisteredEmail().then((deviceEmail) => {
      if (deviceEmail && !emailTouchedRef.current) {
        setEmail(deviceEmail)
      }
    })
  }, [])

  async function handleContinuar() {
    const nombreLimpio = nombre.trim()
    if (nombreLimpio.length < 2 || nombreLimpio.length > 50) {
      setError('El nombre debe tener entre 2 y 50 caracteres.')
      return
    }
    if (!gender) {
      setError('Selecciona un género.')
      return
    }
    const emailLimpio = email.trim()
    if (!emailLimpio || !EMAIL_RE.test(emailLimpio)) {
      setError('Ingresa un correo válido.')
      return
    }
    if (!PASSWORD_RE.test(password)) {
      setError('La clave debe tener al menos 6 caracteres, con letras y números.')
      return
    }
    if (confirmPassword !== password) {
      setError('Las claves no coinciden.')
      return
    }
    setError(null)
    setLoading(true)
    const result = await registerOrLogin(nombreLimpio, rangoEdad, emailLimpio, password, gender)
    setLoading(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    onSubmit(nombreLimpio, rangoEdad, emailLimpio, password, gender, result.remoteUserId, result.role)
  }

  return (
    <View style={[commonStyles.container, styles.centered]}>
      <Text style={styles.title}>ECO</Text>
      <TextField label="Nombre" value={nombre} onChangeText={setNombre} placeholder="Tu nombre" />
      <Text style={styles.label}>Rango de edad</Text>
      <View style={styles.chips}>
        {AGE_RANGES.map((r) => (
          <Chip key={r} label={r} selected={rangoEdad === r} onPress={() => setRangoEdad(r)} />
        ))}
      </View>
      <Text style={styles.label}>Género</Text>
      <View style={styles.chips}>
        {GENDERS.map((g) => (
          <Chip key={g.value} label={g.label} selected={gender === g.value} onPress={() => setGender(g.value)} />
        ))}
      </View>
      <TextField
        label="Correo"
        value={email}
        onChangeText={(text) => {
          emailTouchedRef.current = true
          setEmail(text)
        }}
        placeholder="tu@correo.com"
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.field}
      />
      <TextField
        label="Clave"
        value={password}
        onChangeText={setPassword}
        placeholder="Clave"
        secureTextEntry
        style={styles.field}
      />
      <TextField
        label="Confirmar clave"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Confirmar clave"
        secureTextEntry
        error={error ?? undefined}
        style={styles.field}
      />
      <Button title="Continuar" onPress={() => void handleContinuar()} loading={loading} style={styles.button} />
    </View>
  )
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
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
  field: {
    marginTop: spacing[3],
  },
  button: {
    marginTop: spacing[6],
  },
})
