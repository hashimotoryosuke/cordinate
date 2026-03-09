import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { z } from 'zod'
import { db } from '../db'
import { clothingItems, coordinateJobs } from '../db/schema'
import { eq } from 'drizzle-orm'
import { config } from '../config'

const proposalSchema = z.object({
  itemIds: z.array(z.string()),
  description: z.string(),
  matchScore: z.number().min(0).max(1),
  styleNote: z.string(),
})

const suggestionResponseSchema = z.object({
  styleAnalysis: z.string(),
  proposals: z.array(proposalSchema).length(3),
})

const SYSTEM_PROMPT = `あなたはプロのファッションスタイリストです。
ユーザーのインスピレーション画像を分析し、ユーザーのクローゼットにあるアイテムを使って3つのコーデ提案を作成してください。

必ず以下のJSON形式のみで返してください（他のテキストは不要です）：
{
  "styleAnalysis": "インスピレーション画像のスタイルの説明",
  "proposals": [
    {
      "itemIds": ["アイテムのuuid1", "アイテムのuuid2"],
      "description": "このコーデについての説明",
      "matchScore": 0.85,
      "styleNote": "なぜこのコーデが参考スタイルに合うか"
    }
  ]
}

ルール:
- proposals は必ず3つ
- itemIds にはユーザーのクローゼットに実際に存在するアイテムのIDのみ使用
- matchScore は0〜1の数値（インスピレーションとの一致度）
- 各提案は異なるアイテムの組み合わせを使用
- 説明はすべて日本語で`

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

export async function suggestCoordinates(
  jobId: string,
  inspirationImageUrl: string,
  userId: string
): Promise<void> {
  // SSRF prevention: only fetch from allowed hosts
  if (!isAllowedImageHost(inspirationImageUrl)) {
    console.warn(`[coordinate-suggester] Blocked disallowed host for job ${jobId}: ${inspirationImageUrl}`)
    await db
      .update(coordinateJobs)
      .set({ status: 'error', errorMessage: '画像のURLが許可されていないホストです', updatedAt: new Date() })
      .where(eq(coordinateJobs.id, jobId))
    return
  }

  // Mark job as processing
  await db
    .update(coordinateJobs)
    .set({ status: 'processing', updatedAt: new Date() })
    .where(eq(coordinateJobs.id, jobId))

  try {
    // Fetch inspiration image
    const imageRes = await fetch(inspirationImageUrl)
    if (!imageRes.ok) throw new Error(`Failed to fetch inspiration image: ${imageRes.status}`)

    const imageBuffer = await imageRes.arrayBuffer()
    const base64 = Buffer.from(imageBuffer).toString('base64')
    const mediaType = (imageRes.headers.get('content-type') ?? 'image/jpeg') as
      | 'image/jpeg'
      | 'image/png'
      | 'image/webp'
      | 'image/gif'

    // Fetch user's closet items
    const userItems = await db
      .select()
      .from(clothingItems)
      .where(eq(clothingItems.userId, userId))

    if (userItems.length < 3) {
      await db
        .update(coordinateJobs)
        .set({ status: 'error', errorMessage: 'クローゼットにアイテムが少なすぎます', updatedAt: new Date() })
        .where(eq(coordinateJobs.id, jobId))
      return
    }

    // Build text summary of closet items
    const closetSummary = userItems
      .map(
        (item) =>
          `ID: ${item.id} | カテゴリ: ${item.category} | 色: ${(item.colors ?? []).join(',')} | タグ: ${(item.tags ?? []).join(',')} | ブランド: ${item.brand || '不明'}`
      )
      .join('\n')

    const userText = `以下がユーザーのクローゼットにあるアイテム一覧です:\n${closetSummary}\n\nこれらのアイテムを使って、インスピレーション画像のスタイルに合った3つのコーデを提案してください。`

    const { text } = await generateText({
      model: anthropic('claude-opus-4-6'),
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', image: base64, mimeType: mediaType },
            { type: 'text', text: userText },
          ],
        },
      ],
      maxTokens: 1024,
    })

    const parsed = suggestionResponseSchema.safeParse(JSON.parse(text.trim()))
    if (!parsed.success) {
      console.error(`[coordinate-suggester] Invalid response for job ${jobId}:`, parsed.error.issues)
      await db
        .update(coordinateJobs)
        .set({ status: 'error', errorMessage: 'AIの応答の解析に失敗しました', updatedAt: new Date() })
        .where(eq(coordinateJobs.id, jobId))
      return
    }

    const suggestions = parsed.data.proposals.map((p) => ({
      itemIds: p.itemIds,
      description: p.description,
      matchScore: p.matchScore,
      styleNote: p.styleNote,
    }))

    await db
      .update(coordinateJobs)
      .set({ status: 'done', suggestions, updatedAt: new Date() })
      .where(eq(coordinateJobs.id, jobId))
  } catch (err) {
    console.error(`[coordinate-suggester] Failed for job ${jobId}:`, err)
    await db
      .update(coordinateJobs)
      .set({
        status: 'error',
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
        updatedAt: new Date(),
      })
      .where(eq(coordinateJobs.id, jobId))
  }
}

// Simple in-process async queue (same pattern as ai-tagger.ts)
// TODO: Replace with BullMQ / pg-boss in production for persistence and retry
const queue: Array<{ jobId: string; inspirationImageUrl: string; userId: string }> = []
let processing = false

export function enqueueCoordinateSuggestion(
  jobId: string,
  inspirationImageUrl: string,
  userId: string
): void {
  if (!config.anthropicApiKey) {
    console.warn('[coordinate-suggester] ANTHROPIC_API_KEY not set — skipping coordinate suggestion')
    return
  }
  queue.push({ jobId, inspirationImageUrl, userId })
  if (!processing) processQueue()
}

async function processQueue() {
  processing = true
  while (queue.length > 0) {
    const job = queue.shift()!
    await suggestCoordinates(job.jobId, job.inspirationImageUrl, job.userId)
  }
  processing = false
}
