# 実装整合性監査レポート（2026-04-20）

## 目的

本ドキュメントは、現行実装と仕様書・設計ドキュメントの整合性を監査し、以下を明確化することを目的とする。

- 実装上の齟齬（仕様との差分）
- ドキュメント上の齟齬（記述と実装の不一致）
- 障害発生リスクがある箇所
- 改善余地がある箇所（保守性・可読性・性能・テスト網羅）

## 監査方針

1. 仕様書群を一次情報として確認する。
2. 既存の docs を二次情報として確認し、仕様解釈の補助情報とする。
3. 実装を領域単位（app/components/hooks/lib/types/supabase/e2e）で確認する。
4. 発見事項は重大度を付与して本書に随時追記する。
5. 最後に再スキャンして見落としがないことを確認する。

## 重大度定義

- Critical: 直ちに不具合・情報漏えい・データ破壊につながる可能性
- High: 高確率で本番不具合・仕様逸脱につながる
- Medium: 条件付きで不具合・保守性低下につながる
- Low: 直ちに問題ではないが将来の負債になりうる

## 監査ログ

### 1. 仕様・設計ドキュメント確認

- 完了
- 確認対象:
  - `specifications/specification.md`
  - `specifications/test-specification.md`
  - `specifications/pwa-specification.md`
  - `specifications/favorite-feature.md`
  - `specifications/event-history-feature.md`
  - `specifications/open-by-url-feature.md`
  - `specifications/site-config-feature.md`
  - `docs/architecture/access-policy.md`

### 2. 実装確認（領域別）

- 完了
- 確認対象:
  - `src/app/**`（画面・APIルート）
  - `src/components/**`（履歴/お気に入り/URL入力/カレンダー導線）
  - `src/lib/**`（Server Actions・ユーティリティ・履歴同期）
  - `src/proxy.ts`（LINEリダイレクト）
  - `supabase/migrations/*.sql`（スキーマ/RLS/RPC）
  - `e2e/*.spec.ts`（E2E網羅）

### 3. 発見事項

### [AUDIT-001]

- 分類: 実装齟齬 / 改善提案
- 重大度: Medium
- 対象: カレンダーAPI
- 現状:
  - 実運用で使われているのは `src/app/api/calendar/[event_id]/route.ts` と `src/app/api/calendar/ics/[eventId]/route.ts`。
  - 一方で `src/app/api/calendar/route.ts`（`?eventId=` を受ける旧互換ルート）が残存している。
  - `src/components/calendar-links.tsx` からは旧互換ルートは参照されていない。
- 期待:
  - 使われていない旧互換ルートを削除するか、互換目的で残すならドキュメントで明示する。
- 影響:
  - API仕様の理解コスト増加、将来修正時の見落としリスク。
- 根拠:
  - `src/app/api/calendar/route.ts`
  - `src/components/calendar-links.tsx`
  - `README.md`（現行導線は `/api/calendar/<event_id>` と `/api/calendar/ics/<event_id>` の説明のみ）
- 改善案:
  - 旧互換ルート削除、または互換APIとしてREADME/仕様書に追記。
- 対応状況: 対応済み（旧互換ルート `src/app/api/calendar/route.ts` を削除）

### [AUDIT-002]

- 分類: ドキュメント齟齬
- 重大度: Medium
- 対象: 最近アクセス履歴仕様
- 現状:
  - 仕様書ではローカルストレージキーが `eventHistory` と記載されている。
  - 実装は `multi_schedule_event_history` を利用している。
  - 仕様書では最大件数の例が 20 件だが、実装既定値は 10 件（同期上限は 30 件）。
- 期待:
  - 仕様書を実装に合わせる、または実装を仕様に合わせる。
- 影響:
  - 保守時に「想定と違うキー/件数」で不具合調査が遅れる。
- 根拠:
  - `specifications/event-history-feature.md`
  - `src/lib/utils.ts`
- 改善案:
  - 仕様書に「現在値（キー/上限）」を明記し、例示ではなく正式値に統一。
- 対応状況: 対応済み（仕様書を実装値へ更新）

### [AUDIT-003]

- 分類: 実装齟齬（入力バリデーション）
- 重大度: Low
- 対象: URL/IDから開く機能
- 現状:
  - `src/components/event-open-form.tsx` のID判定は `^[\w-]{8,}$`。
  - 現在の公開トークンは英数字12文字固定生成（`src/lib/token.ts`）かつDB制約は10〜64文字。
- 期待:
  - 画面側バリデーションを実際のトークン仕様（英数字・最小長10）に寄せる。
- 影響:
  - 不正値でも遷移して404になり、入力エラーを画面で早期検出できない。
- 根拠:
  - `src/components/event-open-form.tsx`
  - `src/lib/token.ts`
  - `supabase/migrations/20250610000000_update_public_token_format.sql`
- 改善案:
  - 正規表現を `^[0-9A-Za-z]{10,64}$` へ変更（必要ならハイフン許容方針を別途決定）。
- 対応状況: 対応済み（実装バリデーションを公開トークン仕様へ更新）

### [AUDIT-004]

- 分類: テスト運用上のリスク
- 重大度: Medium
- 対象: E2E実行導線
- 現状:
  - `npm run test:e2e:chrome` 実行で公開フロー側（`test:e2e:chrome:public`）はサーバー自動起動を行わない。
  - 実行環境に `http://localhost:3000` が期待通り立っていない場合、ページが404となり公開フローE2Eが連鎖失敗する。
  - READMEには注意があるが、「推奨コマンド」の説明だけを見ると前提を見落としやすい。
- 期待:
  - 推奨コマンドが自己完結するか、前提条件が同じ箇所で明示される。
- 影響:
  - テスト失敗が実装起因か環境起因か判別しづらくなる。
- 根拠:
  - `package.json`（`test:e2e:chrome:public`）
  - `README.md`（E2E説明）
  - 実行結果: 404系失敗（トップ/作成/LINE/OG APIの複数ケース）
- 改善案:
  - `test:e2e:chrome` に公開フロー用サーバー起動を内包する、またはREADMEの推奨記述を「サーバー起動済み前提」に揃える。
- 対応状況: 対応済み（READMEで事前サーバー起動前提を明示）

### [AUDIT-005]

- 分類: 潜在リスク（要確認）
- 重大度: Medium
- 対象: `finalized_dates` のRLSポリシー
- 現状:
  - `finalized_dates` に `INSERT/UPDATE/DELETE USING (true)` ポリシーが定義されている。
  - 一方で本プロジェクト方針は「書き込みはサーバー側（service role）経由」。
- 期待:
  - RLS方針と実ポリシーの整合が取れていること（必要性が明文化されていること）。
- 影響:
  - DB権限付与設定次第では、意図しない直接書き込みを招く可能性。
- 根拠:
  - `supabase/migrations/20250429000000_add_insert_policy_to_finalized_dates.sql`
  - `docs/architecture/access-policy.md`
- 改善案:
  - 直接書き込みを許容しない運用なら、ポリシー条件の絞り込みまたは権限設定の明記を行う。
- 対応状況: 対応済み（`finalized_dates` の過剰書き込みポリシーを削除）

### [AUDIT-006]

- 分類: 改善提案（テストノイズ）
- 重大度: Low
- 対象: ユニットテスト実行ログ
- 現状:
  - ユニットテストは全件成功（54 suites pass）だが、`window.scrollTo` 未実装由来の `console.error` が大量出力される。
- 期待:
  - 失敗でないノイズは抑制され、実際の不具合ログが埋もれない状態。
- 影響:
  - CIログ可読性低下、障害切り分け速度低下。
- 根拠:
  - `src/components/event-form-client.tsx`（`window.scrollTo`）
  - `npm run test:unit` 実行ログ
- 改善案:
  - Jestセットアップで `window.scrollTo` をモックし、不要なエラーログを抑制。
- 対応状況: 対応済み（Jestセットアップで `window.scrollTo` を共通モック化）

## 4. 実行検証結果

- `npm run lint`: 完走（エラーなし）
- `npm run test:unit`: 完走（54 suites pass / 317 pass / 1 skip）
- `npm run test:e2e:chrome`: 失敗（公開フロー側で404起点の失敗を複数確認）

## 5. 全体再確認

- 仕様書・実装・テスト実行結果を突合し、監査観点（実装齟齬 / ドキュメント齟齬 / 潜在リスク / 改善余地）の洗い出しを再確認済み。
- 本書に記載した6件を現時点の監査結果として確定。

## 追記テンプレート

### [ID]

- 分類: 実装齟齬 / ドキュメント齟齬 / 潜在リスク / 改善提案
- 重大度: Critical / High / Medium / Low
- 対象: （ファイル、機能、仕様節）
- 現状:
- 期待:
- 影響:
- 根拠:
- 改善案:
- 対応状況: 未対応 / 対応中 / 対応済み

## 最終まとめ（最終工程で記載）

- 監査範囲:
  - 仕様書群（機能別仕様含む）、主要設計ドキュメント、`src` 全域の主要機能実装、Supabaseマイグレーション、E2E/ユニットテスト実行結果。
- 主要な指摘:
  - 旧互換カレンダーAPIの残存（仕様理解コスト増）
  - 履歴仕様書と実装値（ストレージキー・件数）の不一致
  - URL/ID入力バリデーションが実トークン仕様より緩い
  - E2E推奨実行導線の前提が見落とされやすい
  - `finalized_dates` のRLS方針に確認余地
  - ユニットテストのログノイズ
- 直近で対応すべき項目:
  1. E2E実行導線の整理（自己完結化 or 前提の明確化）
  2. 履歴仕様書の実装追従（キー/件数の明記）
  3. 旧互換カレンダーAPIの扱い方針決定（削除 or 明示）
- 仕様・設計側で追記すべき項目:
  - 履歴ローカルストレージキーと保持件数の正式値
  - 旧互換APIを残す場合の互換ポリシー
  - RLSポリシーと運用権限（特に `finalized_dates`）の明文化
- 平易な説明:
  - 大きな機能は動いていて、lintとユニットテストも通っています。
  - ただし「設計書と実装が少しずれている部分」と「運用時に混乱しやすい部分」が見つかりました。
  - すぐ直すべきなのは、テスト実行手順の分かりにくさと、仕様書の更新漏れです。
  - ここを整えると、今後の改修や不具合調査がかなり楽になります。
