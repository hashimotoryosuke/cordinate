import { useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
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
  green: '#16A34A',
}

interface Suggestion {
  itemIds: string[]
  description: string
  matchScore: number
  styleNote: string
}

interface JobResult {
  id: string
  status: 'pending' | 'processing' | 'done' | 'error'
  suggestions: Suggestion[]
  errorMessage?: string
}

export default function SuggestScreen() {
  const router = useRouter()
  const { token } = useAuth()
  const params = useLocalSearchParams<{ jobId: string; imageUrl: string }>()
  const { jobId, imageUrl } = params

  const [job, setJob] = useState<JobResult | null>(null)
  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!jobId) return

    async function pollJob() {
      try {
        const res = await apiRequest<{ data: JobResult }>(
          `/coordinates/jobs/${jobId}`,
          { token: token ?? undefined }
        )
        const data = res.data
        setJob(data)
        if (data.status === 'done' || data.status === 'error') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        }
      } catch {
        // keep polling on transient errors
      }
    }

    pollJob()
    intervalRef.current = setInterval(pollJob, 2000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [jobId, token])

  async function handleSave(suggestion: Suggestion, index: number) {
    setSaveError(null)
    setSavingIndex(index)
    try {
      await apiRequest('/coordinates', {
        method: 'POST',
        body: JSON.stringify({
          inspirationImageUrl: imageUrl,
          itemIds: suggestion.itemIds,
          description: suggestion.description,
          styleNote: suggestion.styleNote,
          matchScore: suggestion.matchScore,
        }),
        token: token ?? undefined,
      })
      router.push('/(tabs)/coordinate')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setSavingIndex(null)
    }
  }

  const isLoading = !job || job.status === 'pending' || job.status === 'processing'
  const isError = job?.status === 'error'
  const isDone = job?.status === 'done'

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
        <Text style={styles.navTitle}>コーデ提案</Text>
        <View style={styles.backButton} />
      </View>

      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>AIがコーデを提案しています...</Text>
        </View>
      )}

      {isError && (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={56} color={colors.error} />
          <Text style={styles.errorTitle}>エラーが発生しました</Text>
          {job?.errorMessage && (
            <Text style={styles.errorMessage}>{job.errorMessage}</Text>
          )}
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>やり直す</Text>
          </TouchableOpacity>
        </View>
      )}

      {isDone && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {saveError && (
            <View style={styles.saveErrorBanner}>
              <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
              <Text style={styles.saveErrorText}>{saveError}</Text>
            </View>
          )}
          {(job?.suggestions ?? []).map((suggestion, index) => (
            <View key={index} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>提案 {index + 1}</Text>
                <View style={styles.matchBadge}>
                  <Text style={styles.matchBadgeText}>
                    マッチ度: {Math.round(suggestion.matchScore * 100)}%
                  </Text>
                </View>
              </View>

              <Text style={styles.cardDescription}>{suggestion.description}</Text>

              {suggestion.styleNote ? (
                <Text style={styles.cardStyleNote}>{suggestion.styleNote}</Text>
              ) : null}

              <TouchableOpacity
                style={[styles.saveButton, savingIndex === index && styles.saveButtonDisabled]}
                onPress={() => handleSave(suggestion, index)}
                activeOpacity={0.85}
                disabled={savingIndex !== null}
              >
                {savingIndex === index ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>保存する</Text>
                )}
              </TouchableOpacity>
            </View>
          ))}
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 16,
    color: colors.mutedText,
    textAlign: 'center',
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: colors.mutedText,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 4,
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  saveErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  saveErrorText: {
    flex: 1,
    fontSize: 13,
    color: colors.error,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  matchBadge: {
    backgroundColor: colors.muted,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  matchBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.green,
  },
  cardDescription: {
    fontSize: 14,
    color: colors.primary,
    lineHeight: 21,
  },
  cardStyleNote: {
    fontSize: 13,
    color: colors.mutedText,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: colors.blue,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
})
