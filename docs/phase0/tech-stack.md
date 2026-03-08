# 技術スタック確定（Phase 0）

> Issue: #1
> ステータス: 確定

## 採用スタック

| レイヤー | 採用技術 | 選定理由 |
|----------|----------|----------|
| **フロントエンド Web** | Next.js 15 (App Router) + TypeScript | Server Components で初期表示高速化。画像最適化が組み込み済み |
| **モバイル** | React Native (Expo SDK 53) + Expo Router | Web と型定義を共有できる。OTA アップデート対応 |
| **バックエンド API** | Hono + Node.js + TypeScript | 軽量・高速。型安全なルーティング。Web/Node.js 両対応で将来の CF Workers 移行も容易 |
| **DB** | PostgreSQL 17 + pgvector | CLIP 画像埋め込みのベクトル類似検索が pgvector で完結できる |
| **ORM** | Drizzle ORM | TypeScript ファーストで型安全。マイグレーション管理が簡単 |
| **画像ストレージ** | Cloudflare R2 | S3 互換 API。egress 無料。CDN 配信も簡単 |
| **AI 画像解析** | Claude API (claude-opus-4-6) Vision | 高精度な画像理解。アイテム分解・スタイル解析・コーデ提案文生成に使用 |
| **画像埋め込みベクトル** | CLIP (ViT-B/32, 512次元) | 画像の意味的類似度検索に最適。OSS で自前ホスト可能 |
| **認証** | Hono + JWT (jose) | シンプルに JWT で管理。将来 Supabase Auth に切り替え可能な設計 |
| **インフラ (Web)** | Vercel | Next.js との親和性最高。プレビューデプロイが便利 |
| **インフラ (API)** | Fly.io | コンテナ単位でのデプロイ。無料枠あり。日本リージョン対応 |
| **モノレポ** | Turborepo + pnpm workspace | ビルドキャッシュが効く。設定がシンプル |
| **CSS** | Tailwind CSS v4 | ユーティリティファーストで実装速度が高い |
| **商品データ** | 楽天市場 API（第一候補） | 豊富な商品数・アフィリエイト連携あり。申請が比較的容易 |

## 採用しなかった選択肢

| 技術 | 却下理由 |
|------|----------|
| FastAPI (Python) | Node.js に統一することで shared の型定義を最大活用できるため |
| AWS S3 | R2 の egress 無料・S3 互換 API で代替可能。コスト優位 |
| Supabase Auth | JWT の自前管理で MVP は十分。Auth.js は Next.js 専用で mobile と乖離する |
| GraphQL | MVP の規模では REST で十分。オーバーエンジニアリングを避ける |

## モノレポ構成

```
cordinate/
├── apps/
│   ├── web/        # Next.js 15 (Web フロントエンド)
│   ├── mobile/     # Expo SDK 53 (iOS / Android)
│   └── api/        # Hono + Node.js (バックエンド API)
├── packages/
│   ├── shared/     # 型定義・共通ユーティリティ
│   └── ui/         # デザイントークン (colors, typography, spacing)
├── docs/           # 設計ドキュメント
├── scripts/        # DB 初期化等のスクリプト
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```
