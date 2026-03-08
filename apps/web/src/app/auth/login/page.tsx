import React from 'react'
'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage(): React.JSX.Element {
  const router = useRouter()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await login({ email, password })
      router.push('/closet')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Cordinate
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            あなたの服でおしゃれに
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 transition"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-background)',
                // @ts-expect-error CSS custom prop
                '--tw-ring-color': 'var(--color-accent)',
              }}
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 transition"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-background)',
                // @ts-expect-error CSS custom prop
                '--tw-ring-color': 'var(--color-accent)',
              }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: '#fca5a5', backgroundColor: '#fef2f2', color: '#dc2626' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-md py-3 text-sm font-medium transition-opacity disabled:opacity-60"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-primary-foreground)',
            }}
          >
            {isSubmitting ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <span className="flex-1 border-t" style={{ borderColor: 'var(--color-border)' }} />
          <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            または
          </span>
          <span className="flex-1 border-t" style={{ borderColor: 'var(--color-border)' }} />
        </div>

        {/* Register link */}
        <p className="text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          アカウントをお持ちでない？{' '}
          <Link
            href="/auth/register"
            className="font-medium underline underline-offset-4"
            style={{ color: 'var(--color-foreground)' }}
          >
            新規登録はこちら
          </Link>
        </p>
      </div>
    </main>
  )
}
