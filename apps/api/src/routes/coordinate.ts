import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../db'
import { coordinates, inspirations, coordinateJobs } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'
import { enqueueCoordinateSuggestion } from '../services/coordinate-suggester'
import { config } from '../config'

import type { AppEnv } from '../types'

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

export const coordinateRoutes = new Hono<AppEnv>()

coordinateRoutes.use('*', authMiddleware)

// POST /coordinates/inspire — submit inspiration image, create job
coordinateRoutes.post(
  '/inspire',
  zValidator(
    'json',
    z.object({
      imageUrl: z
        .string()
        .url()
        .refine(isAllowedImageUrl, {
          message: 'imageUrl must be from an allowed storage domain',
        }),
    })
  ),
  async (c) => {
    const { userId } = c.get('user')
    const { imageUrl } = c.req.valid('json')

    const [inspiration] = await db
      .insert(inspirations)
      .values({ userId, imageUrl, status: 'pending' })
      .returning()

    const [job] = await db
      .insert(coordinateJobs)
      .values({ userId, inspirationId: inspiration.id, status: 'pending' })
      .returning()

    enqueueCoordinateSuggestion(job.id, imageUrl, userId)

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

// POST /coordinates — save a coordinate
coordinateRoutes.post(
  '/',
  zValidator(
    'json',
    z.object({
      inspirationImageUrl: z.string().url(),
      itemIds: z.array(z.string()),
      description: z.string(),
      styleNote: z.string().optional(),
      matchScore: z.number().min(0).max(1).optional(),
    })
  ),
  async (c) => {
    const { userId } = c.get('user')
    const { inspirationImageUrl, itemIds, description, styleNote, matchScore } = c.req.valid('json')

    const [coord] = await db
      .insert(coordinates)
      .values({ userId, inspirationImageUrl, itemIds, description, styleNote, matchScore })
      .returning()

    return c.json({ data: coord }, 201)
  }
)

// GET /coordinates — list user's saved coordinates
coordinateRoutes.get('/', async (c) => {
  const { userId } = c.get('user')
  const coords = await db.select().from(coordinates).where(eq(coordinates.userId, userId))
  return c.json({ data: coords })
})

// DELETE /coordinates/:id — delete a coordinate
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
