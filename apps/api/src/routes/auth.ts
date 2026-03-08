import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcrypt'
import { db } from '../db'
import { users, refreshTokens } from '../db/schema'
import { eq } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'
import crypto from 'node:crypto'

export const authRoutes = new Hono()

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret-change-in-prod')
const BCRYPT_ROUNDS = 12
const ACCESS_TOKEN_TTL = '15m'
const REFRESH_TOKEN_TTL_DAYS = 30

async function signAccessToken(userId: string, email: string) {
  return new SignJWT({ sub: userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(JWT_SECRET)
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
  zValidator(
    'json',
    z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(1).max(100),
    })
  ),
  async (c) => {
    const { email, password, name } = c.req.valid('json')

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (existing.length > 0) {
      return c.json({ error: 'Email already in use', code: 'EMAIL_IN_USE', statusCode: 409 }, 409)
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    const [user] = await db.insert(users).values({ email, name, passwordHash }).returning()

    const tokens = await issueTokenPair(user.id, user.email)
    return c.json(
      { data: { user: { id: user.id, email: user.email, name: user.name }, ...tokens } },
      201
    )
  }
)

// POST /auth/login
authRoutes.post(
  '/login',
  zValidator(
    'json',
    z.object({
      email: z.string().email(),
      password: z.string(),
    })
  ),
  async (c) => {
    const { email, password } = c.req.valid('json')

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (!user || !user.passwordHash) {
      return c.json(
        { error: 'Invalid credentials', code: 'INVALID_CREDENTIALS', statusCode: 401 },
        401
      )
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return c.json(
        { error: 'Invalid credentials', code: 'INVALID_CREDENTIALS', statusCode: 401 },
        401
      )
    }

    const tokens = await issueTokenPair(user.id, user.email)
    return c.json({ data: { user: { id: user.id, email: user.email, name: user.name }, ...tokens } })
  }
)

// POST /auth/refresh
authRoutes.post(
  '/refresh',
  zValidator('json', z.object({ refreshToken: z.string() })),
  async (c) => {
    const { refreshToken } = c.req.valid('json')

    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, refreshToken))
      .limit(1)

    if (!stored || stored.expiresAt < new Date()) {
      return c.json(
        { error: 'Invalid or expired refresh token', code: 'INVALID_REFRESH_TOKEN', statusCode: 401 },
        401
      )
    }

    const [user] = await db.select().from(users).where(eq(users.id, stored.userId)).limit(1)
    if (!user) {
      return c.json({ error: 'User not found', code: 'USER_NOT_FOUND', statusCode: 401 }, 401)
    }

    // Rotate: delete old token, issue new pair
    await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken))
    const tokens = await issueTokenPair(user.id, user.email)

    return c.json({ data: tokens })
  }
)

// GET /auth/me — requires auth
authRoutes.get('/me', authMiddleware, async (c) => {
  const { userId } = c.get('user')
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) {
    return c.json({ error: 'User not found', code: 'USER_NOT_FOUND', statusCode: 404 }, 404)
  }
  return c.json({ data: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl } })
})

// POST /auth/logout — requires auth
authRoutes.post('/logout', authMiddleware, async (c) => {
  const { userId } = c.get('user')
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId))
  return c.json({ data: { success: true } })
})
