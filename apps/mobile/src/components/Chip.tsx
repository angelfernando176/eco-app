import { Pressable, StyleSheet, Text } from 'react-native'
import { colors, radius, spacing, typography } from '../theme'

export interface ChipProps {
  label: string
  selected?: boolean
  onPress: () => void
}

export function Chip({ label, selected = false, onPress }: ChipProps) {
  return (
    <Pressable style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  chipSelected: {
    backgroundColor: colors.brand[600],
    borderColor: colors.brand[600],
  },
  text: {
    fontSize: typography.size.sm,
    color: colors.gray[700],
  },
  textSelected: {
    color: colors.white,
    fontWeight: typography.weight.semibold as '600',
  },
})
