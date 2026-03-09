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

// Phase 2 types

export interface CoordinateProposalV2 {
  itemIds: string[]
  description: string
  matchScore: number
  styleNote: string
}

export interface CoordinateJob {
  id: string
  status: 'pending' | 'processing' | 'done' | 'error'
  suggestions?: CoordinateProposalV2[]
  errorMessage?: string
}
