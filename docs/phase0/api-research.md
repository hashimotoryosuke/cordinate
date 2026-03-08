# ファッション商品データ取得API 調査レポート

**作成日**: 2026-03-08
**目的**: ファッションコーディネートアプリ MVP における外部商品データ取得手段の選定

---

## 目次

1. [調査サマリー・推奨](#1-調査サマリー推奨)
2. [楽天市場 API（楽天ウェブサービス）](#2-楽天市場-api楽天ウェブサービス)
3. [Yahoo! ショッピング API](#3-yahoo-ショッピング-api)
4. [Amazon Product Advertising API（PA-API v5）](#4-amazon-product-advertising-api-pa-api-v5)
5. [ユニクロ 公開API](#5-ユニクロ-公開api)
6. [その他の選択肢](#6-その他の選択肢)
7. [比較表](#7-比較表)
8. [MVP実装方針の推奨](#8-mvp実装方針の推奨)

---

## 1. 調査サマリー・推奨

| 順位 | API | 推奨度 | 理由 |
|------|-----|--------|------|
| 1位 | 楽天市場 API | ◎ | 即日利用可能・無料・ファッション商品網羅性が高い |
| 2位 | Yahoo! ショッピング API | ○ | 即日利用可能・無料・レート制限が低め |
| 3位 | Amazon PA-API v5 | △ | 売上実績条件あり・審査に時間がかかる |
| 4位 | ユニクロ 公開API | × | 公式APIは非公開・利用不可 |

**MVP最速推奨: 楽天市場 API を第一優先、Yahoo! ショッピング API を補完として併用**

---

## 2. 楽天市場 API（楽天ウェブサービス）

### API名・提供元

- **API名**: 楽天市場商品検索API（Rakuten Ichiba Item Search API）
- **提供元**: 楽天グループ株式会社（Rakuten Developers / 楽天ウェブサービス）
- **公式サイト**: https://webservice.rakuten.co.jp/

### 利用申請方法・難易度

**難易度: 低（即日利用可能）**

1. 楽天アカウントでログイン（通常の楽天市場アカウントで可）
2. [Rakuten Developers](https://webservice.rakuten.co.jp/) にアクセス
3. 「+アプリID発行」をクリック
4. アプリ名・アプリURL を入力して利用規約に同意
5. 即時で **アプリID（applicationId）** と **アフィリエイトID** が発行される

審査は不要。登録後すぐにAPIを叩ける。

> **2026年2月の重要変更**: ドメインが `app.rakuten.co.jp` から `openapi.rakuten.co.jp` へ移行。旧ドメインは2026年5月13日に停止予定。新規実装は必ず新ドメインを使用すること。また、既存APIキーは再登録が必要。

### 主要エンドポイント・できること

#### 商品検索API（最重要）

```
GET https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601
```

**主要パラメータ**:

| パラメータ | 必須 | 説明 |
|-----------|------|------|
| `applicationId` | 必須 | 発行されたアプリID |
| `keyword` | 任意 | 検索キーワード（例: `ワンピース`, `Tシャツ`） |
| `genreId` | 任意 | ジャンルID（ファッション: `100371` など） |
| `minPrice` | 任意 | 最低価格（円） |
| `maxPrice` | 任意 | 最高価格（円） |
| `sort` | 任意 | ソート順（`-itemPrice`, `+itemPrice`, `-reviewCount` 等） |
| `page` | 任意 | ページ番号（1〜100） |
| `hits` | 任意 | 1ページの取得件数（1〜30） |
| `affiliateId` | 任意 | アフィリエイトID（収益化する場合に付与） |
| `imageFlag` | 任意 | 画像あり商品のみ（1 = 画像あり） |

**ジャンルID（ファッション関連）**:
- レディースファッション: `100371`
- メンズファッション: `100433`
- バッグ・小物: `215783`

**その他の主要API**:
- ランキング API: `IchibaItem/Ranking/20220601`
- ジャンル検索 API: `IchibaGenre/Search/20140222`
- 商品価格ナビ製品検索API（version: 2025-08-01）: `IchibaProduct/Search/20230922`

### レスポンス例

```json
{
  "count": 50000,
  "page": 1,
  "first": 1,
  "last": 30,
  "hits": 30,
  "Items": [
    {
      "Item": {
        "itemName": "【送料無料】フレアワンピース レディース 春夏 Aライン 半袖",
        "itemCode": "shop123:10000001",
        "itemPrice": 3980,
        "itemUrl": "https://item.rakuten.co.jp/shop123/10000001/",
        "affiliateUrl": "https://hb.afl.rakuten.co.jp/hgc/...",
        "imageFlag": 1,
        "mediumImageUrls": [
          { "imageUrl": "https://thumbnail.image.rakuten.co.jp/@0_mall/shop123/cabinet/item001.jpg" }
        ],
        "smallImageUrls": [
          { "imageUrl": "https://thumbnail.image.rakuten.co.jp/@0_mall/shop123/cabinet/item001_s.jpg" }
        ],
        "itemCaption": "春夏に人気のフレアワンピース...",
        "reviewCount": 142,
        "reviewAverage": 4.5,
        "shopName": "ファッションショップABC",
        "availability": 1,
        "taxFlag": 0,
        "postageFlag": 0
      }
    }
  ]
}
```

**取得できる主要フィールド**:
- 商品名: `itemName`
- 価格: `itemPrice`
- 商品URL: `itemUrl`
- アフィリエイトURL: `affiliateUrl`
- 商品画像URL（中サイズ）: `mediumImageUrls[].imageUrl`
- 商品画像URL（小サイズ）: `smallImageUrls[].imageUrl`
- レビュー数・平均点: `reviewCount`, `reviewAverage`
- ショップ名: `shopName`

### 無料枠・料金

- **完全無料**（利用料金なし）
- リクエスト制限: 非公式ではあるが 1秒 1リクエスト 程度が推奨。極端なバースト送信はブロックされる場合がある。
- 1日のリクエスト上限は明記されていないが、常識的な範囲（数万リクエスト/日）であれば問題なし。

### アフィリエイト報酬の有無

- **あり**（楽天アフィリエイトプログラム）
- ファッション（レディース）の基本報酬率: **4%**
- キャンペーン・スーパーアフィリエイト対象商品は最大 **20%** まで上昇
- アフィリエイトIDをAPIの `affiliateId` パラメータに付与するだけでリンクがアフィリエイトURLになる
- 報酬の1商品あたりの上限は廃止（上限なし）

### 利用規約上の注意点

- 取得した商品情報（画像・価格・商品名）は、対応する楽天市場の商品ページへのリンクを必ず付与した形で使用すること
- 取得データのキャッシュは **24時間以内** に更新する必要がある（価格情報の鮮度維持）
- ユーザーに楽天市場の商品であることを明示すること
- 大量アクセスによるサーバー負荷をかけないこと（スパム的利用の禁止）
- 2026年5月13日以降は必ず新エンドポイント（`openapi.rakuten.co.jp`）を使用すること

### MVP採用の推奨度: ◎

**理由**:
- 申請不要・即日利用開始
- ファッション商品の取扱い数が非常に多い（楽天市場全体で数億点以上）
- 画像URLが直接取得でき、コーディネート表示が容易
- アフィリエイト収益化が最もシンプルに統合できる
- 日本語ドキュメントが豊富でサンプルコードも多数存在する

---

## 3. Yahoo! ショッピング API

### API名・提供元

- **API名**: Yahoo!ショッピング 商品検索API（v3）
- **提供元**: LINEヤフー株式会社（Yahoo! Japan Developer Network）
- **公式サイト**: https://developer.yahoo.co.jp/webapi/shopping/

### 利用申請方法・難易度

**難易度: 低（即日利用可能）**

1. [Yahoo! JAPAN デベロッパーネットワーク](https://developer.yahoo.co.jp/) でアプリ登録
2. Yahoo! JAPAN ID でログイン
3. アプリを新規作成してClient ID（アプリケーションID）を取得
4. ショッピングAPIの場合は追加で「ショッピングAPI利用申請フォーム」から申請が必要
5. 申請後、審査（通常は比較的早い）を経て利用可能

一部のAPIは申請のみで利用可能（商品検索APIは審査不要の場合あり）。

### 主要エンドポイント・できること

#### 商品検索API v3（最重要）

```
GET https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch
```

**主要パラメータ**:

| パラメータ | 必須 | 説明 |
|-----------|------|------|
| `appid` | 必須 | Client ID（アプリケーションID） |
| `query` | 任意 | 検索キーワード（例: `ワンピース`） |
| `category_id` | 任意 | カテゴリID |
| `jan_code` | 任意 | JANコード |
| `brand_id` | 任意 | ブランドID |
| `store_id` | 任意 | ストアID |
| `price_from` | 任意 | 最低価格（円） |
| `price_to` | 任意 | 最高価格（円） |
| `sort` | 任意 | ソート順（`-price`, `+price`, `-score` 等） |
| `results` | 任意 | 取得件数（最大50） |
| `start` | 任意 | 取得開始位置 |
| `image_size` | 任意 | 画像サイズ指定 |

**その他の主要API**:
- 商品参照API: `https://shopping.yahooapis.jp/ShoppingWebService/V3/itemLookup`
- カテゴリ検索: `https://shopping.yahooapis.jp/ShoppingWebService/V1/categorySearch`
- ランキングAPI: 利用可能

### レスポンス例

```json
{
  "totalResultsReturned": 20,
  "totalResultsAvailable": 100000,
  "firstResultsPosition": 1,
  "hits": [
    {
      "index": 1,
      "name": "フレアスカート レディース ミモレ丈 春 夏",
      "description": "春夏に人気のフレアスカート...",
      "url": "https://store.shopping.yahoo.co.jp/shop001/item001.html",
      "inStock": true,
      "code": "shop001-item001",
      "image": {
        "small": "https://item-shopping.c.yimg.jp/i/j/shop001_item001_s",
        "medium": "https://item-shopping.c.yimg.jp/i/j/shop001_item001"
      },
      "price": 2980,
      "priceLabel": {
        "defaultPrice": 2980,
        "salePrice": null,
        "taxIncluded": true
      },
      "seller": {
        "sellerId": "shop001",
        "name": "ファッションショップ001"
      },
      "review": {
        "count": 89,
        "rate": 4.3
      },
      "affiliateRate": 3.0
    }
  ]
}
```

**取得できる主要フィールド**:
- 商品名: `hits[].name`
- 価格: `hits[].price`
- 商品URL: `hits[].url`
- 商品画像URL（中サイズ）: `hits[].image.medium`
- 商品画像URL（小サイズ）: `hits[].image.small`
- ショップ名: `hits[].seller.name`
- レビュー数・評価: `hits[].review.count`, `hits[].review.rate`
- アフィリエイト料率: `hits[].affiliateRate`

### 無料枠・料金

- **完全無料**
- リクエスト制限: **1分間30リクエスト**（アプリケーションIDごと）
  - ※2022年6月の仕様変更で制限が強化された
- 1日あたりの上限の明示はないが、レート制限（30 req/min）を守る必要がある
- 楽天APIと比べてレート制限が厳しいため、スロットリング実装が必須

### アフィリエイト報酬の有無

- **あり**（Yahoo!ショッピングアフィリエイトプログラム / バリューコマース経由）
- 報酬率: カテゴリーごとに **2〜4%** が基本（ストア独自で高く設定している場合あり）
- バリューコマース（https://www.valuecommerce.ne.jp/）への登録が必要
- APIレスポンスの `affiliateRate` フィールドで各商品のアフィリエイト料率が確認可能

### 利用規約上の注意点

- APIで取得したデータをキャッシュする場合は定期的な更新が必要（価格変動に対応）
- 商品情報はYahoo!ショッピングの商品ページへのリンクと共に表示すること
- 1分間30リクエストのレート制限を厳守すること（超過すると一定時間利用不可になる）
- 商品データをデータベースに蓄積して再配布することは禁止

### MVP採用の推奨度: ○

**理由**:
- 申請ハードルが低く比較的早く利用開始できる
- 楽天APIとほぼ同等の情報取得が可能
- ただしレート制限（30 req/min）が楽天より厳しく、多数の同時ユーザーに対応しにくい
- 楽天APIと**補完的に併用**することでカバレッジを拡大できる

---

## 4. Amazon Product Advertising API（PA-API v5）

### API名・提供元

- **API名**: Product Advertising API 5.0（PA-API v5）
- **提供元**: Amazon.co.jp / Amazon.com, Inc.
- **公式サイト**: https://affiliate.amazon.co.jp/

### 利用申請方法・難易度

**難易度: 高（利用開始まで時間がかかる）**

1. Amazonアソシエイトに登録（ウェブサイトが必要）
2. アソシエイトが承認される（180日以内に3件以上の売上が必要）
3. Amazonアソシエイト・セントラルからPA-APIのアクセスキーを発行
4. **2025年11月以降**: 過去30日間に10件以上の適格売上が必要（API利用継続条件）

> **MVPフェーズの障壁**: 審査・売上実績の蓄積が必要なため、ゼロからの開始では利用開始まで数ヶ月かかる可能性がある。

### 主要エンドポイント・できること

#### 商品検索API

```
POST https://webservices.amazon.co.jp/paapi5/searchitems
```

**リクエスト形式**: JSON（RESTful API）
**認証**: HMAC-SHA256署名（AWS形式）

**主要パラメータ**:

| パラメータ | 必須 | 説明 |
|-----------|------|------|
| `Keywords` | 任意 | 検索キーワード |
| `SearchIndex` | 任意 | カテゴリ（`Fashion`, `Apparel` 等） |
| `BrowseNodeId` | 任意 | ブラウズノードID（カテゴリの絞り込み） |
| `Resources` | 必須 | 取得するフィールドを指定（画像・価格等） |
| `PartnerTag` | 必須 | アソシエイトタグ |
| `PartnerType` | 必須 | `Associates` |
| `Marketplace` | 必須 | `www.amazon.co.jp` |

**ファッション関連 SearchIndex**: `Fashion`, `Apparel`

### レスポンス例

```json
{
  "SearchResult": {
    "TotalResultCount": 10000,
    "Items": [
      {
        "ASIN": "B07XXXXX",
        "DetailPageURL": "https://www.amazon.co.jp/dp/B07XXXXX?tag=associate-22",
        "ItemInfo": {
          "Title": { "DisplayValue": "ワンピース レディース フレア 春夏" }
        },
        "Images": {
          "Primary": {
            "Medium": { "URL": "https://m.media-amazon.com/images/I/51XXXXXX._AC_SY395_.jpg", "Width": 267, "Height": 395 },
            "Large": { "URL": "https://m.media-amazon.com/images/I/51XXXXXX._AC_SL1500_.jpg" }
          }
        },
        "Offers": {
          "Listings": [
            {
              "Price": { "DisplayAmount": "¥3,980", "Amount": 3980 }
            }
          ]
        }
      }
    ]
  }
}
```

### 無料枠・料金

- **完全無料**（APIの利用自体に費用はかからない）
- リクエスト制限: 最初の60日は 8,640 req/日。その後は過去30日の売上額（$0.05≒約5円ごとに1リクエスト/日追加）に応じて上限が増加。最大 864,000 req/日

### アフィリエイト報酬の有無

- **あり**（Amazonアソシエイト・プログラム）
- ファッション小物カテゴリ: **8.0%**（2024〜2025年時点）
- 2024年8月より1商品あたりの報酬上限が廃止（上限なしに変更）
- 認証にアソシエイトタグが必須で、APIへの組み込みは必須

### 利用規約上の注意点

- 商品データのキャッシュは **24時間以内** に更新が必須
- 画像URLはAmazonのCDNから提供されるが、直接の画像再ホスティングは禁止
- 商品ページへのリンクは必ずアソシエイトタグ付きのURLを使用すること
- APIで取得したデータをAmazon以外のサービスと混在させる形での表示はグレーゾーン
- API利用資格（過去30日10件以上の売上）を満たさなくなると自動的にアクセス停止

### MVP採用の推奨度: △

**理由**:
- アフィリエイト報酬率がファッション8%と高く、収益化ポテンシャルは高い
- しかし**利用開始まで売上実績が必要**（ゼロスタートでは使えない）
- 認証が複雑（HMAC-SHA256署名が必要）
- MVP段階ではなく、スケールアップ後（アソシエイト売上が安定してから）の追加推奨

---

## 5. ユニクロ 公開API

### 調査結果

**公式の外部向け公開APIは存在しない（×）**

調査の結果、ユニクロ（ファーストリテイリング株式会社）は外部開発者向けの公開APIを提供していないことが確認された。

- ユニクロアプリ・ECサイトは自社の内部API（非公開）で運用されている
- 商品データ取得のための公式手段は存在しない
- 非公式のスクレイピングは利用規約により禁止されている

**代替手段**:
- 楽天市場でユニクロ公式ストアの商品を楽天APIで検索する（一部商品は楽天に出品されている）
- ただし、ユニクロは基本的に楽天市場への出品をしておらず、代替は困難

### MVP採用の推奨度: ×

---

## 6. その他の選択肢

### 6-1. ZOZOTOWN / WEAR API

**調査結果**: 外部開発者向け公開APIは非公開。
「Fulfillment by ZOZO」はEC事業者向けの在庫・出荷連携APIであり、商品データ検索目的の外部APIではない。
WEARのコーディネートデータAPIも非公開。

**推奨度: ×**

### 6-2. Open Fashion API / グローバルAPI

| API名 | 概要 | 推奨度 |
|-------|------|--------|
| **Shopify Storefront API** | Shopify出店ストアの商品データ取得（各ストアごとに許可が必要） | △ |
| **Styla API** | ファッション特化だが日本語データが少ない | × |
| **Fashionphile API** | 中古ブランド品特化・英語のみ | × |

### 6-3. アフィリエイトASP経由API

| ASP | 説明 | 推奨度 |
|-----|------|--------|
| **バリューコマース** | Yahoo!ショッピング商品の検索・リンク生成API | ○ |
| **A8.net** | 一部ファッションブランドのフィードが取得可能 | △ |
| **もしもアフィリエイト** | 楽天・Amazonを横断した商品検索API（かんたんリンク） | ○ |

### 6-4. もしもアフィリエイト かんたんリンクAPI

楽天・Amazon・Yahoo!ショッピングを一度に横断検索できる非公式的なアフィリエイトAPIで、もしもアフィリエイト登録後に利用可能。

```
GET https://webapi.moshimo.com/items/search?apikey={key}&keyword=ワンピース
```

楽天・Amazon・Yahoo!の商品を一括で取得できるため、MVPの補助ツールとして有用。

---

## 7. 比較表

| 項目 | 楽天市場API | Yahoo!ショッピングAPI | Amazon PA-API v5 | ユニクロAPI |
|------|-----------|-------------------|-----------------|------------|
| **推奨度** | ◎ | ○ | △ | × |
| **申請・審査** | 不要（即日） | 簡易申請（数日） | 審査あり（数週間〜） | 非公開 |
| **利用料金** | 無料 | 無料 | 無料 | - |
| **リクエスト制限** | 緩め（制限明記なし） | 30 req/分 | 8,640 req/日〜 | - |
| **商品画像取得** | ◎（複数サイズ） | ◎（複数サイズ） | ◎（高解像度） | - |
| **価格取得** | ◎ | ◎ | ◎ | - |
| **ファッション商品数** | 非常に多い | 多い | 多い | - |
| **日本語ドキュメント** | 充実 | 充実 | 一部 | - |
| **アフィリエイト報酬** | 4%〜20% | 2〜4% | 8%（ファッション小物） | - |
| **実装の複雑さ** | 低い | 低い | 高い（署名認証） | - |
| **認証方式** | APIキー（クエリパラメータ） | APIキー（クエリパラメータ） | HMAC-SHA256署名 | - |

---

## 8. MVP実装方針の推奨

### フェーズ1（MVP）: 楽天市場APIをメイン採用

**実装ステップ**:

1. [Rakuten Developers](https://webservice.rakuten.co.jp/) でアプリID取得（15分以内）
2. 商品検索エンドポイント（`IchibaItem/Search/20220601`）を実装
3. ファッション系ジャンルID（`100371`=レディース, `100433`=メンズ）でジャンル絞り込み
4. アフィリエイトIDを付与してリンク収益化

**サンプルリクエスト**:
```
GET https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601
  ?applicationId=YOUR_APP_ID
  &affiliateId=YOUR_AFFILIATE_ID
  &keyword=ワンピース
  &genreId=100371
  &imageFlag=1
  &sort=-reviewCount
  &hits=20
```

### フェーズ2（スケールアップ）: Yahoo!ショッピングAPIを補完追加

- 楽天にない商品カバレッジを補完
- レート制限を考慮してキャッシュ戦略を実装（Redis等でTTL 24時間）

### フェーズ3（収益最大化）: Amazon PA-API追加

- アソシエイト売上が安定した後（月30件以上の売上）に追加
- ファッション小物カテゴリの高単価商品でアフィリエイト収益を最大化

---

## 参考リンク

- [楽天ウェブサービス 公式ドキュメント](https://webservice.rakuten.co.jp/documentation)
- [楽天市場商品検索API 仕様（version:2022-06-01）](https://webservice.rakuten.co.jp/documentation/ichiba-item-search)
- [楽天ウェブサービス API移行情報（2026年2月）](https://miscnote.com/blog/20260217-entry-01/)
- [Yahoo!デベロッパーネットワーク ショッピングAPI](https://developer.yahoo.co.jp/webapi/shopping/)
- [Yahoo!ショッピング 商品検索API v3](https://developer.yahoo.co.jp/webapi/shopping/v3/itemsearch.html)
- [Yahoo!ショッピングAPI 利用制限について](https://developer.yahoo.co.jp/appendix/rate.html)
- [Yahoo!ショッピングAPI 導入の流れ](https://developer.yahoo.co.jp/webapi/shopping/introduction.html)
- [Amazon PA-API v5 ヘルプ](https://affiliate.amazon.co.jp/help/node/topic/GJ2QX3RTJ9ELJMPP)
- [Amazon PA-API 利用ポリシー変更](https://affiliate.amazon.co.jp/help/node/topic/GW65C7J2CSK7CA6C)
