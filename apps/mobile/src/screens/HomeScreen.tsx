import { StyleSheet, Text, View } from 'react-native'
import { colors, spacing, typography } from '../theme'

export interface HomeScreenProps {
  nombre: string
}

export function HomeScreen({ nombre }: HomeScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ECO</Text>
      <Text style={styles.subtitle}>
        Hola{nombre ? `, ${nombre}` : ''}. La búsqueda de negocios llega en una próxima entrega.
      </Text>
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
  subtitle: {
    fontSize: typography.size.base,
    color: colors.gray[700],
    textAlign: 'center',
  },
})
