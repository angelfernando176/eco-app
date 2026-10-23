import { useRef } from 'react'
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing, typography } from '../theme'

const STEP_PX = 18

function wrap(value: number, min: number, max: number): number {
  const span = max - min + 1
  return (((value - min) % span) + span) % span + min
}

interface NumberStepperProps {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}

function NumberStepper({ value, min, max, onChange }: NumberStepperProps) {
  const startValue = useRef(value)
  const lastApplied = useRef(value)

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startValue.current = value
        lastApplied.current = value
      },
      onPanResponderMove: (_event, gestureState) => {
        const steps = Math.round(-gestureState.dy / STEP_PX)
        const next = wrap(startValue.current + steps, min, max)
        if (next !== lastApplied.current) {
          lastApplied.current = next
          onChange(next)
        }
      },
    }),
  ).current

  return (
    <View style={styles.stepper}>
      <Pressable onPress={() => onChange(wrap(value + 1, min, max))} style={styles.chevron} hitSlop={8}>
        <Text style={styles.chevronText}>▲</Text>
      </Pressable>
      <View style={styles.valueBox} {...panResponder.panHandlers}>
        <Text style={styles.valueText}>{String(value).padStart(2, '0')}</Text>
      </View>
      <Pressable onPress={() => onChange(wrap(value - 1, min, max))} style={styles.chevron} hitSlop={8}>
        <Text style={styles.chevronText}>▼</Text>
      </Pressable>
    </View>
  )
}

export interface TimeStepperFieldProps {
  hour: number
  minute: number
  onChangeHour: (hour: number) => void
  onChangeMinute: (minute: number) => void
  error?: string
}

export function TimeStepperField({ hour, minute, onChangeHour, onChangeMinute, error }: TimeStepperFieldProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <NumberStepper value={hour} min={0} max={23} onChange={onChangeHour} />
        <Text style={styles.separator}>:</Text>
        <NumberStepper value={minute} min={0} max={59} onChange={onChangeMinute} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  stepper: {
    alignItems: 'center',
    gap: spacing[1],
  },
  chevron: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  chevronText: {
    fontSize: typography.size.sm,
    color: colors.brand[600],
  },
  valueBox: {
    width: 64,
    paddingVertical: spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: radius.md,
  },
  valueText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold as '600',
    color: colors.gray[900],
  },
  separator: {
    fontSize: typography.size.lg,
    color: colors.gray[700],
    marginTop: spacing[4],
  },
  error: {
    marginTop: spacing[1],
    fontSize: typography.size.xs,
    color: colors.danger[600],
  },
})
