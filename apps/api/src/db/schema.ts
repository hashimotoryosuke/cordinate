import { pgTable, uuid, text, timestamp, varchar, integer, real, index, boolean, jsonb } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// pgvector extension — enable with: CREATE EXTENSION IF NOT EXISTS vector;
// Using text for embedding storage; switch to vector(512) after pgvector is enabled
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  passwordHash: text('password_hash'),
  avatarUrl: text('avatar_url'),
  provider: varchar('provider', { length: 50 }).default('email'), // 'email' | 'google' | 'apple'
  providerId: text('provider_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const clothingItems = pgTable(
  'clothing_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    imageUrl: text('image_url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    category: varchar('category', { length: 50 }).notNull().default('other'),
    // ["#FFFFFF", "#000000"]
    colors: jsonb('colors').$type<string[]>().default([]),
    tags: jsonb('tags').$type<string[]>().default([]),
    brand: varchar('brand', { length: 100 }),
    // CLIP embedding — stored as float array; migrate to vector(512) with pgvector
    embedding: jsonb('embedding').$type<number[]>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [index('clothing_items_user_id_idx').on(t.userId)]
)

export const coordinates = pgTable(
  'coordinates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    inspirationImageUrl: text('inspiration_image_url').notNull(),
    inspirationSource: varchar('inspiration_source', { length: 50 }),
    // Array of clothing_item IDs in this coordinate
    itemIds: jsonb('item_ids').$type<string[]>().default([]),
    description: text('description'),
    styleNote: text('style_note'),
    matchScore: real('match_score'),
    isFavorite: boolean('is_favorite').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('coordinates_user_id_idx').on(t.userId)]
)

export const productSuggestions = pgTable(
  'product_suggestions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    coordinateId: uuid('coordinate_id')
      .notNull()
      .references(() => coordinates.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    brand: varchar('brand', { length: 100 }),
    imageUrl: text('image_url').notNull(),
    price: integer('price').notNull(), // in JPY
    productUrl: text('product_url').notNull(),
    category: varchar('category', { length: 50 }),
    source: varchar('source', { length: 50 }).notNull(), // 'rakuten' | 'yahoo_shopping'
    externalId: text('external_id'), // product ID from source API
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('product_suggestions_coordinate_id_idx').on(t.coordinateId)]
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type ClothingItem = typeof clothingItems.$inferSelect
export type NewClothingItem = typeof clothingItems.$inferInsert
export type Coordinate = typeof coordinates.$inferSelect
export type NewCoordinate = typeof coordinates.$inferInsert
export type ProductSuggestion = typeof productSuggestions.$inferSelect
export type NewProductSuggestion = typeof productSuggestions.$inferInsert
