import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing, typography } from '../theme'

export interface HelpTooltipProps {
  message: string
}

/** A small "ⓘ" affordance that toggles an inline hint below it when pressed. */
export function HelpTooltip({ message }: HelpTooltipProps) {
  const [visible, setVisible] = useState(false)

  return (
    <View>
      <Pressable
        onPress={() => setVisible((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel="Ayuda"
        style={styles.icon}
      >
        <Text style={styles.iconText}>ⓘ</Text>
      </Pressable>
      {visible ? (
        <View style={styles.hint}>
          <Text style={styles.hintText}>{message}</Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  icon: {
    paddingHorizontal: spacing[1],
    paddingVertical: spacing[1],
  },
  iconText: {
    fontSize: typography.size.base,
    color: colors.brand[600],
    fontWeight: typography.weight.semibold as '600',
  },
  hint: {
    backgroundColor: colors.info.bg,
    borderColor: colors.info.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing[2],
    marginTop: spacing[1],
  },
  hintText: {
    fontSize: typography.size.xs,
    color: colors.info.text,
  },
})
