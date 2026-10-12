import { useEffect, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { Card } from '../components/Card'
import { SectionState } from '../components/SectionState'
import { TextField } from '../components/TextField'
import { listBusinessesAdmin, type AdminBusinessSummary } from '../services/adminBusinessApi'
import { colors, spacing, typography } from '../theme'

export interface BusinessListScreenProps {
  onSelect: (business: AdminBusinessSummary) => void
}

export function BusinessListScreen({ onSelect }: BusinessListScreenProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [businesses, setBusinesses] = useState<AdminBusinessSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timeoutId)
  }, [query])

  useEffect(() => {
    void loadBusinesses(debouncedQuery)
  }, [debouncedQuery])

  async function loadBusinesses(currentQuery: string) {
    setLoading(true)
    setError(null)
    try {
      const results = await listBusinessesAdmin(currentQuery)
      setBusinesses(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el listado de negocios.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={!loading && !error ? businesses : []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Negocios</Text>
            <TextField label="Buscar negocio" value={query} onChangeText={setQuery} placeholder="Nombre del negocio" />
            {loading ? <SectionState loading /> : null}
            {error ? <SectionState errorMessage={error} onRetry={() => void loadBusinesses(debouncedQuery)} /> : null}
            {!loading && !error && businesses.length === 0 ? (
              <SectionState emptyMessage="No hay negocios." />
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => onSelect(item)}>
            <Card style={styles.resultCard}>
              <Text style={styles.resultName} numberOfLines={1} ellipsizeMode="tail">
                {item.tradeName}
              </Text>
              <Text style={styles.resultRuc} numberOfLines={1} ellipsizeMode="tail">
                {item.ruc}
              </Text>
            </Card>
          </Pressable>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  listContent: {
    padding: spacing[6],
    gap: spacing[3],
  },
  header: {
    gap: spacing[3],
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold as '700',
    color: colors.brand[700],
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  resultName: {
    flex: 2,
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold as '600',
    color: colors.brand[700],
  },
  resultRuc: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.gray[700],
    textAlign: 'right',
  },
})
