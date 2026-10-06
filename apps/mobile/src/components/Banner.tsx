import { StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing, typography } from '../theme'

export type BannerVariant = 'info' | 'error'

export interface BannerProps {
  variant: BannerVariant
  message: string
}

export function Banner({ variant, message }: BannerProps) {
  return (
    <View style={[styles.base, variant === 'info' ? styles.info : styles.error]}>
      <Text style={[styles.text, variant === 'info' ? styles.textInfo : styles.textError]}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'stretch',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing[3],
  },
  info: {
    backgroundColor: colors.info.bg,
    borderColor: colors.info.border,
  },
  error: {
    backgroundColor: colors.danger[50],
    borderColor: colors.danger[200],
  },
  text: {
    fontSize: typography.size.sm,
  },
  textInfo: {
    color: colors.info.text,
  },
  textError: {
    color: colors.danger[700],
  },
})
