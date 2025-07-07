# 複数日程調整アプリ

複数の日程候補から最適な日程を決めるための調整アプリケーションです。

### イベント作成機能

- 期間から候補日程を自動生成
- マスを直接選択して候補日程を設定
  - 開始日を指定後、表のマスをクリックまたはドラッグして必要な枠だけを選択

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
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=[表示されたanonキー]
SUPABASE_SERVICE_ROLE_KEY=[表示されたservice_roleキー]
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

`npm run dev`で開発サーバーを起動している状態で、以下のコマンドを実行してください。

`npx playwright test`

<!-- - **開発環境での E2E テスト**: `npm run e2e:dev` - 開発サーバーを起動し、ブラウザウィンドウを表示してテストを実行します。
- **本番ビルドでの E2E テスト**: `npm run e2e` - 本番用ビルドを作成し、その環境でブラウザウィンドウを表示してテストを実行します。
- **ヘッドレステスト**: `npm run e2e:headless` - 本番ビルドでブラウザを表示せずにテストを実行し、シンプルなドット形式でレポートします。
- **CI 環境用 E2E テスト**: `npm run e2e:ci` - CI 環境向けの最適化されたヘッドレステスト実行コマンドです。 -->

### 注意事項

- すべてのテストは Next.js 公式推奨の`next/jest`プリセットを利用しており、babel や ts-jest は不要です。
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

## e2e テストについて

e2e テストは Playwright を使用しており、以下のようなテストケースをカバーしています：

- イベント作成 → リンク共有 → 参加者回答 → 主催者確定 → カレンダー連携
- PWA インストール・オフライン・お気に入り・履歴・URL 直遷移
- サーバー・Supabase 同時起動、ヘッドレス実行、HTML レポート出力

### 使用方法

- **通常の e2e テスト実行**
  `npm run e2e`

  - Next.js サーバー・Supabase ローカル環境・Playwright テストを並列で自動起動します。
  - テストはヘッドレスモードで実行され、結果は HTML レポートとして `playwright-report/` ディレクトリに出力されます。

- **開発モードでの e2e テスト実行**
  `npm run e2e:dev`

  - Next.js を開発モードで起動し、テストを実行します。

- **ヘッドレスモードでの e2e テスト実行**
  `npm run e2e:headless`

  - 完全ヘッドレスでテストを実行します。

- **CI 用（簡易レポート）**
  `npm run e2e:ci`

  - CI/CD での利用を想定した簡易レポート出力です。

- **テストレポートの確認**
  テスト実行後、以下のコマンドで HTML レポートをブラウザで確認できます。

#### 注意事項

- テスト実行には Supabase のローカル環境が起動している必要があります。起動していない場合は、`npx supabase start` で起動してください。
- テストは実際のデータベースに影響を与えないよう設計されていますが、ローカル環境での実行を推奨します。
- テストの詳細・注意事項は `e2e/` ディレクトリおよび各テストファイルを参照してください。

---

**補足:**
`package.json` には `test:e2e` スクリプトも定義されています。開発サーバーを別途起動した状態で e2e テストだけを実行したい場合に `npm run test:e2e` を利用できます。
本番ビルドやサーバー起動から自動で行う場合は、上記の `npm run e2e` などを使用してください。
