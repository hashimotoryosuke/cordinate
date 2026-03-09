function requireEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required environment variable: ${key}`)
  return val
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback
}

export const config = {
  jwtSecret: new TextEncoder().encode(
    process.env.NODE_ENV === 'production'
      ? requireEnv('JWT_SECRET')
      : optionalEnv('JWT_SECRET', 'dev-secret-min-32-chars-local-only')
  ),
  port: Number(optionalEnv('PORT', '3001')),
  databaseUrl: requireEnv('DATABASE_URL'),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  r2: {
    accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID,
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    bucket: optionalEnv('CLOUDFLARE_R2_BUCKET', 'cordinate-images'),
    publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL,
  },
  allowedOrigins: optionalEnv('ALLOWED_ORIGINS', 'http://localhost:3000').split(',').map(s => s.trim()),
  apiUrl: optionalEnv('API_URL', 'http://localhost:3001'),
  // Allowed hostnames for image fetching (SSRF prevention)
  allowedImageHosts: optionalEnv(
    'ALLOWED_IMAGE_HOSTS',
    'localhost'
  ).split(',').map(s => s.trim()),
} as const
