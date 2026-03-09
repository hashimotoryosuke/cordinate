'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { apiRequest } from '@/lib/api'

export default function CoordinateNewPage(): React.JSX.Element {
  const router = useRouter()
  const { accessToken } = useAuth()
  const [imageUrl, setImageUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!accessToken || isSubmitting) return
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      const res = await apiRequest<{ data: { jobId: string; inspirationId: string } }>(
        '/coordinates/inspire',
        {
          method: 'POST',
          body: JSON.stringify({ imageUrl }),
          token: accessToken,
        }
      )
      const { jobId } = res.data
      router.push(`/coordinate/suggest/${jobId}?imageUrl=${encodeURIComponent(imageUrl)}`)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }

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
          href="/coordinate"
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
          インスピレーションを入力
        </h1>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-8">
        <p
          className="text-sm mb-8"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          参考コーデのURLを入力してください
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            required
            className="w-full rounded-lg border px-4 py-3 text-sm outline-none transition-colors"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-background)',
              color: 'var(--color-foreground)',
            }}
          />

          {errorMessage && (
            <p className="text-sm" style={{ color: '#ef4444' }}>
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={!accessToken || isSubmitting || !imageUrl.trim()}
            className="w-full rounded-full py-3 text-sm font-medium transition-all disabled:opacity-50"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-primary-foreground)',
            }}
          >
            {isSubmitting ? '送信中...' : 'コーデを提案する'}
          </button>
        </form>
      </main>
    </div>
  )
}
