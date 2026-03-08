import React from 'react'
'use client'

import { useState, useRef, type ChangeEvent, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ClothingItem, CreateClothingItemInput } from '@cordinate/shared'
import { apiRequest } from '@/lib/api'
import { getToken } from '@/lib/auth'

interface PresignedUrlResponse {
  uploadUrl: string
  fileUrl: string
}

type UploadStatus = 'idle' | 'uploading' | 'registering' | 'done' | 'error'

export default function NewClosetPage(): React.JSX.Element {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return

    setFile(selected)
    setErrorMessage(null)

    // Revoke previous object URL if any
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(selected))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!file) return

    const token = getToken()
    if (!token) {
      setErrorMessage('認証が必要です。再度ログインしてください。')
      return
    }

    setStatus('uploading')
    setErrorMessage(null)

    try {
      // 1. Get presigned URL
      const { uploadUrl, fileUrl } = await apiRequest<PresignedUrlResponse>(
        '/upload/presigned-url',
        {
          method: 'POST',
          token,
          body: JSON.stringify({
            contentType: file.type,
            fileName: file.name,
          }),
        }
      )

      // 2. Upload directly to storage
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!uploadRes.ok) throw new Error('ファイルのアップロードに失敗しました')

      // 3. Register in DB
      setStatus('registering')
      const payload: CreateClothingItemInput = { imageUrl: fileUrl }
      await apiRequest<ClothingItem>('/closet', {
        method: 'POST',
        token,
        body: JSON.stringify(payload),
      })

      setStatus('done')
      router.push('/closet')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : '予期せぬエラーが発生しました')
    }
  }

  const isUploading = status === 'uploading' || status === 'registering'

  const statusLabel: Record<UploadStatus, string> = {
    idle: 'クローゼットに追加する',
    uploading: 'アップロード中...',
    registering: '登録中...',
    done: '完了',
    error: '再試行する',
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b"
        style={{ backgroundColor: 'var(--color-background)', borderColor: 'var(--color-border)' }}
      >
        <Link
          href="/closet"
          className="flex items-center gap-1 text-sm"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          クローゼット
        </Link>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">服を追加してください</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              AIが自動でタグ付けします
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* File selector */}
            {!previewUrl ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-12 transition-colors"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <span className="text-4xl">🖼️</span>
                <span className="text-sm font-medium">ライブラリから選ぶ</span>
                <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  JPEG / PNG / WEBP
                </span>
              </button>
            ) : (
              <div className="relative overflow-hidden rounded-xl" style={{ aspectRatio: '3/4' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="プレビュー"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-3 right-3 rounded-full px-3 py-1.5 text-xs font-medium shadow"
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'var(--color-primary-foreground)',
                  }}
                >
                  変更
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {errorMessage && (
              <p
                className="rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: '#fca5a5', backgroundColor: '#fef2f2', color: '#dc2626' }}
              >
                {errorMessage}
              </p>
            )}

            {/* Upload button */}
            <button
              type="submit"
              disabled={!file || isUploading}
              className="rounded-md py-3 text-sm font-medium transition-opacity disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-primary-foreground)',
              }}
            >
              {isUploading ? (
                <span className="flex items-center justify-center gap-2">
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
                    style={{ borderColor: 'var(--color-primary-foreground)' }}
                  />
                  {statusLabel[status]}
                </span>
              ) : (
                statusLabel[status]
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
