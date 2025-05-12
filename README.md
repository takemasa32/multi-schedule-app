# 複数日程調整アプリ

複数の日程候補から最適な日程を決めるための調整アプリケーションです。

## Supabase ローカル開発環境

Supabase のローカル開発環境を使用して、オフラインでの開発や高速なフィードバックループを実現します。

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

```
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
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=[表示されたanonキー]
SUPABASE_SERVICE_ROLE_KEY=[表示されたservice_roleキー]
```

## 開発フロー

1. Supabase のローカル環境を起動: `npx supabase start`
2. 開発サーバーを起動: `npm run dev`
3. 必要に応じてマイグレーションを作成・適用
4. 開発終了時に Supabase 環境を停止: `npx supabase stop`

## テストの実行方法

本プロジェクトは Jest（TypeScript 対応）によるユニットテスト・結合テストを実装しています。

- すべてのテストは `npm test` または `npm run test` で実行できます。
- テストは Next.js 公式推奨の`next/jest`プリセットを利用しており、babel や ts-jest は不要です。
- TypeScript 型エラーや Lint エラーが残っている場合、テストは失敗します。必ず型・Lint が通る状態で実行してください。
- jsdom の`requestSubmit`未実装警告は各テストファイルでポリフィルを導入済みです。
- テストの詳細・注意事項は`src/components/__tests__/`および`src/lib/__tests__/`ディレクトリの各テストファイルを参照してください。

### 主なテスト内容

- サーバーアクション（イベント作成・回答送信・日程確定など）の正常系・異常系
- カレンダー連携（.ics 生成・Google カレンダーリンク生成）
- PWA ホーム画面・お気に入り・履歴機能の UI/ロジック
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

## PWA/Workbox 生成ファイルについて

`public/sw.js`や`public/workbox-*.js`、`public/fallback-*.js`などの PWA/Workbox 生成ファイルは`.gitignore`に追加済みです。これらはビルド時に自動生成されるため、Git の差分に出ないようになっています。
