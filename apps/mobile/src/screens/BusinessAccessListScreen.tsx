import { useEffect, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { SectionState } from '../components/SectionState'
import { TextField } from '../components/TextField'
import { listBusinessesAdmin } from '../services/adminBusinessApi'
import { listOwnerBusinesses, type OwnerBusinessSummary } from '../services/businessAccess'
import { commonStyles } from '../styles/common'
import { colors, spacing, typography } from '../theme'

export interface BusinessAccessListScreenProps {
  role: 'none' | 'subscribed' | 'admin'
  ownerId: string
  onSelect: (businessId: string) => void
  onAgregar?: () => void
}

export function BusinessAccessListScreen({ role, ownerId, onSelect, onAgregar }: BusinessAccessListScreenProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [businesses, setBusinesses] = useState<OwnerBusinessSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (role !== 'admin') return
    const timeoutId = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timeoutId)
  }, [query, role])

  useEffect(() => {
    if (role === 'admin') {
      void loadAdminBusinesses(debouncedQuery)
    } else {
      void loadOwnerBusinesses()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, debouncedQuery, ownerId])

  async function loadAdminBusinesses(currentQuery: string) {
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

  async function loadOwnerBusinesses() {
    setLoading(true)
    setError(null)
    try {
      const results = await listOwnerBusinesses(ownerId)
      setBusinesses(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el listado de negocios.')
    } finally {
      setLoading(false)
    }
  }

  function handleRetry() {
    if (role === 'admin') {
      void loadAdminBusinesses(debouncedQuery)
    } else {
      void loadOwnerBusinesses()
    }
  }

  return (
    <View style={commonStyles.container}>
      <FlatList
        data={!loading && !error ? businesses : []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={[commonStyles.title, styles.titleNoMargin]}>Negocios</Text>
              {onAgregar ? <Button title="Agregar" onPress={onAgregar} /> : null}
            </View>
            {role === 'admin' ? (
              <TextField label="Buscar negocio" value={query} onChangeText={setQuery} placeholder="Nombre del negocio" />
            ) : null}
            {loading ? <SectionState loading /> : null}
            {error ? <SectionState errorMessage={error} onRetry={handleRetry} /> : null}
            {!loading && !error && businesses.length === 0 ? (
              <SectionState emptyMessage="No se encontraron negocios." />
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => onSelect(item.id)}>
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
  listContent: {
    padding: spacing[6],
    gap: spacing[3],
  },
  header: {
    gap: spacing[3],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleNoMargin: {
    marginBottom: 0,
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
