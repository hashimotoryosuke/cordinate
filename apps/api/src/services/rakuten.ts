import { config } from '../config'

export interface RakutenProduct {
  externalId: string
  name: string
  brand: string | null
  imageUrl: string
  price: number       // JPY
  productUrl: string
  category: string
  source: 'rakuten'
}

// Map internal category names to Rakuten search keywords
const CATEGORY_KEYWORDS: Record<string, string> = {
  tops:      'トップス レディース',
  bottoms:   'ボトムス スカート パンツ レディース',
  outerwear: 'アウター コート ジャケット レディース',
  shoes:     'シューズ スニーカー パンプス レディース',
  bag:       'バッグ レディース',
  accessory: 'アクセサリー レディース',
  other:     'ファッション レディース',
}

const RAKUTEN_SEARCH_URL = 'https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706'
const PRODUCTS_PER_CATEGORY = 4

// --- Mock data for dev/test (no API key) ---

const MOCK_PRODUCTS: Record<string, RakutenProduct[]> = {
  tops: [
    { externalId: 'mock-tops-1', name: 'オーバーサイズTシャツ', brand: 'UNIQLO', imageUrl: 'https://placehold.co/400x400/f5f5f5/888?text=Tops', price: 1990, productUrl: 'https://www.rakuten.co.jp', category: 'tops', source: 'rakuten' },
    { externalId: 'mock-tops-2', name: 'リネンシャツ', brand: 'GU', imageUrl: 'https://placehold.co/400x400/f5f5f5/888?text=Shirt', price: 2490, productUrl: 'https://www.rakuten.co.jp', category: 'tops', source: 'rakuten' },
    { externalId: 'mock-tops-3', name: 'ニットセーター', brand: 'Zara', imageUrl: 'https://placehold.co/400x400/f5f5f5/888?text=Knit', price: 4990, productUrl: 'https://www.rakuten.co.jp', category: 'tops', source: 'rakuten' },
    { externalId: 'mock-tops-4', name: 'ストライプブラウス', brand: 'H&M', imageUrl: 'https://placehold.co/400x400/f5f5f5/888?text=Blouse', price: 3490, productUrl: 'https://www.rakuten.co.jp', category: 'tops', source: 'rakuten' },
  ],
  bottoms: [
    { externalId: 'mock-bottoms-1', name: 'ハイウエストデニム', brand: 'LEVI\'S', imageUrl: 'https://placehold.co/400x400/e8e8ff/888?text=Denim', price: 8990, productUrl: 'https://www.rakuten.co.jp', category: 'bottoms', source: 'rakuten' },
    { externalId: 'mock-bottoms-2', name: 'フレアスカート', brand: 'GU', imageUrl: 'https://placehold.co/400x400/e8e8ff/888?text=Skirt', price: 2990, productUrl: 'https://www.rakuten.co.jp', category: 'bottoms', source: 'rakuten' },
    { externalId: 'mock-bottoms-3', name: 'ワイドパンツ', brand: 'UNIQLO', imageUrl: 'https://placehold.co/400x400/e8e8ff/888?text=Pants', price: 3990, productUrl: 'https://www.rakuten.co.jp', category: 'bottoms', source: 'rakuten' },
    { externalId: 'mock-bottoms-4', name: 'プリーツスカート', brand: 'Zara', imageUrl: 'https://placehold.co/400x400/e8e8ff/888?text=Pleats', price: 5990, productUrl: 'https://www.rakuten.co.jp', category: 'bottoms', source: 'rakuten' },
  ],
  outerwear: [
    { externalId: 'mock-outer-1', name: 'チェスターコート', brand: 'UNIQLO', imageUrl: 'https://placehold.co/400x400/ffe8e8/888?text=Coat', price: 12900, productUrl: 'https://www.rakuten.co.jp', category: 'outerwear', source: 'rakuten' },
    { externalId: 'mock-outer-2', name: 'デニムジャケット', brand: 'GU', imageUrl: 'https://placehold.co/400x400/ffe8e8/888?text=Jacket', price: 4990, productUrl: 'https://www.rakuten.co.jp', category: 'outerwear', source: 'rakuten' },
    { externalId: 'mock-outer-3', name: 'トレンチコート', brand: 'Burberry', imageUrl: 'https://placehold.co/400x400/ffe8e8/888?text=Trench', price: 45000, productUrl: 'https://www.rakuten.co.jp', category: 'outerwear', source: 'rakuten' },
    { externalId: 'mock-outer-4', name: 'ブルゾン', brand: 'H&M', imageUrl: 'https://placehold.co/400x400/ffe8e8/888?text=Blouson', price: 6990, productUrl: 'https://www.rakuten.co.jp', category: 'outerwear', source: 'rakuten' },
  ],
  shoes: [
    { externalId: 'mock-shoes-1', name: 'レザーローファー', brand: 'DIANA', imageUrl: 'https://placehold.co/400x400/e8ffe8/888?text=Loafer', price: 11000, productUrl: 'https://www.rakuten.co.jp', category: 'shoes', source: 'rakuten' },
    { externalId: 'mock-shoes-2', name: 'ホワイトスニーカー', brand: 'adidas', imageUrl: 'https://placehold.co/400x400/e8ffe8/888?text=Sneaker', price: 9900, productUrl: 'https://www.rakuten.co.jp', category: 'shoes', source: 'rakuten' },
    { externalId: 'mock-shoes-3', name: 'ストラップサンダル', brand: 'ZARA', imageUrl: 'https://placehold.co/400x400/e8ffe8/888?text=Sandal', price: 5990, productUrl: 'https://www.rakuten.co.jp', category: 'shoes', source: 'rakuten' },
    { externalId: 'mock-shoes-4', name: 'アンクルブーツ', brand: 'UNITED ARROWS', imageUrl: 'https://placehold.co/400x400/e8ffe8/888?text=Boots', price: 18000, productUrl: 'https://www.rakuten.co.jp', category: 'shoes', source: 'rakuten' },
  ],
  bag: [
    { externalId: 'mock-bag-1', name: 'ミニショルダーバッグ', brand: 'ZARA', imageUrl: 'https://placehold.co/400x400/fff8e8/888?text=Shoulder', price: 4990, productUrl: 'https://www.rakuten.co.jp', category: 'bag', source: 'rakuten' },
    { externalId: 'mock-bag-2', name: 'トートバッグ', brand: 'DEAN&DELUCA', imageUrl: 'https://placehold.co/400x400/fff8e8/888?text=Tote', price: 3990, productUrl: 'https://www.rakuten.co.jp', category: 'bag', source: 'rakuten' },
    { externalId: 'mock-bag-3', name: 'チェーンバッグ', brand: 'H&M', imageUrl: 'https://placehold.co/400x400/fff8e8/888?text=Chain', price: 6990, productUrl: 'https://www.rakuten.co.jp', category: 'bag', source: 'rakuten' },
  ],
  accessory: [
    { externalId: 'mock-acc-1', name: 'ゴールドネックレス', brand: 'VENDOME', imageUrl: 'https://placehold.co/400x400/f8f0ff/888?text=Necklace', price: 3990, productUrl: 'https://www.rakuten.co.jp', category: 'accessory', source: 'rakuten' },
    { externalId: 'mock-acc-2', name: 'レザーベルト', brand: 'UNIQLO', imageUrl: 'https://placehold.co/400x400/f8f0ff/888?text=Belt', price: 2490, productUrl: 'https://www.rakuten.co.jp', category: 'accessory', source: 'rakuten' },
    { externalId: 'mock-acc-3', name: 'ウールベレー帽', brand: 'GU', imageUrl: 'https://placehold.co/400x400/f8f0ff/888?text=Hat', price: 1490, productUrl: 'https://www.rakuten.co.jp', category: 'accessory', source: 'rakuten' },
  ],
}

interface RakutenApiItem {
  itemCode: string
  itemName: string
  shopName: string
  mediumImageUrls: Array<{ imageUrl: string }>
  itemPrice: number
  itemUrl: string
}

interface RakutenApiResponse {
  Items: Array<{ Item: RakutenApiItem }>
}

export async function searchProducts(category: string): Promise<RakutenProduct[]> {
  // Fall back to mock data if no API key configured
  if (!config.rakutenAppId) {
    console.info(`[rakuten] No RAKUTEN_APP_ID — returning mock data for category: ${category}`)
    return (MOCK_PRODUCTS[category] ?? MOCK_PRODUCTS.tops).slice(0, PRODUCTS_PER_CATEGORY)
  }

  const keyword = CATEGORY_KEYWORDS[category] ?? CATEGORY_KEYWORDS.other
  const params = new URLSearchParams({
    applicationId: config.rakutenAppId,
    keyword,
    hits: String(PRODUCTS_PER_CATEGORY),
    sort: '-reviewCount',     // popular items first
    imageFlag: '1',           // only items with images
    // formatVersion omitted — use default v1 format: Items[].Item (uppercase)
    // formatVersion=2 changes to Items[].item (lowercase) which breaks the type mapping
  })

  try {
    const res = await fetch(`${RAKUTEN_SEARCH_URL}?${params}`, {
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) throw new Error(`Rakuten API error: ${res.status}`)

    const json = await res.json() as RakutenApiResponse

    return (json.Items ?? []).map((entry) => {
      const item = entry.Item
      return {
        externalId: item.itemCode,
        name: item.itemName.slice(0, 200),
        brand: item.shopName || null,
        imageUrl: item.mediumImageUrls[0]?.imageUrl ?? '',
        price: item.itemPrice,
        productUrl: item.itemUrl,
        category,
        source: 'rakuten' as const,
      }
    }).filter((p) => p.imageUrl)
  } catch (err) {
    console.error(`[rakuten] Search failed for category ${category}:`, err)
    // Graceful degradation: return mock data on API failure
    return (MOCK_PRODUCTS[category] ?? MOCK_PRODUCTS.tops).slice(0, PRODUCTS_PER_CATEGORY)
  }
}
