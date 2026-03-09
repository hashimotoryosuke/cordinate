import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../db'
import { coordinates, inspirations, coordinateJobs, clothingItems } from '../db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'
import { enqueueCoordinateSuggestion, isExternalUrl } from '../services/coordinate-suggester'

import type { AppEnv } from '../types'

export const coordinateRoutes = new Hono<AppEnv>()

coordinateRoutes.use('*', authMiddleware)

// POST /coordinates/inspire — submit inspiration image URL, create async job
coordinateRoutes.post(
  '/inspire',
  zValidator(
    'json',
    z.object({
      // [C-1] Use IP-blocklist validation (isExternalUrl) instead of allowlist,
      // so users can paste external web URLs (Instagram, Pinterest, etc.)
      imageUrl: z
        .string()
        .url()
        .refine(isExternalUrl, {
          message: 'imageUrl must be a publicly accessible URL (private/internal addresses are not allowed)',
        }),
    })
  ),
  async (c) => {
    const { userId } = c.get('user')
    const { imageUrl } = c.req.valid('json')

    // [M-2] Wrap two inserts in a transaction to avoid orphan records
    const { job, inspiration } = await db.transaction(async (tx) => {
      const [ins] = await tx
        .insert(inspirations)
        .values({ userId, imageUrl, status: 'pending' })
        .returning()

      const [j] = await tx
        .insert(coordinateJobs)
        .values({ userId, inspirationId: ins.id, status: 'pending' })
        .returning()

      return { job: j, inspiration: ins }
    })

    // Enqueue outside transaction (async, non-fatal if it fails)
    await enqueueCoordinateSuggestion(job.id, inspiration.id, imageUrl, userId)

    return c.json({ data: { jobId: job.id, inspirationId: inspiration.id } }, 202)
  }
)

// GET /coordinates/jobs/:jobId — poll job status
coordinateRoutes.get('/jobs/:jobId', async (c) => {
  const { userId } = c.get('user')
  const { jobId } = c.req.param()

  const [job] = await db
    .select()
    .from(coordinateJobs)
    .where(and(eq(coordinateJobs.id, jobId), eq(coordinateJobs.userId, userId)))
    .limit(1)

  if (!job) {
    return c.json({ error: 'Not found', code: 'NOT_FOUND', statusCode: 404 }, 404)
  }

  return c.json({
    data: {
      id: job.id,
      status: job.status,
      suggestions: job.suggestions ?? undefined,
      errorMessage: job.errorMessage ?? undefined,
    },
  })
})

// POST /coordinates — save a selected coordinate proposal
coordinateRoutes.post(
  '/',
  zValidator(
    'json',
    z.object({
      inspirationImageUrl: z.string().url(),
      itemIds: z.array(z.string().uuid()).min(1),
      description: z.string().min(1),
      styleNote: z.string().optional(),
      matchScore: z.number().min(0).max(1).optional(),
    })
  ),
  async (c) => {
    const { userId } = c.get('user')
    const { inspirationImageUrl, itemIds, description, styleNote, matchScore } = c.req.valid('json')

    // [C-2] Verify all itemIds belong to this user (prevent IDOR)
    if (itemIds.length > 0) {
      const ownedItems = await db
        .select({ id: clothingItems.id })
        .from(clothingItems)
        .where(and(eq(clothingItems.userId, userId), inArray(clothingItems.id, itemIds)))

      const ownedIds = new Set(ownedItems.map((i) => i.id))
      const invalid = itemIds.filter((id) => !ownedIds.has(id))
      if (invalid.length > 0) {
        return c.json(
          { error: 'One or more itemIds do not exist in your closet', code: 'INVALID_ITEM_IDS', statusCode: 422 },
          422
        )
      }
    }

    const [coord] = await db
      .insert(coordinates)
      .values({ userId, inspirationImageUrl, itemIds, description, styleNote, matchScore })
      .returning()

    return c.json({ data: coord }, 201)
  }
)

// GET /coordinates/:id — get single coordinate by id
coordinateRoutes.get('/:id', async (c) => {
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

  return c.json({ data: coord })
})

// GET /coordinates — list user's saved coordinates
coordinateRoutes.get(
  '/',
  zValidator('query', z.object({
    limit: z.coerce.number().min(1).max(100).default(50),
    offset: z.coerce.number().min(0).default(0),
  })),
  async (c) => {
    const { userId } = c.get('user')
    const { limit, offset } = c.req.valid('query')

    const coords = await db
      .select()
      .from(coordinates)
      .where(eq(coordinates.userId, userId))
      .limit(limit)
      .offset(offset)

    return c.json({ data: coords })
  }
)

// DELETE /coordinates/:id
coordinateRoutes.delete('/:id', async (c) => {
  const { userId } = c.get('user')
  const { id } = c.req.param()

  const [deleted] = await db
    .delete(coordinates)
    .where(and(eq(coordinates.id, id), eq(coordinates.userId, userId)))
    .returning()

  if (!deleted) {
    return c.json({ error: 'Not found', code: 'NOT_FOUND', statusCode: 404 }, 404)
  }

  return c.json({ data: deleted })
})

// PATCH /coordinates/:id/favorite — toggle isFavorite
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
    .where(and(eq(coordinates.id, id), eq(coordinates.userId, userId)))
    .returning()

  return c.json({ data: updated })
})
