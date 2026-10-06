import { useEffect, useState } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { Card } from '../../components/Card'
import { SectionState } from '../../components/SectionState'
import { StarRating } from '../../components/StarRating'
import { Button } from '../../components/Button'
import { listarCalificacionesPorNegocioLocal, type Calificacion } from '../../db/calificaciones'
import { fetchRatingSummary, fetchRatings, RATINGS_PAGE_SIZE } from '../../services/businessDetail'
import { formatDate, starsLabel, type Rating, type RatingSummary } from '../../services/businessDetailLogic'
import { colors, radius, spacing, typography } from '../../theme'

export interface RankingTabProps {
  businessId: string
  refreshToken?: number
}

type Status = 'loading' | 'loaded' | 'error'

export function RankingTab({ businessId, refreshToken }: RankingTabProps) {
  const [status, setStatus] = useState<Status>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [summary, setSummary] = useState<RatingSummary | null>(null)
  const [ratings, setRatings] = useState<Rating[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [pending, setPending] = useState<Calificacion[]>([])

  async function load() {
    setStatus('loading')
    setErrorMessage(null)
    try {
      const [fetchedSummary, fetchedRatings] = await Promise.all([
        fetchRatingSummary(businessId),
        fetchRatings({ businessId, page: 0 }),
      ])
      setSummary(fetchedSummary)
      setRatings(fetchedRatings)
      setPage(0)
      setHasMore(fetchedRatings.length === RATINGS_PAGE_SIZE)
      setPending(listarCalificacionesPorNegocioLocal(businessId).filter((item) => !item.syncedAt))
      setStatus('loaded')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'No se pudieron cargar las calificaciones.')
    }
  }

  useEffect(() => {
    void load()
  }, [businessId, refreshToken])

  async function handleLoadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const more = await fetchRatings({ businessId, page: nextPage })
      setRatings((prev) => [...prev, ...more])
      setPage(nextPage)
      setHasMore(more.length === RATINGS_PAGE_SIZE)
    } catch {
      setHasMore(false)
    } finally {
      setLoadingMore(false)
    }
  }

  if (status === 'loading' || status === 'error') {
    return (
      <View style={styles.container}>
        <SectionState loading={status === 'loading'} errorMessage={status === 'error' ? errorMessage : null} onRetry={load} />
      </View>
    )
  }

  return (
    <FlatList
      data={ratings}
      keyExtractor={(_, index) => String(index)}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.header}>
          {summary ? (
            <View style={styles.summaryRow}>
              <StarRating value={summary.average} />
              <Text style={styles.summaryText}>
                {starsLabel(summary.average)} · {summary.total} {summary.total === 1 ? 'calificación' : 'calificaciones'}
              </Text>
            </View>
          ) : null}

          {pending.length > 0 ? (
            <View style={styles.pendingBlock}>
              <Text style={styles.pendingTitle}>Pendiente de envío</Text>
              {pending.map((item) => (
                <Card key={item.id} style={styles.card}>
                  <StarRating value={item.rating} />
                  {item.comentario ? <Text style={styles.comment}>{item.comentario}</Text> : null}
                </Card>
              ))}
            </View>
          ) : null}

          {ratings.length === 0 && pending.length === 0 ? (
            <SectionState emptyMessage="Este negocio aún no tiene calificaciones." />
          ) : null}
        </View>
      }
      renderItem={({ item }) => (
        <Card style={styles.card}>
          <StarRating value={item.rating} />
          {item.comment ? <Text style={styles.comment}>{item.comment}</Text> : null}
          <Text style={styles.meta}>
            {item.reviewerName} · {formatDate(item.createdAt)}
          </Text>
        </Card>
      )}
      ListFooterComponent={
        hasMore ? (
          <Button title="Cargar más" variant="ghost" onPress={handleLoadMore} loading={loadingMore} style={styles.loadMore} />
        ) : null
      }
    />
  )
}

const styles = StyleSheet.create({
  container: {
    padding: spacing[4],
  },
  list: {
    padding: spacing[4],
    gap: spacing[3],
  },
  header: {
    gap: spacing[3],
    marginBottom: spacing[2],
  },
  summaryRow: {
    gap: spacing[1],
  },
  summaryText: {
    fontSize: typography.size.sm,
    color: colors.gray[600],
  },
  pendingBlock: {
    gap: spacing[2],
  },
  pendingTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold as '600',
    color: colors.danger[600],
  },
  card: {
    gap: spacing[1],
    marginBottom: spacing[2],
    borderRadius: radius.md,
  },
  comment: {
    fontSize: typography.size.base,
    color: colors.gray[800],
  },
  meta: {
    fontSize: typography.size.xs,
    color: colors.gray[500],
  },
  loadMore: {
    marginTop: spacing[2],
  },
})
