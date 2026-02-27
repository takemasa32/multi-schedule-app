# 複数日程調整アプリ

複数の日程候補から最適な日程を決めるための調整アプリケーションです。

## ドキュメント

- [カレンダー操作UI共通ロジック](docs/architecture/calendar-interaction.md)
- [アクセス権限・閲覧方針](docs/architecture/access-policy.md)
- [プライバシーポリシー検討メモ](docs/architecture/privacy-policy.md)
- [イベント作成ウィザード設計メモ](docs/architecture/create-wizard.md)
- [回答ウィザード設計メモ](docs/architecture/answer-wizard.md)
- [アカウント予定連携の設計](docs/architecture/account-schedule.md)
- [アカウントページ新規ユーザーツアー設計](docs/architecture/account-onboarding-tour.md)
- [体感最適化と整合性担保](docs/architecture/performance-latency-improvements.md)
- [Googleログインとイベント履歴同期の設計](docs/auth/google-login-design.md)

### イベント作成機能

- 期間から候補日程を自動生成
- カレンダーで手動選択で候補日程を設定
  - 期間を設定後、カレンダー上でクリック（ドラッグ）して必要な枠だけを選択

### ログイン（任意）/アカウント機能

- **ログイン不要で利用可能**（ゲスト利用を優先）
- Google ログインを行うと **履歴の同期** が可能
- アカウントページで **履歴・お気に入りの確認** と **ログアウト / 連携削除** が可能
- ログイン時は **予定テンプレの管理** と **回答の自動反映・同期** が利用可能
- 初回ログイン時は `/account` で **使い方ツアー（7ステップ）** を表示し、以降は **手動再表示** で確認可能

## Supabase ローカル開発環境

Supabase のローカル開発環境を使用して、オフラインでの開発や高速なフィードバックループを実現します。

## 開発用ログイン（ローカル限定）

ローカル環境でのみ利用できる開発用ログインを用意しています。以下の環境変数を設定し、`npm run dev` を再起動してください。

```bash
ENABLE_DEV_LOGIN=true
DEV_LOGIN_ID=devuser
DEV_LOGIN_PASSWORD=devpass
NEXT_PUBLIC_ENABLE_DEV_LOGIN=true
```

※ 本番環境では `NODE_ENV=production` のため自動で無効化されます。

### 前提条件

- Docker がインストールされていること
- Node.js と npm がインストールされていること

### 基本コマンド

```bash
# Supabase ローカル環境の起動
npx supabase start

# Supabase ローカル環境の停止
npx supabase stop

# Supabase ローカル環境の状態確認
npx supabase status
```

### ローカル環境の URL・認証情報

Supabase を起動すると、以下のような情報が表示されます：

```text
API URL: http://localhost:54321
GraphQL URL: http://localhost:54321/graphql/v1
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
Inbucket URL: http://localhost:54324
JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

これらの情報を `.env.local` ファイルにコピーしてください。

### マイグレーション管理

```bash
# 新しいマイグレーションファイルの作成
npx supabase migration new マイグレーション名

# マイグレーションの適用
npx supabase migration up

# データベースリセット（全テーブル削除後にマイグレーション再適用）
npx supabase db reset

# プロジェクトを現在のディレクトリにリンク
npx supabase link

# 最新のマイグレーションをデータベースにプッシュ
npx supabase db push
```

### 型定義の生成

```bash
# TypeScript の型定義を生成
npx supabase gen types typescript --linked > src/lib/database.types.ts
```

### データベース操作

```bash
# SQLエディタを開く
npx supabase db studio

# データベースのダンプを取得
npx supabase db dump -f dump-filename.sql
```

### その他のコマンド

```bash
# Supabase CLIのヘルプを表示
npx supabase -h

# 特定コマンドのヘルプを表示
npx supabase [コマンド] -h
```

### トラブルシューティング

- **環境起動エラー**: Docker が起動していることを確認し、必要に応じて Docker のリソース設定を見直してください
- **接続エラー**: ポート競合がないか確認し、必要に応じて実行中のプロセスを停止してください
- **DB マイグレーションエラー**: エラーメッセージを確認し、SQL の構文や参照整合性を修正してください

## 環境変数の設定

`.env.local.example` ファイルを `.env.local` としてコピーし、Supabase 起動時に表示される値で更新してください：

```bash
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=[表示されたanonキー]
SUPABASE_SERVICE_ROLE_KEY=[表示されたservice_roleキー]
SUPABASE_DB_URL=postgresql://postgres:postgres@localhost:54322/postgres
NEXTAUTH_SECRET=[ランダムなシークレット]
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=[Google OAuth クライアントID]
GOOGLE_CLIENT_SECRET=[Google OAuth クライアントシークレット]
```

## 開発フロー

1. Supabase のローカル環境を起動: `npx supabase start`
2. 開発サーバーを起動: `npm run dev`
3. 必要に応じてマイグレーションを作成・適用
4. 開発終了時に Supabase 環境を停止: `npx supabase stop`

## テストの実行方法

本プロジェクトは Jest（TypeScript 対応）によるユニットテスト・結合テストと、Playwright による E2E テストを実装しています。

### ユニットテスト/結合テスト (Jest)

- **開発中のテスト実行**: `npm run test` - ファイル変更を監視し、変更があった場合に自動的に再実行します。
- **CI 環境用テスト実行**: `npm run test:ci` - テストがない場合でもエラーにならず、CI 環境に適しています。

### E2E テスト (Playwright)

- 推奨（公開フロー + 認証フロー）: `npm run test:e2e:chrome`
- 公開フローのみ: `npm run test:e2e:chrome:public`
- 認証フローのみ: `npm run test:e2e:auth`
- すでに開発サーバーを起動済みで Playwright のみ実行したい場合: `npm run test:e2e`

詳細な実行パターンと前提条件は、下部の「e2e テストについて」を参照してください。

### Jest テスト実行時の注意事項

- すべてのテストは Next.js 公式推奨の`next/jest`プリセットを利用しており、babel や ts-jest は不要です。
- TypeScript 型エラーや Lint エラーが残っている場合、テストは失敗します。必ず型・Lint が通る状態で実行してください。
- jsdom の`requestSubmit`未実装警告は各テストファイルでポリフィルを導入済みです。
- テストの詳細・注意事項は`src/components/__tests__/`および`src/lib/__tests__/`ディレクトリの各テストファイルを参照してください。

### 主なテスト内容

- サーバーアクション（イベント作成・回答送信・日程確定など）の正常系・異常系
- カレンダー連携（.ics 生成・Google カレンダーリンク生成）
- お気に入り・履歴機能の UI/ロジック
- バリデーション・エラーハンドリング
- 型安全性・エラー時の挙動

### テストファイルの場所

- `src/lib/__tests__/` ... サーバーアクション・ユーティリティのテスト
- `src/components/__tests__/` ... UI コンポーネントのテスト

### 注意事項

- テストは必ず型エラー・Lint エラーがない状態で実行・コミットしてください。
- テスト追加時は仕様書に沿ったケースを網羅し、必要に応じてグローバルモックやポリフィルも追加してください。
- Jest のグローバルモックや`@ts-expect-error`には必ず理由コメントを添えてください。
- テストの実装・修正内容は必ずコミットメッセージや PR 本文に明記してください。

## カレンダー連携（Google / ICS）

本プロジェクトでは、複数確定日程に対応したカレンダー連携APIを提供します。いずれもローカル時間をそのまま扱い、Google には `ctz` を明示、ICSはZ無しで書き出します。

- Google カレンダー: `/api/calendar/<event_id>?googleCalendar=true&dateId=<event_date_id>`
- ICS ダウンロード: `/api/calendar/ics/<event_id>?dateId=<event_date_id>`

旧API（`/api/generate-ics`）は廃止しました。UI からは `CalendarLinks` コンポーネント経由でこれらのエンドポイントを利用します。

## e2e テストについて

e2e テストは Playwright を使用しており、以下のようなテストケースをカバーしています：

- イベント作成 → リンク共有 → 参加者回答 → 主催者確定 → カレンダー連携
- 認証ありフロー（`/account`、予定一括管理、回答紐づけ、ツアー）を含む回帰確認
- 公開フロー/認証フローを分けた実行と、自動サーバー起動付き検証

### 使用方法

- **Chromium向けの推奨実行（公開フロー + 認証フロー）**
  `npm run test:e2e:chrome`
  - `test:e2e:chrome:public`（公開フロー）と `test:e2e:auth`（認証必須フロー）を順次実行します。

- **公開フローのみ実行（`@auth-required` を除外）**
  `npm run test:e2e:chrome:public`
  - サーバー自動起動は行わないため、事前に `http://localhost:3000` を起動してください。

- **認証フローのみ実行**
  `npm run test:e2e:auth`
  - 内部で `ENABLE_DEV_LOGIN` などの必要な環境変数を設定し、ビルド済みサーバーを `:3201` で起動して実行します。
  - DB接続（`SUPABASE_DB_URL`）とローカル環境の準備が必要です。

- **開発サーバー起動済みで Playwright のみ実行**
  `npm run test:e2e`

- **デバッグ実行（headed + debug）**
  `npm run test:e2e:debug`

- **テストレポートの確認**
  テスト実行後、以下のコマンドで HTML レポートをブラウザで確認できます。

#### E2E テスト実行時の注意事項

- テスト実行には Supabase のローカル環境が起動している必要があります。起動していない場合は、`npx supabase start` で起動してください。
- テストは実際のデータベースに影響を与えないよう設計されていますが、ローカル環境での実行を推奨します。
- 認証付きE2Eを実行する場合は、少なくとも `SUPABASE_DB_URL` を解決できる状態にしてください（`.env.local` または環境変数）。
- テストの詳細・注意事項は `e2e/` ディレクトリおよび各テストファイルを参照してください。

---

**補足:**
テストスクリプトは保守性のため最小構成に整理しています。E2E は `test:e2e:chrome` / `test:e2e:chrome:public` / `test:e2e:auth` / `test:e2e` / `test:e2e:debug` のみを提供します。
