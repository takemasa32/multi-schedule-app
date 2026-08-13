# 回答ウィザード設計メモ（現行実装）

作成日: 2026-02-19  
最終更新日: 2026-07-29

## 背景

- 回答入力を段階化し、入力ミスと離脱を減らす。
- アカウントの日付ごとの予定を使って初期入力負荷を下げる。
- 未ログイン回答を維持しつつ、ログインユーザーの同期導線も維持する。

## 新規回答フロー

### Step1: 回答者情報

- 必須: `お名前`
- 未ログイン時ボタン:
  - `ログインして進む`
  - `ログインせずに進む`
- ログイン復帰後は Step1 を再表示して再評価する。

### Step2: 曜日一括入力（条件付き）

- 表示条件: `!isAuthenticated || requireWeeklyStep`
- 非表示条件: `isAuthenticated && !requireWeeklyStep`
- 役割: 曜日×時間帯で入力し、イベント候補枠へ一括反映する。
- 反映時の保護:
  - 各日予定由来で自動反映済みの枠（`dailyAutoFillDateIds`）は上書きしない。
  - ヒートマップで手動編集済みの枠は上書きしない。
- ログイン時の曜日一括入力は現在の回答だけに反映し、アカウントには保存しない。

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
- 送信時はイベント回答だけを保存し、成功後に
  `/event/{public_id}/input/complete?participant_id={participant_id}` へ遷移する。
- 回答送信だけでは `user_schedule_blocks` を変更しない。
- 回答保存の一部同期に失敗した場合は `sync_warning=partial` を付け、完了画面で警告する。

### Step5: 回答完了とアカウント保存（条件付き）

- 未ログイン:
  - 回答完了を表示する。
  - ログインすると次回入力へ利用できることを補足する。
  - `イベント結果を見る` で `/event/{public_id}` へ戻る。
- ログイン済みかつ participant ID あり:
  - `この回答をアカウントに保存しますか？` を表示する。
  - `保存しない`: `/event/{public_id}` へ戻る。
  - `保存する`: 回答内容を `user_schedule_blocks` へ明示保存する。
- 保存後に他イベントへの反映候補がある場合:
  - `他の回答済みイベントにも反映しますか？` を表示する。
  - `反映しない`: `/event/{public_id}` へ戻る。
  - `反映する`: `/event/{public_id}/input/sync-review` へ遷移する。
- 保存後に反映候補がない場合:
  - 保存完了を表示し、約1.2秒後に `/event/{public_id}` へ自動遷移する。

### Step6: 回答イベントへの反映確認（条件付き）

- 表示条件: Step5 でアカウント保存後、他イベントへの反映を選んだ場合。
- 対象: 現在イベント以外で、未来の候補日時に回答差分があるイベント。
- 挙動:
  - 差分0件なら画面表示せず `/event/{public_id}` へ自動遷移。
  - イベントごとに差分を確認し、`この変更を適用` を実行できる。
  - 最後の対象を適用して差分0件になったら `/event/{public_id}` へ自動遷移。
  - 差分が残っていても `イベント結果ページへ戻る` で離脱できる。

## 編集回答フロー

- StepA: 曜日一括入力（条件付きでスキップ）
- StepB: 予定確認・修正
- StepC: 確認・送信

※ 編集回答ではログイン選択ステップは持たない。

## イベント詳細の回答者表示

- イベント詳細ページの回答状況では、マスをホバーまたはタップした時に出る回答者一覧で、参加者名の右側に `最終更新 M/D HH:mm` を小さく併記する。
- 表示選択の参加者バッジはフィルター操作に集中させるため、最終更新日時は表示しない。
- 最終更新日時は該当マスの `availabilities.created_at` を利用し、回答データに日時が無い場合は `participants.created_at` をフォールバックとして扱う。
- 参加者のコメントのみを更新した場合、現行スキーマには `participants.updated_at` が無いため、回答保存時に再作成される availability 行の作成日時を実質的な回答更新時刻として表示する。

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

- `autoFillAvailabilities` は各日予定（`user_schedule_blocks`）と確定イベント重複のみを参照する。
- `uncoveredDayCount` は各日予定（blocks）+ locked ベースで算出する。
  - `computeAutoFillAvailability(...) !== null` の枠を各日カバー扱い。
- `dailyAutoFillDateIds` は、各日予定由来で実際に自動反映された枠のみを保持する。

## 非目標

- 未ログイン回答の廃止
- 曜日一括入力をアカウント週予定として永続保存すること
