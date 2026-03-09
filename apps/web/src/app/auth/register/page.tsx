'use client'
import React from 'react'


import { useState, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function RegisterPage(): React.JSX.Element {
  const router = useRouter()
  const { register, user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && user) router.replace('/closet')
  }, [isLoading, user, router])

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await register(name, email, password)
      router.push('/closet')
    } catch (err) {
      setError(err instanceof Error ? err.message : '登録に失敗しました')
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
            無料で始めましょう
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm font-medium">
              お名前
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 transition"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-background)',
              }}
              placeholder="山田 太郎"
            />
          </div>

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
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 transition"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-background)',
              }}
              placeholder="8文字以上"
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
            {isSubmitting ? '登録中...' : '無料で登録する'}
          </button>
        </form>

        {/* Login link */}
        <p className="mt-6 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          すでにアカウントをお持ちの方は{' '}
          <Link
            href="/auth/login"
            className="font-medium underline underline-offset-4"
            style={{ color: 'var(--color-foreground)' }}
          >
            ログイン
          </Link>
        </p>
      </div>
    </main>
  )
}
