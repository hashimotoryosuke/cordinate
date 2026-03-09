import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { z } from 'zod'
import { db } from '../db'
import { clothingItems } from '../db/schema'
import { eq } from 'drizzle-orm'
import { config } from '../config'

const taggingResultSchema = z.object({
  category: z.enum(['tops', 'bottoms', 'outerwear', 'shoes', 'bag', 'accessory', 'other']),
  colors: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).min(1).max(5),
  tags: z.array(z.string().max(30)).min(1).max(8),
  brand: z.string().max(100).nullable(),
})

type TaggingResult = z.infer<typeof taggingResultSchema>

const SYSTEM_PROMPT = `あなたはファッションの専門家です。
服の画像を分析し、必ず以下の JSON 形式のみで返してください（他のテキストは不要）：
{
  "category": "tops|bottoms|outerwear|shoes|bag|accessory|other",
  "colors": ["#hex1", "#hex2"],
  "tags": ["タグ1", "タグ2"],
  "brand": "ブランド名 or null"
}
category の定義:
- tops: Tシャツ・シャツ・ニット・ブラウス等
- bottoms: パンツ・スカート・ショーツ等
- outerwear: コート・ジャケット・カーディガン等
- shoes: スニーカー・パンプス・ブーツ等
- bag: バッグ・リュック・クラッチ等
- accessory: 帽子・スカーフ・ベルト・ジュエリー等
- other: 上記に当てはまらないもの
tags には素材感・柄・シルエット・スタイルなど3〜5個を日本語で指定してください。`

function isAllowedImageHost(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return config.allowedImageHosts.some(
      (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
    )
  } catch {
    return false
  }
}

export async function tagClothingItem(itemId: string, imageUrl: string): Promise<void> {
  // SSRF prevention: only fetch from allowed hosts
  if (!isAllowedImageHost(imageUrl)) {
    console.warn(`[ai-tagger] Blocked disallowed host for item ${itemId}: ${imageUrl}`)
    return
  }

  try {
    const imageRes = await fetch(imageUrl)
    if (!imageRes.ok) throw new Error(`Failed to fetch image: ${imageRes.status}`)

    const imageBuffer = await imageRes.arrayBuffer()
    const base64 = Buffer.from(imageBuffer).toString('base64')
    const mediaType = (imageRes.headers.get('content-type') ?? 'image/jpeg') as
      | 'image/jpeg'
      | 'image/png'
      | 'image/webp'
      | 'image/gif'

    const { text } = await generateText({
      model: anthropic('claude-opus-4-6'),
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', image: base64, mimeType: mediaType },
            { type: 'text', text: 'この服を分析してください。' },
          ],
        },
      ],
      maxTokens: 256,
    })

    const parsed = taggingResultSchema.safeParse(JSON.parse(text.trim()))
    if (!parsed.success) {
      console.error(`[ai-tagger] Invalid tagging result for item ${itemId}:`, parsed.error.issues)
      return
    }

    const result: TaggingResult = parsed.data
    await db
      .update(clothingItems)
      .set({
        category: result.category,
        colors: result.colors,
        tags: result.tags,
        brand: result.brand ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(clothingItems.id, itemId))
  } catch (err) {
    console.error(`[ai-tagger] Failed to tag item ${itemId}:`, err)
    // Non-fatal: item remains with default category; can be retried manually
  }
}

// Simple in-process async queue (Phase 1)
// TODO: Replace with BullMQ / pg-boss in production for persistence and retry
const queue: Array<{ itemId: string; imageUrl: string }> = []
let processing = false

export function enqueueTagging(itemId: string, imageUrl: string): void {
  if (!config.anthropicApiKey) {
    console.warn('[ai-tagger] ANTHROPIC_API_KEY not set — skipping tagging')
    return
  }
  queue.push({ itemId, imageUrl })
  if (!processing) processQueue()
}

async function processQueue() {
  processing = true
  while (queue.length > 0) {
    const job = queue.shift()!
    await tagClothingItem(job.itemId, job.imageUrl)
  }
  processing = false
}
