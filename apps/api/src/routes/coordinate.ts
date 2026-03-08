import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../db'
import { coordinates, clothingItems, productSuggestions } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'

export const coordinateRoutes = new Hono()

coordinateRoutes.use('*', authMiddleware)

coordinateRoutes.get('/', async (c) => {
  const { userId } = c.get('user')
  const coords = await db.select().from(coordinates).where(eq(coordinates.userId, userId))
  return c.json({ data: coords })
})

coordinateRoutes.post(
  '/generate',
  zValidator(
    'json',
    z.object({
      inspirationImageUrl: z.string().url(),
      inspirationSource: z
        .enum(['fashion_show', 'magazine', 'influencer', 'other'])
        .optional(),
    })
  ),
  async (c) => {
    const { userId } = c.get('user')
    const { inspirationImageUrl, inspirationSource } = c.req.valid('json')

    // Fetch user's closet items
    const userItems = await db
      .select()
      .from(clothingItems)
      .where(eq(clothingItems.userId, userId))

    if (userItems.length === 0) {
      return c.json(
        { error: 'No items in closet', code: 'EMPTY_CLOSET', statusCode: 400 },
        400
      )
    }

    // TODO: Phase 2 — call AI service for coordinate generation
    // 1. Analyze inspirationImageUrl with Claude API (vision)
    // 2. Match closet items via CLIP embedding similarity (pgvector)
    // 3. Generate coordinate proposals and style notes

    // Stub response for Phase 0
    const [coord] = await db
      .insert(coordinates)
      .values({
        userId,
        inspirationImageUrl,
        inspirationSource,
        itemIds: [],
        description: 'AI coordinate generation coming in Phase 2',
        styleNote: '',
      })
      .returning()

    return c.json({ data: coord }, 202)
  }
)

coordinateRoutes.patch('/:id/favorite', async (c) => {
  const { userId } = c.get('user')
  const { id } = c.req.param()

  const [coord] = await db
    .select()
    .from(coordinates)
    .where(and(eq(coordinates.id, id), eq(coordinates.userId, userId)))
    .limit(1)

  if (!coord) {
    return c.json({ error: 'Not found', code: 'NOT_FOUND', statusCode: 404 }, 404)
  }

  const [updated] = await db
    .update(coordinates)
    .set({ isFavorite: !coord.isFavorite })
    .where(eq(coordinates.id, id))
    .returning()

  return c.json({ data: updated })
})
