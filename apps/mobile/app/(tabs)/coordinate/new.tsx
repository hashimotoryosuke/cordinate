import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { apiRequest } from '../../../src/lib/api'
import { useAuth } from '../../../src/contexts/AuthContext'

const colors = {
  primary: '#1A1A1A',
  background: '#FAFAFA',
  muted: '#F4F4F5',
  border: '#E4E4E7',
  mutedText: '#71717A',
  blue: '#007AFF',
  error: '#DC2626',
}

export default function NewCoordinateScreen() {
  const router = useRouter()
  const { token } = useAuth()
  const [imageUrl, setImageUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!imageUrl.trim()) {
      setError('URLを入力してください')
      return
    }
    setError(null)
    setIsLoading(true)
    try {
      const res = await apiRequest<{ data: { jobId: string; inspirationId: string } }>(
        '/coordinates/inspire',
        {
          method: 'POST',
          body: JSON.stringify({ imageUrl: imageUrl.trim() }),
          token: token ?? undefined,
        }
      )
      const { jobId } = res.data
      router.push({
        pathname: '/(tabs)/coordinate/suggest',
        params: { jobId, imageUrl: imageUrl.trim() },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setIsLoading(false)
    }
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
        <Text style={styles.navTitle}>インスピレーション入力</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>インスピレーション画像URL</Text>
          <TextInput
            style={styles.textInput}
            value={imageUrl}
            onChangeText={setImageUrl}
            placeholder="https://..."
            placeholderTextColor={colors.mutedText}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          {error && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        <View style={styles.hintCard}>
          <Ionicons name="information-circle-outline" size={18} color={colors.mutedText} />
          <Text style={styles.hintText}>
            ファッション画像のURLを入力すると、AIがあなたのクローゼットからコーデを提案します。
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>コーデを提案する</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.primary,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
  },
  hintCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.muted,
    borderRadius: 10,
    padding: 14,
    alignItems: 'flex-start',
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    color: colors.mutedText,
    lineHeight: 19,
  },
  submitButton: {
    backgroundColor: colors.blue,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
})
