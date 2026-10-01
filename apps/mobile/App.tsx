import { useEffect, useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { guardarIngreso, initLocalDatabase, obtenerIngreso, type Ingreso } from './src/db/database'

const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+']

// TODO: reemplazar por la URL de producción de la app web/escritorio.
const ECO_WEB_URL = 'http://localhost:5173'

type Fase = 'cargando' | 'primer' | 'segundo' | 'principal'

export default function App() {
  const [fase, setFase] = useState<Fase>('cargando')
  const [nombre, setNombre] = useState('')
  const [rangoEdad, setRangoEdad] = useState(AGE_RANGES[0])
  const [ingreso, setIngreso] = useState<Ingreso | null>(null)

  useEffect(() => {
    initLocalDatabase()
    const ing = obtenerIngreso()
    setIngreso(ing)
    setFase(ing ? 'segundo' : 'primer')
  }, [])

  function handleGuardar() {
    const nombreLimpio = nombre.trim()
    if (!nombreLimpio) return
    guardarIngreso(nombreLimpio, rangoEdad)
    setIngreso({ nombre: nombreLimpio, rangoEdad })
    setFase('segundo')
  }

  function handleContinuar() {
    // TODO: sincronizar la información local (ingreso) con Supabase — feature posterior.
    setFase('principal')
  }

  function handleRegistrar() {
    void Linking.openURL(ECO_WEB_URL)
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
      <View style={styles.container}>
        <Text style={styles.title}>ECO</Text>
        <Text style={styles.label}>Nombre</Text>
        <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholder="Tu nombre" />
        <Text style={styles.label}>Rango de edad</Text>
        <View style={styles.chips}>
          {AGE_RANGES.map((r) => (
            <Pressable
              key={r}
              style={[styles.chip, rangoEdad === r && styles.chipSelected]}
              onPress={() => setRangoEdad(r)}
            >
              <Text style={rangoEdad === r ? styles.chipTextSelected : styles.chipText}>{r}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.button} onPress={handleGuardar}>
          <Text style={styles.buttonText}>Continuar</Text>
        </Pressable>
        <StatusBar style="auto" />
      </View>
    )
  }

  if (fase === 'segundo') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>ECO</Text>
        <Text style={styles.welcome}>
          Bienvenido a ECO. Si quieres registrar tu negocio debes dar clic en Registrar.
        </Text>
        <Pressable style={styles.button} onPress={handleRegistrar}>
          <Text style={styles.buttonText}>Registrar</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.buttonSecondary]} onPress={handleContinuar}>
          <Text style={styles.buttonText}>Continuar</Text>
        </Pressable>
        <StatusBar style="auto" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ECO</Text>
      <Text style={styles.subtitle}>
        Hola{ingreso?.nombre ? `, ${ingreso.nombre}` : ''}. La búsqueda de negocios llega en una próxima entrega.
      </Text>
      <StatusBar style="auto" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
  },
  welcome: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
  },
  label: {
    alignSelf: 'flex-start',
    marginTop: 12,
    marginBottom: 4,
    fontSize: 14,
    color: '#333',
  },
  input: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipSelected: {
    backgroundColor: '#111',
    borderColor: '#111',
  },
  chipText: {
    color: '#333',
  },
  chipTextSelected: {
    color: '#fff',
  },
  button: {
    alignSelf: 'stretch',
    backgroundColor: '#111',
    borderRadius: 6,
    paddingVertical: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#555',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
