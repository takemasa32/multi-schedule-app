# PWA（Progressive Web App）仕様書

## 1. 概要

本アプリは、Web ブラウザからインストール可能な PWA（Progressive Web App）として動作します。PWA 対応により、ホーム画面追加・オフライン利用・高速な再訪問・ネイティブアプリに近い UX を実現します。

## 2. PWA 対応の目的

- ホーム画面からワンタップで起動できる利便性の向上
- オフライン時でも最低限の情報・UI を提供
- モバイル/PC 問わず一貫した体験
- インストール促進バナーやアイコン表示によるリテンション向上

## 3. 実装内容

### 3.1 manifest.json

- `public/manifest.json`にて PWA の基本情報（name, short_name, icons, start_url, display, theme_color, background_color 等）を定義
- `start_url`は`/home`（PWA 専用ダッシュボード）
- 複数サイズのアイコン（192x192, 512x512, maskable 対応）を用意

### 3.2 Service Worker/キャッシュ

- `next-pwa`を導入し、`next.config.ts`で PWA 設定を有効化
- 静的アセット・主要ページ（/home, /event/[public_id]等）をキャッシュ
- オフライン時は`/public/offline.html`をフォールバックページとして表示
- キャッシュ戦略は CacheFirst/NetworkFirst/StaleWhileRevalidate を用途に応じて設定
- ページ表示時にサーバーアクションで `last_accessed_at` を更新（UpdateAccess コンポーネント）

### 3.3 PWA ホーム画面（/home）

- PWA 起動時の初期ページとして`/home`を用意
- 主な機能：
  - 新規イベント作成ボタン
  - 最近アクセスしたイベント一覧（ローカルストレージ管理）
  - お気に入りイベント一覧（ローカルストレージ管理、即時反映）
  - イベント URL/ID から開くフォーム
  - PWA インストール促進バナー
- `/src/app/home/page.tsx`で Provider ラップし、状態管理を一元化

### 3.4 お気に入り・履歴機能

- お気に入りイベントはローカルストレージ＋ React Context で管理
- イベント詳細ページでお気に入り登録/解除が可能
- ホーム画面でお気に入り一覧が即時反映
- 最近アクセス履歴もローカルストレージで管理

### 3.5 オフライン対応

- Service Worker による静的アセット・主要ページのキャッシュ
- オフライン時は`/offline.html`を自動表示
- オフライン時のフォーム送信や API 通信は未対応（将来拡張）

### 3.6 テスト・品質保証

- PWA 機能・お気に入り機能のユニットテスト/E2E テスト雛形を用意
- すべてのテストは Jest ＋ TypeScript で管理し、型エラーや Lint エラーが残っている場合は失敗とみなす
- jsdom の requestSubmit 未実装警告を抑制するため、各テストファイルでポリフィルを導入
- グローバル API のモックや@ts-expect-error には必ず理由コメントを添える
- Lighthouse 等で PWA スコアを定期監査
- JSDoc コメントで API ドキュメントを自動生成可能な状態を維持

## 4. 今後の拡張方針

- Service Worker による API レスポンスのキャッシュ・バックグラウンド同期
- プッシュ通知（イベント確定時等）
- より高度なオフライン体験（フォーム送信のキューイング等）
- PWA ホーム画面のさらなる UX 改善

## 5. 参考

- [manifest.json 仕様](https://developer.mozilla.org/ja/docs/Web/Manifest)
- [next-pwa 公式](https://github.com/shadowwalker/next-pwa)
- [PWA のベストプラクティス](https://web.dev/progressive-web-apps/)

---

本仕様書は`/public/manifest.json`、`/src/app/home/page.tsx`、`/components/favorite-events-context.tsx`等の実装内容およびプロジェクト全体の PWA 設計方針を反映しています。
