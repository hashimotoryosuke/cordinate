import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../db'
import { coordinates, clothingItems, productSuggestions } from '../db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'
import { searchProducts } from '../services/rakuten'

import type { AppEnv } from '../types'

export const productRoutes = new Hono<AppEnv>()
productRoutes.use('*', authMiddleware)

const ALL_CATEGORIES = ['tops', 'bottoms', 'outerwear', 'shoes', 'bag', 'accessory'] as const
type Category = typeof ALL_CATEGORIES[number]

// GET /products/coordinates/:coordinateId
// Returns missing-category product suggestions for a saved coordinate.
// Results are cached in productSuggestions table; re-fetched on explicit refresh.
productRoutes.get('/coordinates/:coordinateId', async (c) => {
  const { userId } = c.get('user')
  const { coordinateId } = c.req.param()

  // Verify ownership
  const [coord] = await db
    .select()
    .from(coordinates)
    .where(and(eq(coordinates.id, coordinateId), eq(coordinates.userId, userId)))
    .limit(1)

  if (!coord) {
    return c.json({ error: 'Not found', code: 'NOT_FOUND', statusCode: 404 }, 404)
  }

  // Return cached products if available
  const cached = await db
    .select()
    .from(productSuggestions)
    .where(eq(productSuggestions.coordinateId, coordinateId))

  if (cached.length > 0) {
    const missingCategories = [...new Set(cached.map((p) => p.category).filter(Boolean))] as string[]
    return c.json({ data: { missingCategories, products: cached } })
  }

  // Detect missing categories
  const itemIds = (coord.itemIds ?? []) as string[]
  const usedCategories = new Set<string>()

  if (itemIds.length > 0) {
    const items = await db
      .select({ category: clothingItems.category })
      .from(clothingItems)
      .where(inArray(clothingItems.id, itemIds))
    items.forEach((i) => usedCategories.add(i.category))
  }

  const missingCategories = ALL_CATEGORIES.filter(
    (cat): cat is Category => !usedCategories.has(cat)
  )

  if (missingCategories.length === 0) {
    return c.json({ data: { missingCategories: [], products: [] } })
  }

  // Fetch products for each missing category (in parallel, max 3 categories)
  const targetCategories = missingCategories.slice(0, 3)
  const results = await Promise.all(targetCategories.map((cat) => searchProducts(cat)))

  // Flatten and cache in DB
  const allProducts = results.flat()
  if (allProducts.length > 0) {
    await db.insert(productSuggestions).values(
      allProducts.map((p) => ({
        coordinateId,
        name: p.name,
        brand: p.brand,
        imageUrl: p.imageUrl,
        price: p.price,
        productUrl: p.productUrl,
        category: p.category,
        source: p.source,
        externalId: p.externalId,
      }))
    )
  }

  const saved = await db
    .select()
    .from(productSuggestions)
    .where(eq(productSuggestions.coordinateId, coordinateId))

  return c.json({ data: { missingCategories: targetCategories, products: saved } })
})

// GET /products/search?category=&keyword=&minPrice=&maxPrice=
productRoutes.get(
  '/search',
  zValidator(
    'query',
    z.object({
      category: z.string().optional(),
      keyword: z.string().optional(),
    })
  ),
  async (c) => {
    const { category } = c.req.valid('query')
    const products = await searchProducts(category ?? 'tops')
    return c.json({ data: products })
  }
)
