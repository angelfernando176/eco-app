import { Pressable, StyleSheet, Text } from 'react-native'
import { Card } from './Card'
import { colors, spacing, typography } from '../theme'

export interface ListRowProps {
  label: string
  index?: number
  onDelete?: () => void
  deleting?: boolean
}

export function ListRow({ label, index, onDelete, deleting }: ListRowProps) {
  const text = index !== undefined ? `${index + 1}. ${label}` : label

  return (
    <Card style={styles.row}>
      <Text style={styles.rowLabel} numberOfLines={1}>
        {text}
      </Text>
      {onDelete ? (
        <Pressable onPress={onDelete} disabled={deleting} style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>{deleting ? '…' : '✕'}</Text>
        </Pressable>
      ) : null}
    </Card>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  rowLabel: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.gray[900],
  },
  deleteButton: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  deleteButtonText: {
    fontSize: typography.size.base,
    color: colors.danger[600],
    fontWeight: typography.weight.semibold as '600',
  },
})
