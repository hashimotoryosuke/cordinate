import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../db'
import { clothingItems } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'
import { enqueueTagging } from '../services/ai-tagger'
import { config } from '../config'

function isAllowedImageUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return config.allowedImageHosts.some(
      (h) => hostname === h || hostname.endsWith(`.${h}`)
    )
  } catch {
    return false
  }
}

import type { AppEnv } from '../types'
export const closetRoutes = new Hono<AppEnv>()

closetRoutes.use('*', authMiddleware)

const categoryEnum = z.enum(['tops', 'bottoms', 'outerwear', 'shoes', 'bag', 'accessory', 'other'])

// GET /closet
closetRoutes.get(
  '/',
  zValidator(
    'query',
    z.object({
      category: categoryEnum.optional(),
      limit: z.coerce.number().min(1).max(100).default(50),
      offset: z.coerce.number().min(0).default(0),
    })
  ),
  async (c) => {
    const { userId } = c.get('user')
    const { category, limit, offset } = c.req.valid('query')

    const conditions = [eq(clothingItems.userId, userId)]
    if (category) conditions.push(eq(clothingItems.category, category))

    const items = await db
      .select()
      .from(clothingItems)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset)
      .orderBy(sql`${clothingItems.createdAt} DESC`)

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(clothingItems)
      .where(and(...conditions))

    return c.json({ data: items, total: count, limit, offset })
  }
)

// GET /closet/:id
closetRoutes.get('/:id', async (c) => {
  const { userId } = c.get('user')
  const { id } = c.req.param()

  const [item] = await db
    .select()
    .from(clothingItems)
    .where(and(eq(clothingItems.id, id), eq(clothingItems.userId, userId)))
    .limit(1)

  if (!item) {
    return c.json({ error: 'Not found', code: 'NOT_FOUND', statusCode: 404 }, 404)
  }
  return c.json({ data: item })
})

// POST /closet
closetRoutes.post(
  '/',
  zValidator(
    'json',
    z.object({
      imageUrl: z.string().url().refine(isAllowedImageUrl, {
        message: 'imageUrl must be from an allowed storage domain',
      }),
      category: categoryEnum.optional(),
      colors: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      brand: z.string().optional(),
    })
  ),
  async (c) => {
    const { userId } = c.get('user')
    const input = c.req.valid('json')

    const [item] = await db
      .insert(clothingItems)
      .values({ userId, ...input })
      .returning()

    // Trigger AI tagging asynchronously — does not block the response
    enqueueTagging(item.id, item.imageUrl)

    return c.json({ data: item }, 201)
  }
)

// PATCH /closet/:id
closetRoutes.patch(
  '/:id',
  zValidator(
    'json',
    z.object({
      category: categoryEnum.optional(),
      colors: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      brand: z.string().optional(),
    })
  ),
  async (c) => {
    const { userId } = c.get('user')
    const { id } = c.req.param()
    const updates = c.req.valid('json')

    const [existing] = await db
      .select()
      .from(clothingItems)
      .where(and(eq(clothingItems.id, id), eq(clothingItems.userId, userId)))
      .limit(1)

    if (!existing) {
      return c.json({ error: 'Not found', code: 'NOT_FOUND', statusCode: 404 }, 404)
    }

    const [updated] = await db
      .update(clothingItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(clothingItems.id, id), eq(clothingItems.userId, userId)))
      .returning()

    return c.json({ data: updated })
  }
)

// DELETE /closet/:id
closetRoutes.delete('/:id', async (c) => {
  const { userId } = c.get('user')
  const { id } = c.req.param()

  const [deleted] = await db
    .delete(clothingItems)
    .where(and(eq(clothingItems.id, id), eq(clothingItems.userId, userId)))
    .returning()

  if (!deleted) {
    return c.json({ error: 'Not found', code: 'NOT_FOUND', statusCode: 404 }, 404)
  }
  return c.json({ data: deleted })
})
