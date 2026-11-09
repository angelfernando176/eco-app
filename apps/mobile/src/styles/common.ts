import { StyleSheet } from 'react-native'
import { colors, spacing, typography } from '../theme'

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold as '700',
    color: colors.brand[700],
    marginBottom: spacing[2],
  },
  cancelText: {
    fontSize: typography.size.base,
    color: colors.brand[700],
    fontWeight: typography.weight.medium as '500',
  },
  content: {
    padding: spacing[6],
    gap: spacing[3],
  },
})
