import { useEffect, useState } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'
import { Card } from '../../components/Card'
import { SectionState } from '../../components/SectionState'
import { fetchVideos } from '../../services/businessDetail'
import type { Video } from '../../services/businessDetailLogic'
import { colors, radius, spacing, typography } from '../../theme'

export interface VideosTabProps {
  businessId: string
  active: boolean
}

type Status = 'loading' | 'loaded' | 'empty' | 'error'

export function VideosTab({ businessId, active }: VideosTabProps) {
  const [status, setStatus] = useState<Status>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [videos, setVideos] = useState<Video[]>([])

  async function load() {
    setStatus('loading')
    setErrorMessage(null)
    try {
      const found = await fetchVideos(businessId)
      setVideos(found)
      setStatus(found.length > 0 ? 'loaded' : 'empty')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'No se pudieron cargar los videos.')
    }
  }

  useEffect(() => {
    void load()
  }, [businessId])

  if (status !== 'loaded') {
    return (
      <View style={styles.container}>
        <SectionState
          loading={status === 'loading'}
          errorMessage={status === 'error' ? errorMessage : null}
          onRetry={load}
          emptyMessage={status === 'empty' ? 'Este negocio aún no tiene videos.' : null}
        />
      </View>
    )
  }

  return (
    <FlatList
      data={videos}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => <VideoCard video={item} active={active} />}
    />
  )
}

interface VideoCardProps {
  video: Video
  active: boolean
}

function VideoCard({ video, active }: VideoCardProps) {
  const player = useVideoPlayer(video.url, (p) => {
    p.loop = false
  })

  useEffect(() => {
    if (!active) {
      player.pause()
    }
  }, [active, player])

  return (
    <Card style={styles.card}>
      <VideoView style={styles.video} player={player} nativeControls allowsFullscreen />
      {video.productName ? <Text style={styles.productName}>{video.productName}</Text> : null}
    </Card>
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
  card: {
    gap: spacing[2],
  },
  video: {
    width: '100%',
    height: 200,
    borderRadius: radius.md,
    backgroundColor: colors.gray[200],
  },
  productName: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium as '500',
    color: colors.gray[700],
  },
})
