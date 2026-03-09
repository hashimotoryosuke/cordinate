'use client'
import React from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { useAuth } from '@/contexts/AuthContext'
import { apiRequest } from '@/lib/api'

interface Coordinate {
  id: string
  inspirationImageUrl: string
  description: string
  createdAt: string
  isFavorite: boolean
  itemIds: string[]
}

export default function CoordinatePage(): React.JSX.Element {
  const { accessToken } = useAuth()

  const { data, isLoading, error } = useSWR(
    accessToken ? '/coordinates' : null,
    () => apiRequest<{ data: Coordinate[] }>('/coordinates', { token: accessToken! }),
    { revalidateOnFocus: true }
  )

  const coordinates = data?.data ?? []

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b"
        style={{
          backgroundColor: 'var(--color-background)',
          borderColor: 'var(--color-border)',
        }}
      >
        <h1
          className="text-xl font-bold tracking-tight"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          コーデ
        </h1>
        <Link
          href="/coordinate/new"
          className="flex items-center justify-center h-8 w-8 rounded-full text-lg font-bold transition-colors"
          style={{
            backgroundColor: 'var(--color-muted)',
            color: 'var(--color-foreground)',
          }}
          aria-label="新しいコーデを追加"
        >
          ＋
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-4">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2"
              style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}
            />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              データの取得に失敗しました
            </p>
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              {error instanceof Error ? error.message : ''}
            </p>
          </div>
        )}

        {!isLoading && !error && coordinates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full"
              style={{ backgroundColor: 'var(--color-muted)' }}
            >
              <span className="text-3xl">👗</span>
            </div>
            <p className="font-medium">まだコーデが保存されていません</p>
            <Link
              href="/coordinate/new"
              className="text-sm underline"
              style={{ color: 'var(--color-primary)' }}
            >
              コーデを提案してもらう
            </Link>
          </div>
        )}

        {!isLoading && !error && coordinates.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {coordinates.map((coord) => (
              <Link
                key={coord.id}
                href={`/coordinate/${coord.id}`}
                className="overflow-hidden rounded-xl border flex flex-col"
                style={{
                  borderColor: 'var(--color-border)',
                  aspectRatio: '3/4',
                  position: 'relative',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coord.inspirationImageUrl}
                  alt={coord.description}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
                {/* Overlay */}
                <div
                  className="absolute bottom-0 left-0 right-0 px-2 py-2"
                  style={{
                    background:
                      'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
                  }}
                >
                  <p
                    className="text-xs font-medium line-clamp-2"
                    style={{ color: '#ffffff' }}
                  >
                    {coord.description}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: 'rgba(255,255,255,0.7)' }}
                  >
                    {new Date(coord.createdAt).toLocaleDateString('ja-JP')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* FAB */}
      <Link
        href="/coordinate/new"
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
        style={{
          backgroundColor: 'var(--color-primary)',
          color: 'var(--color-primary-foreground)',
        }}
        aria-label="コーデを追加する"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </Link>
    </div>
  )
}
