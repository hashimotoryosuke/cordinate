'use client'
import React from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { useAuth } from '@/contexts/AuthContext'
import { apiRequest } from '@/lib/api'

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

interface ProductsResponse {
  missingCategories: string[]
  products: ProductSuggestion[]
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

export default function CoordinateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}): React.JSX.Element {
  const { id } = React.use(params)
  const { accessToken } = useAuth()

  const { data: coordListData, isLoading: coordLoading } = useSWR(
    accessToken ? '/coordinates' : null,
    () => apiRequest<{ data: Coordinate[] }>('/coordinates', { token: accessToken! }),
    { revalidateOnFocus: false }
  )

  const { data: productsData, isLoading: productsLoading } = useSWR(
    accessToken ? `/products/coordinates/${id}` : null,
    () =>
      apiRequest<{ data: ProductsResponse }>(`/products/coordinates/${id}`, {
        token: accessToken!,
      }),
    { revalidateOnFocus: false }
  )

  const coord = coordListData?.data.find((c) => c.id === id)
  const products = productsData?.data

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
          style={{
            backgroundColor: 'var(--color-muted)',
            color: 'var(--color-foreground)',
          }}
          aria-label="戻る"
        >
          ←
        </Link>
        <h1
          className="text-xl font-bold tracking-tight"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          コーデ詳細
        </h1>
      </header>

      <main className="flex-1 px-4 py-4 flex flex-col gap-4">
        {coordLoading && (
          <div className="flex items-center justify-center py-20">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2"
              style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}
            />
          </div>
        )}

        {!coordLoading && coord && (
          <>
            {/* Inspiration image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coord.inspirationImageUrl}
              alt={coord.description ?? 'コーデ画像'}
              className="w-full max-h-64 object-cover rounded-xl"
            />

            {/* Match score badge */}
            {coord.matchScore != null && (
              <div className="flex">
                <span
                  className="text-sm font-semibold px-3 py-1 rounded-full"
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'var(--color-primary-foreground)',
                  }}
                >
                  マッチ度 {Math.round(coord.matchScore * 100)}%
                </span>
              </div>
            )}

            {/* Description */}
            {coord.description && (
              <p className="text-sm" style={{ color: 'var(--color-foreground)' }}>
                {coord.description}
              </p>
            )}

            {/* Style note */}
            {coord.styleNote && (
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                {coord.styleNote}
              </p>
            )}

            {/* Divider + products section */}
            <hr style={{ borderColor: 'var(--color-border)' }} />
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>
              不足アイテムを購入する
            </h2>

            {productsLoading && (
              <div className="flex items-center justify-center py-10">
                <div
                  className="h-8 w-8 animate-spin rounded-full border-2"
                  style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}
                />
              </div>
            )}

            {!productsLoading && products && (
              <>
                {products.missingCategories.length === 0 ? (
                  <p className="text-sm text-center py-4">
                    すべてのカテゴリが揃っています 👍
                  </p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {products.missingCategories.map((cat) => {
                      const catProducts = products.products.filter((p) => p.category === cat)
                      return (
                        <div key={cat} className="flex flex-col gap-2">
                          {/* Category label */}
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full self-start"
                            style={{
                              backgroundColor: 'var(--color-muted)',
                              color: 'var(--color-muted-foreground)',
                            }}
                          >
                            {CATEGORY_LABELS[cat] ?? cat}
                          </span>

                          {/* Products horizontal scroll */}
                          <div className="flex flex-row gap-3 overflow-x-auto pb-2">
                            {catProducts.map((product) => (
                              <div
                                key={product.id}
                                className="w-40 shrink-0 flex flex-col gap-1"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="w-40 h-40 object-cover rounded-lg"
                                  style={{ backgroundColor: 'var(--color-muted)' }}
                                />
                                <p
                                  className="text-xs line-clamp-2"
                                  style={{ color: 'var(--color-foreground)' }}
                                >
                                  {product.name}
                                </p>
                                {product.brand && (
                                  <p
                                    className="text-xs"
                                    style={{ color: 'var(--color-muted-foreground)' }}
                                  >
                                    {product.brand}
                                  </p>
                                )}
                                <p
                                  className="text-xs font-semibold"
                                  style={{ color: 'var(--color-foreground)' }}
                                >
                                  ¥{product.price.toLocaleString('ja-JP')}
                                </p>
                                <a
                                  href={product.productUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-center py-1 rounded-lg font-medium"
                                  style={{
                                    backgroundColor: 'var(--color-primary)',
                                    color: 'var(--color-primary-foreground)',
                                  }}
                                >
                                  購入する
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
