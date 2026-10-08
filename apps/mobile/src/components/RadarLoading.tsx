import { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { colors } from '../theme'

export interface RadarLoadingProps {
  size?: number
  style?: StyleProp<ViewStyle>
}

export function RadarLoading({ size = 120, style }: RadarLoadingProps) {
  const sweep = useRef(new Animated.Value(0)).current
  const pulse = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const sweepAnimation = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    )
    const pulseAnimation = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    )

    sweepAnimation.start()
    pulseAnimation.start()

    return () => {
      sweepAnimation.stop()
      pulseAnimation.stop()
    }
  }, [sweep, pulse])

  const rotate = sweep.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] })
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] })

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Animated.View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale: pulseScale }],
            opacity: pulseOpacity,
          },
        ]}
      />
      <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]} />
      <View style={[styles.circle, { width: size * 0.6, height: size * 0.6, borderRadius: (size * 0.6) / 2 }]} />
      <Animated.View
        style={[
          styles.sweepContainer,
          { width: size, height: size, transform: [{ rotate }] },
        ]}
      >
        <View style={[styles.sweep, { width: size / 2, height: size / 2 }]} />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.brand[400],
  },
  sweepContainer: {
    position: 'absolute',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  sweep: {
    backgroundColor: colors.brand[500],
    opacity: 0.35,
    borderTopRightRadius: 9999,
  },
})
