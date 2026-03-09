import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { webcrypto, randomUUID } from 'node:crypto'
import { config } from '../config'

import type { AppEnv } from '../types'

export const uploadRoutes = new Hono<AppEnv>()

uploadRoutes.use('*', authMiddleware)

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

// POST /upload/presigned-url
uploadRoutes.post(
  '/presigned-url',
  zValidator(
    'json',
    z.object({
      contentType: z.enum(ALLOWED_TYPES),
      contentLength: z.number().int().min(1).max(MAX_SIZE_BYTES),
    })
  ),
  async (c) => {
    const { userId } = c.get('user')
    const { contentType, contentLength } = c.req.valid('json')

    const ext = contentType.split('/')[1]
    const key = `closet/${userId}/${randomUUID()}.${ext}`

    // Local development: no R2 configured
    if (!config.r2.accountId) {
      const localUrl = `${config.apiUrl}/upload/local/${key}`
      return c.json({ data: { uploadUrl: localUrl, imageUrl: localUrl, key } })
    }

    const r2Url = `https://${config.r2.accountId}.r2.cloudflarestorage.com/${config.r2.bucket}/${key}`
    const presignedUrl = await generateR2PresignedUrl(r2Url, contentType, contentLength)
    const publicUrl = `${config.r2.publicUrl}/${key}`

    return c.json({ data: { uploadUrl: presignedUrl, imageUrl: publicUrl, key } })
  }
)

// Local dev PUT handler — auth is enforced by the wildcard middleware above
uploadRoutes.put('/local/*', async (_c) => {
  return new Response(null, { status: 200 })
})

// --- AWS SigV4 presigned URL generation for R2 (S3-compatible) ---

async function generateR2PresignedUrl(
  url: string,
  contentType: string,
  contentLength: number
): Promise<string> {
  const accessKeyId = config.r2.accessKeyId!
  const secretAccessKey = config.r2.secretAccessKey!

  const now = new Date()
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '')
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const region = 'auto'
  const service = 's3'
  const expires = 3600

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
  const buf = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(message))
  return Buffer.from(buf).toString('hex')
}

async function hmacKey(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await webcrypto.subtle.importKey(
    'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  return webcrypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data))
}

async function hmacHex(key: ArrayBuffer, data: string): Promise<string> {
  const sig = await hmacKey(key, data)
  return Buffer.from(sig).toString('hex')
}

async function deriveSigningKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<ArrayBuffer> {
  const initial = new TextEncoder().encode(`AWS4${secretKey}`).buffer as ArrayBuffer
  const dateKey = await hmacKey(initial, dateStamp)
  const regionKey = await hmacKey(dateKey, region)
  const serviceKey = await hmacKey(regionKey, service)
  return hmacKey(serviceKey, 'aws4_request')
}
