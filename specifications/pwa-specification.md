# PWA（Progressive Web App）仕様書

## 1. 概要
本アプリは、Webブラウザからインストール可能なPWA（Progressive Web App）として動作します。PWA対応により、ホーム画面追加・オフライン利用・高速な再訪問・ネイティブアプリに近いUXを実現します。

## 2. PWA対応の目的
- ホーム画面からワンタップで起動できる利便性の向上
- オフライン時でも最低限の情報・UIを提供
- モバイル/PC問わず一貫した体験
- インストール促進バナーやアイコン表示によるリテンション向上

## 3. 実装内容
### 3.1 manifest.json
- `public/manifest.json`にてPWAの基本情報（name, short_name, icons, start_url, display, theme_color, background_color等）を定義
- `start_url`は`/home`（PWA専用ダッシュボード）
- 複数サイズのアイコン（192x192, 512x512, maskable対応）を用意

### 3.2 Service Worker/キャッシュ
- `next-pwa`を導入し、`next.config.ts`でPWA設定を有効化
- 静的アセット・主要ページ（/home, /event/[public_id]等）をキャッシュ
- オフライン時は`/public/offline.html`をフォールバックページとして表示
- キャッシュ戦略はCacheFirst/NetworkFirst/StaleWhileRevalidateを用途に応じて設定

### 3.3 PWAホーム画面（/home）
- PWA起動時の初期ページとして`/home`を用意
- 主な機能：
  - 新規イベント作成ボタン
  - 最近アクセスしたイベント一覧（ローカルストレージ管理）
  - お気に入りイベント一覧（ローカルストレージ管理、即時反映）
  - イベントURL/IDから開くフォーム
  - PWAインストール促進バナー
- `/src/app/home/page.tsx`でProviderラップし、状態管理を一元化

### 3.4 お気に入り・履歴機能
- お気に入りイベントはローカルストレージ＋React Contextで管理
- イベント詳細ページでお気に入り登録/解除が可能
- ホーム画面でお気に入り一覧が即時反映
- 最近アクセス履歴もローカルストレージで管理

### 3.5 オフライン対応
- Service Workerによる静的アセット・主要ページのキャッシュ
- オフライン時は`/offline.html`を自動表示
- オフライン時のフォーム送信やAPI通信は未対応（将来拡張）

### 3.6 テスト・品質保証
- PWA機能・お気に入り機能のユニットテスト/E2Eテスト雛形を用意
- Lighthouse等でPWAスコアを定期監査
- JSDocコメントでAPIドキュメントを自動生成可能な状態を維持

## 4. 今後の拡張方針
- Service WorkerによるAPIレスポンスのキャッシュ・バックグラウンド同期
- プッシュ通知（イベント確定時等）
- より高度なオフライン体験（フォーム送信のキューイング等）
- PWAホーム画面のさらなるUX改善

## 5. 参考
- [manifest.json仕様](https://developer.mozilla.org/ja/docs/Web/Manifest)
- [next-pwa公式](https://github.com/shadowwalker/next-pwa)
- [PWAのベストプラクティス](https://web.dev/progressive-web-apps/)

---

本仕様書は`/public/manifest.json`、`/src/app/home/page.tsx`、`/components/favorite-events-context.tsx`等の実装内容およびプロジェクト全体のPWA設計方針を反映しています。
