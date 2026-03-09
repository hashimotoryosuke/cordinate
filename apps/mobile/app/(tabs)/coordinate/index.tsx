import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { apiRequest } from '../../../src/lib/api'
import { useAuth } from '../../../src/contexts/AuthContext'

const colors = {
  primary: '#1A1A1A',
  accent: '#C9A84C',
  background: '#FAFAFA',
  muted: '#F4F4F5',
  border: '#E4E4E7',
  mutedText: '#71717A',
}

const SCREEN_WIDTH = Dimensions.get('window').width
const COLUMN_COUNT = 2
const GRID_PADDING = 12
const ITEM_GAP = 8
const ITEM_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - ITEM_GAP * (COLUMN_COUNT - 1)) / COLUMN_COUNT

interface Coordinate {
  id: string
  inspirationImageUrl: string
  description: string
  createdAt: string
  isFavorite: boolean
  itemIds: string[]
}

export default function CoordinateScreen() {
  const router = useRouter()
  const { token } = useAuth()
  const [coordinates, setCoordinates] = useState<Coordinate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchCoordinates = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const res = await apiRequest<{ data: Coordinate[] }>('/coordinates', { token: token ?? undefined })
      setCoordinates(res.data)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'データの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchCoordinates()
  }, [fetchCoordinates])

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr)
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  }

  function renderItem({ item }: { item: Coordinate }) {
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => router.push({ pathname: '/(tabs)/coordinate/[id]', params: { id: item.id } })}>
        <Image
          source={{ uri: item.inspirationImageUrl }}
          style={styles.cardImage}
          resizeMode="cover"
        />
        <View style={styles.cardBody}>
          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>コーデ</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.push('/(tabs)/coordinate/new')}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : fetchError ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
          <Text style={styles.emptyTitle}>{fetchError}</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={fetchCoordinates} activeOpacity={0.8}>
            <Text style={styles.emptyButtonText}>再試行</Text>
          </TouchableOpacity>
        </View>
      ) : coordinates.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="sparkles-outline" size={64} color={colors.border} />
          <Text style={styles.emptyTitle}>まだコーデが保存されていません</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/(tabs)/coordinate/new')}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyButtonText}>コーデを作成する</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={coordinates}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={COLUMN_COUNT}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  headerButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  grid: {
    padding: GRID_PADDING,
    gap: ITEM_GAP,
  },
  gridRow: {
    gap: ITEM_GAP,
  },
  card: {
    width: ITEM_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardImage: {
    width: '100%',
    height: ITEM_WIDTH,
  },
  cardBody: {
    padding: 8,
    gap: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
    lineHeight: 18,
  },
  cardDate: {
    fontSize: 11,
    color: colors.mutedText,
  },
})
