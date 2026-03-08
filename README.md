# Cordinate

あなたの手持ち服でおしゃれなコーデを提案するファッション AI アプリ。

> ファッションショー・雑誌・インフルエンサーのコーデを参考に、AIがあなただけのコーディネートを提案します。

## ドキュメント

- [ロードマップ](./ROADMAP.md)
- [技術スタック](./docs/phase0/tech-stack.md)
- [AI/ML アプローチ](./docs/phase0/ai-ml-approach.md)
- [UI ワイヤーフレーム](./docs/phase0/wireframes.md)
- [外部 API 調査](./docs/phase0/api-research.md)

## リポジトリ構成

```
cordinate/
├── apps/
│   ├── web/        # Next.js 15 (Web フロントエンド)
│   ├── mobile/     # Expo SDK 53 (iOS / Android)
│   └── api/        # Hono + Node.js (バックエンド API)
├── packages/
│   ├── shared/     # 型定義・共通ユーティリティ
│   └── ui/         # デザイントークン
├── docs/           # 設計ドキュメント
└── scripts/        # DB 初期化スクリプト
```

## セットアップ

### 必要なツール

- Node.js >= 20
- pnpm >= 10
- Docker（ローカル DB 用）

### ローカル開発

```bash
# 依存関係インストール
pnpm install

# DB 起動 (PostgreSQL + pgvector)
docker compose up -d

# shared パッケージをビルド
pnpm --filter @cordinate/shared build

# 全アプリを開発モードで起動
pnpm dev
```

### 各アプリ個別起動

```bash
# Web (http://localhost:3000)
pnpm --filter @cordinate/web dev

# API (http://localhost:3001)
pnpm --filter @cordinate/api dev

# Mobile (Expo Dev Tools)
pnpm --filter @cordinate/mobile dev
```

### 環境変数

各 app の `.env.example` をコピーして `.env` を作成してください。

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### DB マイグレーション

```bash
pnpm --filter @cordinate/api db:generate
pnpm --filter @cordinate/api db:migrate
```

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| Web | Next.js 15 + TypeScript + Tailwind CSS v4 |
| Mobile | Expo SDK 53 + React Native |
| API | Hono + Node.js + TypeScript |
| DB | PostgreSQL 17 + pgvector + Drizzle ORM |
| AI | Claude API (claude-opus-4-6) + CLIP ViT-B/32 |
| Storage | Cloudflare R2 |
| Infra | Vercel (Web) + Fly.io (API) |
