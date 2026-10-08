import { ScrollView, Pressable, StyleSheet, Text } from 'react-native'
import { colors, spacing, typography } from '../theme'

export interface TabBarProps<T extends string> {
  tabs: ReadonlyArray<{ key: T; label: string }>
  activeTab: T
  onSelect: (tab: T) => void
}

export function TabBar<T extends string>({ tabs, activeTab, onSelect }: TabBarProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.bar}
      contentContainerStyle={styles.container}
    >
      {tabs.map((tab) => {
        const selected = tab.key === activeTab
        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            style={[styles.tab, selected && styles.tabSelected]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{tab.label}</Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexGrow: 0,
    flexShrink: 0,
    height: 44,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  tab: {
    paddingHorizontal: spacing[1],
    paddingVertical: spacing[2],
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabSelected: {
    borderBottomColor: colors.brand[600],
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium as '500',
    color: colors.gray[500],
  },
  labelSelected: {
    color: colors.brand[700],
    fontWeight: typography.weight.semibold as '600',
  },
})
