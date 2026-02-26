# カレンダー操作UI共通ロジック

作成日: 2025-10-17  
作成者: Codex（GPT-5）

## 背景

- イベント回答ページ、イベント作成（手動選択）、週ごと回答入力でカレンダー操作UIが重複実装されていた。
- ドラッグ・範囲選択・タッチ操作などの挙動がページごとに乖離し、回帰リスクと機能拡張コストが高かった。
- 共通ロジックを一箇所で保守し、ページ固有要件（週開始曜日など）はパラメータで切り替える方針。

## 全体構成

```
src/hooks/useSelectionDragController.ts  ← 操作ロジック（入力共通）
 ├── src/components/manual-time-slot-picker.tsx
 ├── src/components/availability-form.tsx（イベント回答 UI）
 └── 週次入力マトリクス（同ファイル内）
```

### ロジック層（useSelectionDragController）

- **役割**: ポインターイベント（PointerEvent）を集約し、セル集合に対する ON/OFF 適用・範囲選択・スクロール制御を行う。
- **主な責務**
  - `pointerdown/pointermove/pointerup` の捕捉と `document.elementFromPoint` を用いたセル解決
  - `rangeResolver` による連続セルの算出（回答ページでは日付 ID の配列に沿った範囲適用）
  - ボディスクロール抑止（overflow/touchAction を退避・復元）
  - キーボード操作（Space/Enter）でのトグル（必要時のみ `focusable` を付与）
  - セル以外から押下されたまま移動してきたポインタでも `pointermove` でセル上に侵入したタイミングでドラッグを開始し、ドラッグ中のポインタ ID を記録してスムーズに範囲更新を継続
- **拡張ポイント**
  - `shouldIgnorePointerDown/Enter`: スクロール検知やページ固有モードの無効化に利用
  - `resolveInitialIntent`: トグル以外の初期状態（例: 強制 ON/OFF）を注入可能
  - `enableKeyboard`: 今後アクセシビリティ対応を段階導入するためのフラグ

### UI層での適用

- `getCellProps(key, options)` をインタラクション要素にスプレッドして利用
- 共通で `data-selection-key` 属性を付与し、ロジック層が DOM → key を逆引き
- 手動選択/週次入力は `disabled` オプションで編集不可モードを制御
- イベント回答ページはヒートマップUIを中心に同一コントローラを使用
- 手動選択 UI では週単位で整列したキー配列を生成し、回答 UI と同様に連続範囲ドラッグを適用
- イベント管理ページの「候補日程の追加」手動モードでも同コンポーネントを共有し、既存日程のキーは `disabledSlotKeys` 経由で渡して重複選択を抑止する。
- `ManualTimeSlotPicker` / `DateRangePicker` は `forcedIntervalMinutes` を受け取ると時間枠の長さを固定し、既存イベントのインターバルを維持したまま追加候補を生成する。
- 候補日程追加モーダルで `DateRangePicker` を開いた際は、既存イベントの代表的な開始・終了時刻とインターバルを初期値として適用し、追加候補の初期表示が既存パターンと揃うようにする。手動選択モードの `ManualTimeSlotPicker` でも同じ値を初期設定として引き継ぎ、時間粒度や時間帯を再設定せずに候補枠を追加できるようにする。
- 候補日程追加UIでは既存日程を解析し、パターンが一定であれば自動延長モードを、そうでなければ手動選択モードを初期表示として選択する。

## ページ別パラメータ

| ページ               | rangeResolver                | shouldIgnorePointerDown  | 備考                                                    |
| -------------------- | ---------------------------- | ------------------------ | ------------------------------------------------------- |
| イベント回答         | 日付 ID 配列に基づく連続範囲 | 週次モード中は true      | `touchAction` をドラッグ中のみ none                     |
| イベント作成（手動） | 単一セル（ペイント方式）     | -                        | 週単位でセルを塗る操作に最適化、`enableKeyboard: false` |
| 週ごと回答入力       | 単一セル（曜日×時間帯）      | 週次モード OFF 時に true | key を `weekday__timeslot` に統一                       |

## 共通仕様

- 週の開始曜日は常に **月曜日 (`weekStartsOn: 1`)**。ヒートマップ・手動選択・週次入力の各ビューで列順序とページネーションを揃える。
- ヒートマップのセル表示は下記ルールに統一する。
  - 対応するイベント日付が存在しない列（プレースホルダ）は `-` を表示する。
  - イベントは存在するが参加可能人数が 0 人の場合は `0` を表示し、背景は集計値 0 として扱う。
  - 集計対象があり、最小カラー表示人数未満のセルはグレースケール適用で視覚的に区別する。

### ヒートマップビュー（回答集計UI）

- 旧実装で利用していた `heatmapLevel` はデータ構造上は保持するが、描画時は `availableCount / maxAvailable` の比率から不透明度を算出する。`0.2` を最低値として `Math.round(raw / 5) * 5` で 5% 刻みに丸め、`rgba(var(--p-rgb), opacity)` で単色グラデーションを実現する。
- `totalResponses === 0` のセルは数値 `0` を表示しつつ背景色は透明（回答なし）とし、視覚的には空欄に近い扱い。スクリーンリーダー向けに `回答なし` の sr-only テキストを併記する。
- 選択中のセルは `border-success` + 角ステータスドットを描画し、主催者が確定候補を把握しやすくする。
- `minColoredCount` を props で受け取り、UI では「フィルター設定」アコーディオン + range スライダーで閾値を変更可能。値は `0〜maxAvailable` を 1 刻みで指定し、閾値未満のセルへは `filter: grayscale(1)` を適用する。現在値はバッジ表示し、文言も `〜人未満の時間帯をグレー表示` と同期。
- モバイル操作では `onTouchStart/Move/End` で 10px 以上の移動をドラッグとみなし、`isDraggingRef` を立てることでスクロール中はツールチップを抑止する。`useDragScrollBlocker` から渡される `isDragging` も考慮し、スクロールジェスチャとセルタップ（ツールチップ表示）が競合しないようにしている。
- ツールチップは `onPointerEnter/Leave/Up` で制御する。マウス環境ではホバー開始/終了で表示を切り替え、タッチ環境では PointerUp（タップ）で表示。スクロール検知中 (`isDragging === true`) や空セルではイベントを握り潰す。

## テスト

- `src/components/__tests__/manual-time-slot-picker.test.tsx`
- `src/components/__tests__/availability-form.test.tsx`
  - PointerEvent ポリフィルを `jest.setup.js` に追加し、JSDOM 環境でも共通ロジックを実行可能にした
  - グローバル `pointermove` でセル上に侵入した際にドラッグが開始されるパスをモックし、セル外からのドラッグ開始も回帰テストで担保

## 今後の拡張余地

- `resolveInitialIntent` を利用した「常にON」「範囲固定」などのカスタムモード
- `enableKeyboard` を true に設定し、フォーカス管理を導入（data-testid と組み合わせ）
- `rangeResolver` を2次元（行列）用に差し替え、時間帯ブロック全体選択を実現
- ログ計測用のフックポイント（onDragStart/onDragEnd）にOpenTelemetryイベントを接続

## 開発メモ

- 既存実装の `no-scroll` クラスは CSS 未定義だったため、overflow/touchAction を直接制御する実装で置き換え
- 週次UIは `selected` フラグを従来挙動（過去互換）として維持。将来的に `timeSlots` から自動算出する際は別途ドメイン仕様を決めてから調整する。
