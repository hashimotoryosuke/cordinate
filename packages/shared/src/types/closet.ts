export type ClothingCategory =
  | 'tops'
  | 'bottoms'
  | 'outerwear'
  | 'shoes'
  | 'bag'
  | 'accessory'
  | 'other'

export interface ClothingItem {
  id: string
  userId: string
  imageUrl: string
  thumbnailUrl?: string
  category: ClothingCategory
  color: string[]
  tags: string[]
  brand?: string
  /** CLIP embedding vector (stored in pgvector) */
  embedding?: number[]
  createdAt: string
  updatedAt: string
}

export interface CreateClothingItemInput {
  imageUrl: string
  category?: ClothingCategory
  color?: string[]
  tags?: string[]
  brand?: string
}
