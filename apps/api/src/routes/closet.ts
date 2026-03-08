import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../db'
import { clothingItems } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'

export const closetRoutes = new Hono()

closetRoutes.use('*', authMiddleware)

closetRoutes.get('/', async (c) => {
  const { userId } = c.get('user')
  const items = await db.select().from(clothingItems).where(eq(clothingItems.userId, userId))
  return c.json({ data: items })
})

closetRoutes.post(
  '/',
  zValidator(
    'json',
    z.object({
      imageUrl: z.string().url(),
      category: z
        .enum(['tops', 'bottoms', 'outerwear', 'shoes', 'bag', 'accessory', 'other'])
        .optional(),
      colors: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      brand: z.string().optional(),
    })
  ),
  async (c) => {
    const { userId } = c.get('user')
    const input = c.req.valid('json')

    // TODO: Phase 1 — trigger AI tagging job here (Claude API + CLIP)
    const [item] = await db
      .insert(clothingItems)
      .values({ userId, ...input })
      .returning()

    return c.json({ data: item }, 201)
  }
)

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
