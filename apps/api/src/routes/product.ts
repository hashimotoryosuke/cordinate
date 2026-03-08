import { Hono } from 'hono'
import { db } from '../db'
import { productSuggestions } from '../db/schema'
import { eq } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'

import type { AppEnv } from '../types'
export const productRoutes = new Hono<AppEnv>()

productRoutes.use('*', authMiddleware)

productRoutes.get('/coordinate/:coordinateId', async (c) => {
  const { coordinateId } = c.req.param()
  const products = await db
    .select()
    .from(productSuggestions)
    .where(eq(productSuggestions.coordinateId, coordinateId))
  return c.json({ data: products })
})
