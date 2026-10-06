import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Banner } from './Banner'
import { Button } from './Button'
import { colors, spacing } from '../theme'

export interface SectionStateProps {
  loading?: boolean
  errorMessage?: string | null
  onRetry?: () => void
  emptyMessage?: string | null
}

/** Shared loading / error-with-retry / empty states for a detail tab section. */
export function SectionState({ loading, errorMessage, onRetry, emptyMessage }: SectionStateProps) {
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand[600]} />
      </View>
    )
  }

  if (errorMessage) {
    return (
      <View style={styles.block}>
        <Banner variant="error" message={errorMessage} />
        {onRetry ? <Button title="Reintentar" variant="ghost" onPress={onRetry} /> : null}
      </View>
    )
  }

  if (emptyMessage) {
    return (
      <View style={styles.block}>
        <Banner variant="info" message={emptyMessage} />
      </View>
    )
  }

  return null
}

const styles = StyleSheet.create({
  center: {
    paddingVertical: spacing[8],
    alignItems: 'center',
  },
  block: {
    gap: spacing[2],
    padding: spacing[4],
  },
})
