import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, spacing, typography } from '../theme'

const STAR_VALUES = [1, 2, 3, 4, 5] as const

export interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  size?: number
}

/** Read-only when `onChange` is omitted; otherwise an accessible 1-5 selector. */
export function StarRating({ value, onChange, size = 24 }: StarRatingProps) {
  return (
    <View style={styles.row} accessibilityRole={onChange ? 'adjustable' : undefined}>
      {STAR_VALUES.map((star) => {
        const filled = star <= Math.round(value)
        const label = `${star} ${star === 1 ? 'estrella' : 'estrellas'}`
        if (!onChange) {
          return (
            <Text key={star} style={[styles.star, { fontSize: size }, filled ? styles.filled : styles.empty]}>
              {filled ? '★' : '☆'}
            </Text>
          )
        }
        return (
          <Pressable
            key={star}
            onPress={() => onChange(star)}
            style={styles.touchTarget}
            accessibilityRole="button"
            accessibilityLabel={label}
          >
            <Text style={[styles.star, { fontSize: size }, filled ? styles.filled : styles.empty]}>
              {filled ? '★' : '☆'}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const MIN_TOUCH_TARGET = 44

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing[1],
  },
  touchTarget: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: {
    fontWeight: typography.weight.bold as '700',
  },
  filled: {
    color: colors.brand[600],
  },
  empty: {
    color: colors.gray[300],
  },
})
