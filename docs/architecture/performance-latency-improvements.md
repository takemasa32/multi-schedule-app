# 体感最適化と整合性担保（2026-02-27）

## 目的

- `/event/[public_id]`・`/event/[public_id]/input`・`/account` の待機時間を短縮する。
- 回答送信後の `履歴 / 紐づけ / 予定反映 / 画面再表示` を欠落させない。
- DB 変更は add-only とし、既存データへ破壊的影響を与えない。

## 実施内容

### 1. イベント取得の重複削減

- `getEvent` はシグネチャを維持しつつ、内部実装を request-scope キャッシュ経由へ変更。
- 表示時の `events.last_accessed_at` 更新を廃止し、参照のみで write が発生しない構成へ変更。

### 2. 回答送信の一括保存

- 新規 RPC `submit_availability_bundle` を追加。
- 参加者更新・回答保存・紐づけ更新・予定反映・override 更新・`last_accessed_at` 更新を 1 RPC で処理。
- `submitAvailability` は既存シグネチャを維持し、内部で新RPCを利用。

### 3. 同期プレビューの N+1 解消

- `fetchUserAvailabilitySyncPreview` を一括取得ベースへ変更。
- 対象イベント限定のために `options?: { targetEventIds?: string[]; excludeEventId?: string }` を追加。
- 既存呼び出し（引数なし）は互換維持。

### 4. アカウント画面の保存バッチ化

- 週次保存は `upsertWeeklyTemplatesFromWeekdaySelections` の単発呼び出しへ統一。
- 日付ブロック保存は `saveUserScheduleBlockChanges` を追加し、1回の Server Action で upsert/delete を実行。

### 5. 履歴同期の一括化

- 新規 RPC `upsert_event_access_histories_bulk` を追加。
- `syncEventHistory` はループRPCから一括RPCへ変更。

### 6. 非必須後処理の失敗可視化

- `submitAvailability` の返却へ `warningCodes?: string[]` を追加（成功レスポンスのまま警告を返せる形）。
- 非必須後処理（履歴同期・イベント紐づけ）は `fulfilled` 結果の中身も判定し、失敗を見逃さない。
- 失敗時は `POST_SYNC_PARTIAL_FAILURE` を返し、UI は `sync_warning=partial` クエリで遷移先へ伝播する。

### 7. 閲覧時アクセス更新の復元（stale更新）

- 新規 RPC `touch_event_last_accessed_if_stale(...)` を追加。
- `generateMetadata` では呼ばず、実ページ描画時のみ呼び出す。
- 一定間隔以内の再アクセスでは更新を抑止し、不要writeを削減する。

### 8. 週テンプレ保存APIの互換維持

- `upsertWeeklyTemplatesFromWeekdaySelections` へ `allowClear?: boolean` を追加。
- デフォルトは `allowClear=false` とし、`templates=[]` は従来どおりエラー。
- 明示的な全削除が必要な場合のみ `allowClear=true` を指定する。

### 9. E2E実行基盤の安定化

- `test:e2e:chrome:public` は実行時に自動で build/start/wait-on を行う。
- 認証付きE2Eは `authjs.users` / `public.user_schedule_blocks` の存在を事前確認し、不足時は理由付きskipにする。

## 公開APIの変更

- 追加: `fetchUserAvailabilitySyncPreview(options?)`
- 追加: `saveUserScheduleBlockChanges(input)`
- 追加: `submitAvailability(...): { warningCodes?: string[] }`（成功レスポンス拡張）
- 追加: `upsertWeeklyTemplatesFromWeekdaySelections({ ..., allowClear?: boolean })`
- 追加: `submit_availability_bundle(...)`（DB RPC）
- 追加: `touch_event_last_accessed_if_stale(...)`（DB RPC）
- 追加: `upsert_event_access_histories_bulk(...)`（DB RPC）
- 維持: `getEvent`, `submitAvailability`, `update_participant_availability`

## 非破壊DB変更

- 追加インデックス
  - `participants(event_id, created_at)`
  - `event_dates(event_id, start_time)`
- 既存列・既存制約の削除や型変更はなし。

## 互換ラッパー方針

- `getEvent` は互換維持のための入口として残す。
- 追加APIは必要最小限のみ公開し、未参照APIは同一PR内で削除する。

## 削除判定条件

以下を満たした場合に互換経路の削除を検討する。

1. 既存呼び出し箇所が新経路へ移行済みであること。
2. `npm run test:unit` と `npm run build` が通ること。
3. `rg` で未参照の公開関数が残っていないこと。
