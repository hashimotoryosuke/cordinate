import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { SignJWT } from 'jose'
import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'
import crypto from 'node:crypto'

export const authRoutes = new Hono()

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret-change-in-prod')

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

async function signToken(userId: string, email: string) {
  return new SignJWT({ sub: userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

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

    const [user] = await db
      .insert(users)
      .values({ email, name, passwordHash: hashPassword(password) })
      .returning()

    const accessToken = await signToken(user.id, user.email)
    return c.json({ data: { user: { id: user.id, email: user.email, name: user.name }, accessToken } }, 201)
  }
)

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
    if (!user || user.passwordHash !== hashPassword(password)) {
      return c.json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS', statusCode: 401 }, 401)
    }

    const accessToken = await signToken(user.id, user.email)
    return c.json({ data: { user: { id: user.id, email: user.email, name: user.name }, accessToken } })
  }
)

authRoutes.get('/me', async (c) => {
  // Protected by authMiddleware in real usage — stub for now
  return c.json({ data: null })
})
