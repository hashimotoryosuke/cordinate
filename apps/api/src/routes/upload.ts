import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { webcrypto, randomUUID } from 'node:crypto'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CryptoKey = any

import type { AppEnv } from '../types'
export const uploadRoutes = new Hono<AppEnv>()

uploadRoutes.use('*', authMiddleware)

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

// POST /upload/presigned-url
// Returns a presigned PUT URL for direct upload to R2
uploadRoutes.post(
  '/presigned-url',
  zValidator(
    'json',
    z.object({
      contentType: z.enum(ALLOWED_TYPES),
      contentLength: z.number().max(MAX_SIZE_BYTES),
    })
  ),
  async (c) => {
    const { userId } = c.get('user')
    const { contentType, contentLength } = c.req.valid('json')

    const ext = contentType.split('/')[1]
    const key = `closet/${userId}/${randomUUID()}.${ext}`

    // Local development: return a mock URL when R2 is not configured
    if (!process.env.CLOUDFLARE_R2_ACCOUNT_ID) {
      const localUrl = `${process.env.API_URL ?? 'http://localhost:3001'}/upload/local/${key}`
      return c.json({
        data: {
          uploadUrl: localUrl,
          imageUrl: localUrl,
          key,
        },
      })
    }

    // Production: generate R2 presigned PUT URL
    const r2Url = `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.CLOUDFLARE_R2_BUCKET}/${key}`
    const presignedUrl = await generateR2PresignedUrl(r2Url, contentType, contentLength)
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`

    return c.json({
      data: {
        uploadUrl: presignedUrl,
        imageUrl: publicUrl,
        key,
      },
    })
  }
)

// Local dev: store uploaded image temporarily (not for production)
uploadRoutes.put('/local/*', async (c) => {
  // In local dev, just acknowledge the upload
  // A real implementation would save to disk or memory
  return new Response(null, { status: 200 })
})

async function generateR2PresignedUrl(
  url: string,
  contentType: string,
  contentLength: number
): Promise<string> {
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID!

  const now = new Date()
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '')
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const region = 'auto'
  const service = 's3'
  const expires = 3600 // 1 hour

  const endpoint = new URL(url)
  const host = endpoint.host
  const pathname = endpoint.pathname

  const credential = `${accessKeyId}/${dateStamp}/${region}/${service}/aws4_request`
  const signedHeaders = 'content-length;content-type;host'

  const queryParams = [
    `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
    `X-Amz-Credential=${encodeURIComponent(credential)}`,
    `X-Amz-Date=${amzDate}`,
    `X-Amz-Expires=${expires}`,
    `X-Amz-SignedHeaders=${encodeURIComponent(signedHeaders)}`,
  ].join('&')

  const canonicalRequest = [
    'PUT',
    pathname,
    queryParams,
    `content-length:${contentLength}\ncontent-type:${contentType}\nhost:${host}\n`,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n')

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    `${dateStamp}/${region}/${service}/aws4_request`,
    await sha256(canonicalRequest),
  ].join('\n')

  const signingKey = await deriveSigningKey(secretAccessKey, dateStamp, region, service)
  const signature = await hmacHex(signingKey, stringToSign)

  return `${url}?${queryParams}&X-Amz-Signature=${signature}`
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await webcrypto.subtle.digest('SHA-256', msgBuffer)
  return Buffer.from(hashBuffer).toString('hex')
}

async function hmac(key: ArrayBuffer | CryptoKey, data: string): Promise<CryptoKey> {
  const isKey = key && typeof key === 'object' && 'type' in key
  const cryptoKey = isKey
    ? (key as CryptoKey)
    : await webcrypto.subtle.importKey('raw', key as ArrayBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await webcrypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data))
  return webcrypto.subtle.importKey('raw', sig, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
}

async function hmacHex(key: CryptoKey, data: string): Promise<string> {
  const sig = await webcrypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return Buffer.from(sig).toString('hex')
}

async function deriveSigningKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<CryptoKey> {
  const keyData = new TextEncoder().encode(`AWS4${secretKey}`)
  const initialKey = await webcrypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const dateKey = await hmac(initialKey, dateStamp)
  const regionKey = await hmac(dateKey, region)
  const serviceKey = await hmac(regionKey, service)
  return hmac(serviceKey, 'aws4_request')
}
