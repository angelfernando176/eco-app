import { useEffect, useState } from 'react'
import { FlatList, Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Card } from '../../components/Card'
import { SectionState } from '../../components/SectionState'
import { fetchMenu } from '../../services/businessDetail'
import { formatPrice, type Product, type ProductImage } from '../../services/businessDetailLogic'
import { colors, radius, spacing, typography } from '../../theme'

export interface MenuTabProps {
  businessId: string
}

type Status = 'loading' | 'loaded' | 'empty' | 'error'

export function MenuTab({ businessId }: MenuTabProps) {
  const [status, setStatus] = useState<Status>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])

  async function load() {
    setStatus('loading')
    setErrorMessage(null)
    try {
      const found = await fetchMenu(businessId)
      setProducts(found)
      setStatus(found.length > 0 ? 'loaded' : 'empty')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'No se pudo cargar el menú.')
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
          emptyMessage={status === 'empty' ? 'Este negocio aún no tiene productos en el menú.' : null}
        />
      </View>
    )
  }

  return (
    <FlatList
      data={products}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => <ProductCard product={item} />}
    />
  )
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Card style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.name}>{product.name}</Text>
        {product.isPrimary ? <Badge label="Principal" variant="primary" /> : null}
        {product.isSecondary ? <Badge label="Secundario" variant="secondary" /> : null}
      </View>
      {product.description ? <Text style={styles.description}>{product.description}</Text> : null}
      <Text style={styles.price}>{formatPrice(product.price)}</Text>
      {product.images.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
          {product.images.map((image) => (
            <ProductImageItem key={image.id} image={image} />
          ))}
        </ScrollView>
      ) : null}
    </Card>
  )
}

function ProductImageItem({ image }: { image: ProductImage }) {
  const [failed, setFailed] = useState(false)

  return (
    <View style={styles.imageBlock}>
      {failed ? (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.imagePlaceholderText}>Sin imagen</Text>
        </View>
      ) : (
        <Image source={{ uri: image.url }} style={styles.image} onError={() => setFailed(true)} />
      )}
      {image.description ? <Text style={styles.imageCaption}>{image.description}</Text> : null}
    </View>
  )
}

function Badge({ label, variant }: { label: string; variant: 'primary' | 'secondary' }) {
  return (
    <View style={[styles.badge, variant === 'primary' ? styles.badgePrimary : styles.badgeSecondary]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
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
    marginBottom: spacing[3],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  name: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold as '600',
    color: colors.brand[700],
  },
  description: {
    fontSize: typography.size.sm,
    color: colors.gray[700],
  },
  price: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold as '600',
    color: colors.gray[900],
  },
  gallery: {
    gap: spacing[2],
  },
  imageBlock: {
    width: 120,
    gap: spacing[1],
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: radius.md,
    backgroundColor: colors.gray[100],
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: typography.size.xs,
    color: colors.gray[500],
  },
  imageCaption: {
    fontSize: typography.size.xs,
    color: colors.gray[600],
  },
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  badgePrimary: {
    backgroundColor: colors.brand[100],
  },
  badgeSecondary: {
    backgroundColor: colors.gray[100],
  },
  badgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium as '500',
    color: colors.gray[700],
  },
})
