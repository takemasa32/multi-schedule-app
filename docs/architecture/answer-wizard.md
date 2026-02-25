# 回答ウィザード設計メモ（現行実装）

作成日: 2026-02-19  
最終更新日: 2026-02-25

## 背景

- 回答入力を段階化し、入力ミスと離脱を減らす。
- アカウント予定（各日予定 / 週予定）を使って初期入力負荷を下げる。
- 未ログイン回答を維持しつつ、ログインユーザーの同期導線も維持する。

## 新規回答フロー

### Step1: 回答者情報

- 必須: `お名前`
- 未ログイン時ボタン:
  - `ログインして進む`
  - `ログインせずに進む`
- ログイン復帰後は Step1 を再表示して再評価する。

### Step2: 曜日一括入力（条件付き）

- 表示条件: `!isAuthenticated || uncoveredDayCount > 0`
- 非表示条件: `isAuthenticated && uncoveredDayCount === 0`
- 役割: 曜日×時間帯で入力し、イベント候補枠へ一括反映する。
- 反映時の保護:
  - 各日予定由来で自動反映済みの枠（`dailyAutoFillDateIds`）は上書きしない。
  - ヒートマップで手動編集済みの枠は上書きしない。
- ログイン時に曜日表を編集し、かつ週予定差分ありの場合:
  - `週予定の更新` モーダルを表示
  - `更新して次へ` / `更新せず次へ`

### Step3: 予定確認・修正

- ヒートマップ表で最終確認・修正する。
- 競合枠（確定イベント重複）はセル操作時に確認して上書き可能。
- アカウント予定の各日反映がある場合、反映期間を控えめに表示する。
- `○` が1件以上ない場合は Step4 へ進めない。

### Step4: 確認・送信

- 表示内容:
  - `お名前`
  - `参加可能枠（○）件数`
- 利用規約同意を必須とする。
- 送信時、ログイン済みかつ同期対象ありの場合のみ `sync_scope` モーダルを表示:
  - `このイベントのみ`（`current`）
  - `アカウント予定に保存して反映`（`all`）
  - `確認へ戻る`（確認ステップへ戻って入力を見直す）

## 編集回答フロー

- StepA: 曜日一括入力（条件付きでスキップ）
- StepB: 予定確認・修正
- StepC: 確認・送信

※ 編集回答ではログイン選択ステップは持たない。

## ScheduleContext（現行）

`src/lib/schedule-actions.ts` の `getUserScheduleContext` が返却:

- `isAuthenticated`
- `hasSyncTargetEvents`
- `lockedDateIds`
- `autoFillAvailabilities`
- `dailyAutoFillDateIds`
- `overrideDateIds`
- `coveredDateIds`
- `uncoveredDateKeys`
- `uncoveredDayCount`
- `requireWeeklyStep`
- `hasAccountSeedData`

### 算出上の重要点

- `autoFillAvailabilities` は `blocks` 優先、未該当時のみ `templates` を参照する。
- `uncoveredDayCount` は「週予定ではなく各日予定（blocks）+ locked」ベースで算出する。
  - `computeAutoFillAvailability(... templates: []) !== null` の枠を各日カバー扱い。
- `dailyAutoFillDateIds` は、各日予定由来で実際に自動反映された枠のみを保持する。

## 非目標

- `submitAvailability` の I/O 変更
- DB スキーマ変更
- 未ログイン回答の廃止
