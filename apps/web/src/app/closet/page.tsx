import React from 'react'
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import type { ClothingItem, ClothingCategory } from '@cordinate/shared'
import { apiRequest } from '@/lib/api'
import { getToken, removeToken } from '@/lib/auth'

type CategoryFilter = 'all' | ClothingCategory

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: 'すべて',
  tops: 'トップス',
  bottoms: 'ボトムス',
  outerwear: 'アウター',
  shoes: 'シューズ',
  bag: 'バッグ',
  accessory: 'アクセサリー',
  other: 'その他',
}

const CATEGORY_ORDER: CategoryFilter[] = [
  'all',
  'tops',
  'bottoms',
  'outerwear',
  'shoes',
  'bag',
  'accessory',
  'other',
]

function fetchCloset(token: string | undefined): Promise<ClothingItem[]> {
  if (!token) throw new Error('Unauthorized')
  return apiRequest<ClothingItem[]>('/closet', { token })
}

export default function ClosetPage(): React.JSX.Element {
  const router = useRouter()
  const token = getToken()
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all')

  const { data: items, isLoading, error } = useSWR<ClothingItem[]>(
    token ? '/closet' : null,
    () => fetchCloset(token),
    { revalidateOnFocus: true }
  )

  function handleLogout() {
    removeToken()
    router.push('/')
  }

  const filteredItems =
    activeCategory === 'all'
      ? (items ?? [])
      : (items ?? []).filter((item) => item.category === activeCategory)

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b"
        style={{ backgroundColor: 'var(--color-background)', borderColor: 'var(--color-border)' }}
      >
        <h1
          className="text-xl font-bold tracking-tight"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          クローゼット
        </h1>
        <button
          onClick={handleLogout}
          className="text-xs px-3 py-1 rounded-md border transition-colors"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}
        >
          ログアウト
        </button>
      </header>

      {/* Category filter tabs */}
      <div
        className="flex gap-2 overflow-x-auto px-4 py-3 border-b scrollbar-hide"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {CATEGORY_ORDER.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className="shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors"
            style={
              activeCategory === cat
                ? {
                    backgroundColor: 'var(--color-primary)',
                    color: 'var(--color-primary-foreground)',
                  }
                : {
                    backgroundColor: 'var(--color-muted)',
                    color: 'var(--color-muted-foreground)',
                  }
            }
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="flex-1 px-4 py-4">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: 'var(--color-accent)' }}
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

        {!isLoading && !error && filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full"
              style={{ backgroundColor: 'var(--color-muted)' }}
            >
              <span className="text-3xl">👗</span>
            </div>
            <p className="font-medium">まだ服が登録されていません</p>
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              右下の「+」ボタンから服を追加しましょう
            </p>
          </div>
        )}

        {!isLoading && !error && filteredItems.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {filteredItems.map((item) => (
              <Link
                key={item.id}
                href={`/closet/${item.id}`}
                className="block overflow-hidden rounded-lg"
                style={{ backgroundColor: 'var(--color-muted)', aspectRatio: '3/4' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumbnailUrl ?? item.imageUrl}
                  alt={`${CATEGORY_LABELS[item.category as CategoryFilter] ?? item.category}のアイテム`}
                  className="h-full w-full object-cover transition-opacity hover:opacity-90"
                  loading="lazy"
                />
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* FAB */}
      <Link
        href="/closet/new"
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
        style={{
          backgroundColor: 'var(--color-primary)',
          color: 'var(--color-primary-foreground)',
        }}
        aria-label="服を追加する"
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
