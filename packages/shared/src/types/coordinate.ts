import type { ClothingItem } from './closet'
import type { Product } from './product'

export interface Coordinate {
  id: string
  userId: string
  inspirationImageUrl: string
  inspirationSource?: 'fashion_show' | 'magazine' | 'influencer' | 'other'
  items: ClothingItem[]
  suggestedProducts: Product[]
  description: string
  styleNote: string
  isFavorite: boolean
  createdAt: string
}

export interface GenerateCoordinateInput {
  inspirationImageUrl: string
  inspirationSource?: Coordinate['inspirationSource']
}

export interface CoordinateProposal {
  items: ClothingItem[]
  missingCategories: string[]
  description: string
  styleNote: string
  matchScore: number
}
