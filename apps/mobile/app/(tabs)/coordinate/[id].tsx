import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  FlatList,
  Linking,
  SafeAreaView,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { apiRequest } from '../../../src/lib/api'
import { useAuth } from '../../../src/contexts/AuthContext'

const { width: screenWidth } = Dimensions.get('window')

const colors = {
  primary: '#1A1A1A',
  background: '#FAFAFA',
  muted: '#F4F4F5',
  border: '#E4E4E7',
  mutedText: '#71717A',
  blue: '#007AFF',
}

const CATEGORY_LABELS: Record<string, string> = {
  tops: 'トップス',
  bottoms: 'ボトムス',
  outerwear: 'アウター',
  shoes: 'シューズ',
  bag: 'バッグ',
  accessory: 'アクセサリー',
  other: 'その他',
}

interface Coordinate {
  id: string
  inspirationImageUrl: string
  description: string | null
  styleNote: string | null
  matchScore: number | null
  isFavorite: boolean
  itemIds: string[]
  createdAt: string
}

interface ProductSuggestion {
  id: string
  name: string
  brand: string | null
  imageUrl: string
  price: number
  productUrl: string
  category: string | null
}

export default function CoordinateDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { token } = useAuth()

  const [coordinate, setCoordinate] = useState<Coordinate | null>(null)
  const [isLoadingCoordinate, setIsLoadingCoordinate] = useState(true)
  const [missingCategories, setMissingCategories] = useState<string[]>([])
  const [products, setProducts] = useState<ProductSuggestion[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    async function fetchData() {
      setIsLoadingCoordinate(true)
      setIsLoadingProducts(true)

      const [coordResult, prodResult] = await Promise.allSettled([
        apiRequest<{ data: Coordinate }>(`/coordinates/${id}`, { token: token ?? undefined, signal }),
        apiRequest<{ data: { missingCategories: string[]; products: ProductSuggestion[] } }>(
          `/products/coordinates/${id}`,
          { token: token ?? undefined, signal }
        ),
      ])

      if (signal.aborted) return

      if (coordResult.status === 'fulfilled') {
        setCoordinate(coordResult.value.data)
      } else {
        setCoordinate(null)
      }
      setIsLoadingCoordinate(false)

      if (prodResult.status === 'fulfilled') {
        setMissingCategories(prodResult.value.data.missingCategories)
        setProducts(prodResult.value.data.products)
      } else {
        setMissingCategories([])
        setProducts([])
      }
      setIsLoadingProducts(false)
    }

    fetchData()
    return () => controller.abort()
  }, [id, token])

  function renderProductCard({ item }: { item: ProductSuggestion }) {
    return (
      <View style={styles.productCard}>
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.productImage}
          resizeMode="cover"
        />
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        {item.brand && (
          <Text style={styles.productBrand}>{item.brand}</Text>
        )}
        <Text style={styles.productPrice}>¥{item.price.toLocaleString('ja-JP')}</Text>
        <TouchableOpacity
          style={styles.buyButton}
          onPress={() => Linking.openURL(item.productUrl)}
          activeOpacity={0.8}
        >
          <Text style={styles.buyButtonText}>購入する</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>コーデ詳細</Text>
        <View style={styles.navPlaceholder} />
      </View>

      {isLoadingCoordinate ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !coordinate ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>データが見つかりませんでした</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Image
            source={{ uri: coordinate.inspirationImageUrl }}
            style={styles.inspirationImage}
            resizeMode="cover"
          />

          <View style={styles.content}>
            {coordinate.matchScore !== null && (
              <View style={styles.matchBadge}>
                <Text style={styles.matchBadgeText}>
                  マッチ度 {Math.round(coordinate.matchScore * 100)}%
                </Text>
              </View>
            )}

            {coordinate.description && (
              <Text style={styles.description}>{coordinate.description}</Text>
            )}

            {coordinate.styleNote && (
              <Text style={styles.styleNote}>{coordinate.styleNote}</Text>
            )}

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>不足アイテムを購入する</Text>

            {isLoadingProducts ? (
              <View style={styles.productsLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : missingCategories.length === 0 ? (
              <Text style={styles.allCategoriesText}>すべてのカテゴリが揃っています 👍</Text>
            ) : (
              missingCategories.map((category) => {
                const categoryProducts = products.filter((p) => p.category === category)
                return (
                  <View key={category}>
                    <Text style={styles.categoryLabel}>
                      {CATEGORY_LABELS[category] ?? category}
                    </Text>
                    <FlatList
                      data={categoryProducts}
                      renderItem={renderProductCard}
                      keyExtractor={(item) => item.id}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.productList}
                    />
                  </View>
                )
              })
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
  },
  navPlaceholder: {
    width: 36,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 15,
    color: colors.mutedText,
    textAlign: 'center',
  },
  inspirationImage: {
    width: screenWidth,
    height: 240,
  },
  content: {
    padding: 16,
  },
  matchBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  matchBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.primary,
    marginBottom: 8,
  },
  styleNote: {
    fontSize: 13,
    color: colors.mutedText,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  productsLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  allCategoriesText: {
    fontSize: 14,
    color: colors.mutedText,
    textAlign: 'center',
    paddingVertical: 16,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 12,
    marginBottom: 8,
  },
  productList: {
    paddingBottom: 8,
  },
  productCard: {
    width: 140,
    marginRight: 12,
  },
  productImage: {
    width: 140,
    height: 140,
    borderRadius: 8,
    marginBottom: 6,
  },
  productName: {
    fontSize: 12,
    color: colors.primary,
    lineHeight: 16,
    marginBottom: 2,
  },
  productBrand: {
    fontSize: 11,
    color: colors.mutedText,
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 6,
  },
  buyButton: {
    backgroundColor: colors.blue,
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
})
