import { Alert, BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, spacing, typography } from '../theme'

export interface AppHeaderProps {
  mode: 'home' | 'back'
  onAction: () => void
}

export function AppHeader({ mode, onAction }: AppHeaderProps) {
  function handlePress() {
    if (mode === 'home') {
      Alert.alert('¿Seguro que deseas salir?', undefined, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', style: 'destructive', onPress: handleExit },
      ])
      return
    }

    onAction()
  }

  function handleExit() {
    if (Platform.OS === 'android') {
      BackHandler.exitApp()
      return
    }

    Alert.alert('Cierra la app manualmente para salir.')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ECO</Text>
      <Pressable
        onPress={handlePress}
        style={styles.action}
        accessibilityRole="button"
        accessibilityLabel={mode === 'home' ? 'Salir' : 'Volver'}
      >
        <Text style={styles.actionIcon}>{mode === 'home' ? '🚪' : '🏠'}</Text>
        <Text style={styles.actionLabel}>{mode === 'home' ? 'Salir' : 'Volver'}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[10],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    backgroundColor: colors.white,
  },
  title: {
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.bold as '700',
    color: colors.brand[700],
  },
  action: {
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: typography.size.lg,
  },
  actionLabel: {
    fontSize: typography.size.xs,
    color: colors.gray[600],
  },
})
