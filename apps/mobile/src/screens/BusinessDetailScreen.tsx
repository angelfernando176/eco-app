import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { TabBar } from '../components/TabBar'
import { ContactTab } from './business/ContactTab'
import { MapTab } from './business/MapTab'
import { MenuTab } from './business/MenuTab'
import { RankingTab } from './business/RankingTab'
import { RateTab } from './business/RateTab'
import { VideosTab } from './business/VideosTab'
import type { BusinessResult } from '../services/businessSearchLogic'
import { colors, spacing, typography } from '../theme'

export interface BusinessDetailScreenProps {
  business: BusinessResult
  onBack: () => void
}

type TabKey = 'mapa' | 'videos' | 'ranking' | 'menu' | 'contacto' | 'calificar'

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: 'mapa', label: 'Mapa' },
  { key: 'videos', label: 'Videos' },
  { key: 'ranking', label: 'Ranking' },
  { key: 'menu', label: 'Menú' },
  { key: 'contacto', label: 'Contacto' },
  { key: 'calificar', label: 'Calificar' },
]

export function BusinessDetailScreen({ business, onBack }: BusinessDetailScreenProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('mapa')
  const [visitedTabs, setVisitedTabs] = useState<ReadonlySet<TabKey>>(new Set(['mapa']))
  const [ratingRefreshToken, setRatingRefreshToken] = useState(0)

  function handleSelectTab(tab: TabKey) {
    setActiveTab(tab)
    if (!visitedTabs.has(tab)) {
      setVisitedTabs(new Set([...visitedTabs, tab]))
    }
  }

  function handleRatingSubmitted() {
    setRatingRefreshToken((token) => token + 1)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.businessName} numberOfLines={1}>
        {business.tradeName}
      </Text>

      <TabBar tabs={TABS} activeTab={activeTab} onSelect={handleSelectTab} />

      <View style={styles.content}>
        {visitedTabs.has('mapa') ? (
          <View style={hiddenStyle(activeTab !== 'mapa')}>
            <MapTab business={business} />
          </View>
        ) : null}

        {visitedTabs.has('videos') ? (
          <View style={hiddenStyle(activeTab !== 'videos')}>
            <VideosTab businessId={business.id} active={activeTab === 'videos'} />
          </View>
        ) : null}

        {visitedTabs.has('ranking') ? (
          <View style={hiddenStyle(activeTab !== 'ranking')}>
            <RankingTab businessId={business.id} refreshToken={ratingRefreshToken} />
          </View>
        ) : null}

        {visitedTabs.has('menu') ? (
          <View style={hiddenStyle(activeTab !== 'menu')}>
            <MenuTab businessId={business.id} />
          </View>
        ) : null}

        {visitedTabs.has('contacto') ? (
          <View style={hiddenStyle(activeTab !== 'contacto')}>
            <ContactTab business={business} />
          </View>
        ) : null}

        {visitedTabs.has('calificar') ? (
          <View style={hiddenStyle(activeTab !== 'calificar')}>
            <RateTab businessId={business.id} onSubmitted={handleRatingSubmitted} />
          </View>
        ) : null}
      </View>
    </View>
  )
}

function hiddenStyle(hidden: boolean) {
  return [styles.tabContent, hidden && styles.tabContentHidden]
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  businessName: {
    textAlign: 'center',
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold as '600',
    color: colors.gray[900],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  tabContentHidden: {
    display: 'none',
  },
})
