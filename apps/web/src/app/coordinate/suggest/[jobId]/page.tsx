'use client'
import React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { useAuth } from '@/contexts/AuthContext'
import { apiRequest } from '@/lib/api'

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

interface PageProps {
  params: Promise<{ jobId: string }>
}

export default function CoordinateSuggestPage({ params }: PageProps): React.JSX.Element {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { accessToken } = useAuth()
  const resolvedParams = React.use(params)
  const { jobId } = resolvedParams

  const inspirationImageUrl = searchParams.get('imageUrl') ?? ''

  const [savingIndex, setSavingIndex] = React.useState<number | null>(null)
  const [savedIndices, setSavedIndices] = React.useState<Set<number>>(new Set())
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [timedOut, setTimedOut] = React.useState(false)

  // Hard timeout: stop polling after 2 minutes
  React.useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 2 * 60 * 1000)
    return () => clearTimeout(t)
  }, [])

  const { data, error } = useSWR(
    accessToken && !timedOut ? `/coordinates/jobs/${jobId}` : null,
    () =>
      apiRequest<{ data: JobResult }>(`/coordinates/jobs/${jobId}`, { token: accessToken! }),
    {
      refreshInterval: (d) =>
        !d || d.data.status === 'pending' || d.data.status === 'processing' ? 2000 : 0,
      revalidateOnFocus: false,
    }
  )

  async function handleSave(suggestion: Suggestion, index: number) {
    if (!accessToken || savingIndex !== null) return
    setSavingIndex(index)
    setSaveError(null)
    try {
      await apiRequest('/coordinates', {
        method: 'POST',
        body: JSON.stringify({
          inspirationImageUrl,
          itemIds: suggestion.itemIds,
          description: suggestion.description,
          styleNote: suggestion.styleNote,
          matchScore: suggestion.matchScore,
        }),
        token: accessToken,
      })
      setSavedIndices((prev) => new Set([...prev, index]))
      router.push('/coordinate')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setSavingIndex(null)
    }
  }

  const jobData = data?.data

  // Timeout state
  if (timedOut && (!jobData || jobData.status === 'pending' || jobData.status === 'processing')) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4" style={{ backgroundColor: 'var(--color-background)' }}>
        <p className="text-center text-sm" style={{ color: 'var(--color-foreground)' }}>タイムアウトしました。もう一度お試しください。</p>
        <Link href="/coordinate/new" className="rounded-full px-6 py-3 text-sm font-medium" style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
          やり直す
        </Link>
      </div>
    )
  }

  // Loading / polling state
  if (!jobData || jobData.status === 'pending' || jobData.status === 'processing') {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <div
          className="h-10 w-10 animate-spin rounded-full border-2"
          style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}
        />
        <p className="font-medium" style={{ color: 'var(--color-foreground)' }}>
          AIがコーデを提案しています...
        </p>
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          少々お待ちください
        </p>
      </div>
    )
  }

  // Error state
  if (error || jobData.status === 'error') {
    const msg = jobData.errorMessage ?? (error instanceof Error ? error.message : 'エラーが発生しました')
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-6 px-4"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <p className="text-center text-sm" style={{ color: 'var(--color-foreground)' }}>
          {msg}
        </p>
        <Link
          href="/coordinate/new"
          className="rounded-full px-6 py-3 text-sm font-medium transition-all"
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-primary-foreground)',
          }}
        >
          やり直す
        </Link>
      </div>
    )
  }

  // Done state
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b"
        style={{
          backgroundColor: 'var(--color-background)',
          borderColor: 'var(--color-border)',
        }}
      >
        <Link
          href="/coordinate/new"
          className="flex items-center justify-center h-8 w-8 rounded-full transition-colors"
          style={{ color: 'var(--color-foreground)' }}
          aria-label="戻る"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <h1
          className="text-lg font-bold tracking-tight"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          コーデ提案
        </h1>
      </header>

      <main className="flex-1 px-4 py-6 flex flex-col gap-4">
        {saveError && (
          <p className="text-sm text-center" style={{ color: '#ef4444' }}>
            {saveError}
          </p>
        )}

        {jobData.suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="rounded-xl border p-4 flex flex-col gap-3"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-background)',
            }}
          >
            {/* Proposal label and match score */}
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--color-muted-foreground)' }}
              >
                提案 {index + 1}
              </span>
              <span
                className="text-sm font-bold"
                style={{ color: 'var(--color-primary)' }}
              >
                マッチ度: {Math.round(suggestion.matchScore * 100)}%
              </span>
            </div>

            {/* Item count placeholder */}
            <div
              className="rounded-lg flex items-center justify-center py-6"
              style={{ backgroundColor: 'var(--color-muted)' }}
            >
              <span className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                {suggestion.itemIds.length}アイテム使用
              </span>
            </div>

            {/* Description */}
            <p className="text-sm" style={{ color: 'var(--color-foreground)' }}>
              {suggestion.description}
            </p>

            {/* Style note */}
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              {suggestion.styleNote}
            </p>

            {/* Save button */}
            <button
              onClick={() => handleSave(suggestion, index)}
              disabled={savingIndex !== null || savedIndices.has(index)}
              className="w-full rounded-full py-2.5 text-sm font-medium transition-all disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-primary-foreground)',
              }}
            >
              {savingIndex === index
                ? '保存中...'
                : savedIndices.has(index)
                ? '保存済み'
                : 'このコーデを保存'}
            </button>
          </div>
        ))}
      </main>
    </div>
  )
}
