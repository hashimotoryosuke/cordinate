import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { SignJWT } from 'jose'
import bcrypt from 'bcrypt'
import { db } from '../db'
import { users, refreshTokens } from '../db/schema'
import { eq, and, lt } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'
import { config } from '../config'
import crypto from 'node:crypto'

export const authRoutes = new Hono()

const BCRYPT_ROUNDS = 12
const ACCESS_TOKEN_TTL = '15m'
const REFRESH_TOKEN_TTL_DAYS = 30

async function signAccessToken(userId: string, email: string) {
  return new SignJWT({ sub: userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(config.jwtSecret)
}

async function issueTokenPair(userId: string, email: string) {
  const accessToken = await signAccessToken(userId, email)
  const rawRefresh = crypto.randomBytes(48).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS)

  await db.insert(refreshTokens).values({ userId, token: rawRefresh, expiresAt })
  return { accessToken, refreshToken: rawRefresh }
}

// POST /auth/register
authRoutes.post(
  '/register',
  zValidator('json', z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1).max(100),
  })),
  async (c) => {
    const { email, password, name } = c.req.valid('json')
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

    try {
      const [user] = await db.insert(users).values({ email, name, passwordHash }).returning()
      const tokens = await issueTokenPair(user.id, user.email)
      return c.json({ data: { user: { id: user.id, email: user.email, name: user.name }, ...tokens } }, 201)
    } catch (err: unknown) {
      // PostgreSQL unique violation
      if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
        return c.json({ error: 'Email already in use', code: 'EMAIL_IN_USE', statusCode: 409 }, 409)
      }
      throw err
    }
  }
)

// POST /auth/login
authRoutes.post(
  '/login',
  zValidator('json', z.object({
    email: z.string().email(),
    password: z.string(),
  })),
  async (c) => {
    const { email, password } = c.req.valid('json')
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

    // Use constant-time comparison to prevent timing attacks
    const dummyHash = '$2b$12$invalidhashfortimingattackprevention000000000000000000'
    const valid = user?.passwordHash
      ? await bcrypt.compare(password, user.passwordHash)
      : await bcrypt.compare(password, dummyHash).then(() => false)

    if (!valid) {
      return c.json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS', statusCode: 401 }, 401)
    }

    const tokens = await issueTokenPair(user!.id, user!.email)
    return c.json({ data: { user: { id: user!.id, email: user!.email, name: user!.name }, ...tokens } })
  }
)

// POST /auth/refresh
authRoutes.post(
  '/refresh',
  zValidator('json', z.object({ refreshToken: z.string() })),
  async (c) => {
    const { refreshToken } = c.req.valid('json')

    // Rotate token atomically in a transaction
    const result = await db.transaction(async (tx) => {
      const [stored] = await tx
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.token, refreshToken))
        .limit(1)

      if (!stored || stored.expiresAt < new Date()) return null

      const [user] = await tx.select().from(users).where(eq(users.id, stored.userId)).limit(1)
      if (!user) return null

      await tx.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken))

      const accessToken = await signAccessToken(user.id, user.email)
      const newRawRefresh = crypto.randomBytes(48).toString('hex')
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS)
      await tx.insert(refreshTokens).values({ userId: user.id, token: newRawRefresh, expiresAt })

      return { user, accessToken, refreshToken: newRawRefresh }
    })

    if (!result) {
      return c.json({ error: 'Invalid or expired refresh token', code: 'INVALID_REFRESH_TOKEN', statusCode: 401 }, 401)
    }

    return c.json({ data: { accessToken: result.accessToken, refreshToken: result.refreshToken } })
  }
)

// GET /auth/me
authRoutes.get('/me', authMiddleware, async (c) => {
  const { userId } = c.get('user')
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) return c.json({ error: 'User not found', code: 'USER_NOT_FOUND', statusCode: 404 }, 404)
  return c.json({ data: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl } })
})

// POST /auth/logout — invalidates only the current device's refresh token
authRoutes.post(
  '/logout',
  authMiddleware,
  zValidator('json', z.object({ refreshToken: z.string() })),
  async (c) => {
    const { userId } = c.get('user')
    const { refreshToken } = c.req.valid('json')
    // Delete only the specific refresh token to preserve other device sessions
    await db
      .delete(refreshTokens)
      .where(and(eq(refreshTokens.token, refreshToken), eq(refreshTokens.userId, userId)))
    return c.json({ data: { success: true } })
  }
)

// POST /auth/logout-all — invalidates all sessions for this user
authRoutes.post('/logout-all', authMiddleware, async (c) => {
  const { userId } = c.get('user')
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId))
  return c.json({ data: { success: true } })
})
