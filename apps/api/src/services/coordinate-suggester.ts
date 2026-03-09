import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { z } from 'zod'
import { db } from '../db'
import { clothingItems, coordinateJobs, inspirations } from '../db/schema'
import { eq } from 'drizzle-orm'
import { config } from '../config'

// --- SSRF prevention via IP blocklist ---
// Allowlist (allowedImageHosts) is for storage URLs; inspiration images can come from
// any external URL, so we use a blocklist of private/internal IP ranges instead.

const PRIVATE_IP_RE = [
  /^127\./,                                         // IPv4 loopback
  /^10\./,                                          // RFC 1918 class A
  /^192\.168\./,                                    // RFC 1918 class C
  /^172\.(1[6-9]|2\d|3[01])\./,                    // RFC 1918 class B
  /^169\.254\./,                                    // link-local (incl. AWS/GCP metadata)
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,     // CGNAT RFC 6598
  /^0\./,                                           // non-routable
  /^::1$/,                                          // IPv6 loopback
  /^fc00:/i,                                        // IPv6 unique-local
  /^fd[0-9a-f]{2}:/i,                              // IPv6 unique-local
]
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata',
  'ip6-localhost',
  '169.254.169.254', // AWS/GCP/Azure instance metadata
])

export function isExternalUrl(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url)
    if (protocol !== 'http:' && protocol !== 'https:') return false
    if (BLOCKED_HOSTNAMES.has(hostname.toLowerCase())) return false
    if (PRIVATE_IP_RE.some((re) => re.test(hostname))) return false
    return true
  } catch {
    return false
  }
}

// --- Zod schema ---

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

const MAX_IMAGE_BYTES = 10 * 1024 * 1024  // 10 MB
const MAX_CLOSET_ITEMS = 50               // keep Claude prompt bounded

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
- itemIds にはユーザーのクローゼットに実際に存在するアイテムのIDのみ使用すること
- matchScore は0〜1の数値（インスピレーションとの一致度）
- 各提案は異なるアイテムの組み合わせを使用
- 説明はすべて日本語で`

export async function suggestCoordinates(
  jobId: string,
  inspirationId: string,
  inspirationImageUrl: string,
  userId: string
): Promise<void> {
  // SSRF prevention: block private/internal IPs
  if (!isExternalUrl(inspirationImageUrl)) {
    console.warn(`[coordinate-suggester] Blocked internal host for job ${jobId}: ${inspirationImageUrl}`)
    await db.update(coordinateJobs)
      .set({ status: 'error', errorMessage: '画像のURLが許可されていないアドレスです', updatedAt: new Date() })
      .where(eq(coordinateJobs.id, jobId))
    return
  }

  await db.update(coordinateJobs)
    .set({ status: 'processing', updatedAt: new Date() })
    .where(eq(coordinateJobs.id, jobId))

  try {
    // Fetch inspiration image with size guard
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    let imageRes: Response
    try {
      imageRes = await fetch(inspirationImageUrl, { signal: controller.signal })
    } finally {
      clearTimeout(timeout)
    }
    if (!imageRes.ok) throw new Error(`画像の取得に失敗しました (HTTP ${imageRes.status})`)

    const contentLength = Number(imageRes.headers.get('content-length') ?? 0)
    if (contentLength > MAX_IMAGE_BYTES) throw new Error('画像ファイルが大きすぎます（最大10MB）')

    const imageBuffer = await imageRes.arrayBuffer()
    if (imageBuffer.byteLength > MAX_IMAGE_BYTES) throw new Error('画像ファイルが大きすぎます（最大10MB）')

    const base64 = Buffer.from(imageBuffer).toString('base64')
    const rawType = imageRes.headers.get('content-type') ?? 'image/jpeg'
    const mediaType = (['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const).includes(
      rawType as 'image/jpeg'
    )
      ? (rawType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif')
      : 'image/jpeg'

    // Fetch user's closet items (bounded at DB level)
    const userItems = await db
      .select()
      .from(clothingItems)
      .where(eq(clothingItems.userId, userId))
      .limit(MAX_CLOSET_ITEMS)

    if (userItems.length < 3) {
      await db.update(coordinateJobs)
        .set({ status: 'error', errorMessage: 'クローゼットにアイテムが少なすぎます（3件以上必要です）', updatedAt: new Date() })
        .where(eq(coordinateJobs.id, jobId))
      // [R2-2] Also update inspiration status
      await db.update(inspirations)
        .set({ status: 'error' })
        .where(eq(inspirations.id, inspirationId))
      return
    }

    // Build a lookup set for IDOR validation later
    const validItemIds = new Set(userItems.map((i) => i.id))

    const closetSummary = userItems
      .map(
        (item) =>
          `ID: ${item.id} | カテゴリ: ${item.category} | 色: ${(item.colors ?? []).join(',')} | タグ: ${(item.tags ?? []).join(',')} | ブランド: ${item.brand ?? '不明'}`
      )
      .join('\n')

    const userText = `以下がユーザーのクローゼットにあるアイテム一覧です（${userItems.length}件）:\n${closetSummary}\n\nこれらのアイテムを使って、インスピレーション画像のスタイルに合った3つのコーデを提案してください。`

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

    let parsed: ReturnType<typeof suggestionResponseSchema.safeParse>
    try {
      parsed = suggestionResponseSchema.safeParse(JSON.parse(text.trim()))
    } catch {
      throw new Error('AIの応答がJSON形式ではありませんでした')
    }

    if (!parsed.success) {
      console.error(`[coordinate-suggester] Invalid response for job ${jobId}:`, parsed.error.issues)
      throw new Error('AIの応答の形式が不正でした')
    }

    // [C-2] Validate itemIds — only keep IDs that actually exist in this user's closet
    const suggestions = parsed.data.proposals.map((p) => ({
      itemIds: p.itemIds.filter((id) => validItemIds.has(id)),
      description: p.description,
      matchScore: p.matchScore,
      styleNote: p.styleNote,
    }))

    await db.update(coordinateJobs)
      .set({ status: 'done', suggestions, updatedAt: new Date() })
      .where(eq(coordinateJobs.id, jobId))

    // [M-3] Update inspiration status
    await db.update(inspirations)
      .set({ status: 'done' })
      .where(eq(inspirations.id, inspirationId))
  } catch (err) {
    console.error(`[coordinate-suggester] Failed for job ${jobId}:`, err)
    await db.update(coordinateJobs)
      .set({
        status: 'error',
        errorMessage: err instanceof Error ? err.message : '予期せぬエラーが発生しました',
        updatedAt: new Date(),
      })
      .where(eq(coordinateJobs.id, jobId))
    await db.update(inspirations)
      .set({ status: 'error' })
      .where(eq(inspirations.id, inspirationId))
  }
}

// Simple in-process async queue (same pattern as ai-tagger.ts)
// TODO: Replace with BullMQ / pg-boss in production for persistence and retry
const queue: Array<{ jobId: string; inspirationId: string; inspirationImageUrl: string; userId: string }> = []
let processing = false

export async function enqueueCoordinateSuggestion(
  jobId: string,
  inspirationId: string,
  inspirationImageUrl: string,
  userId: string
): Promise<void> {
  if (!config.anthropicApiKey) {
    console.warn('[coordinate-suggester] ANTHROPIC_API_KEY not set — marking job as error')
    // [C-3] Mark job as error so frontend doesn't poll forever
    await db.update(coordinateJobs)
      .set({ status: 'error', errorMessage: 'AIサービスが設定されていません', updatedAt: new Date() })
      .where(eq(coordinateJobs.id, jobId))
    return
  }
  queue.push({ jobId, inspirationId, inspirationImageUrl, userId })
  if (!processing) processQueue()
}

async function processQueue() {
  processing = true
  while (queue.length > 0) {
    const job = queue.shift()!
    await suggestCoordinates(job.jobId, job.inspirationId, job.inspirationImageUrl, job.userId)
  }
  processing = false
}
