export interface Product {
  id: string
  name: string
  brand: string
  imageUrl: string
  price: number
  currency: string
  productUrl: string
  category: string
  color?: string[]
  source: 'rakuten' | 'yahoo_shopping' | 'other'
}
