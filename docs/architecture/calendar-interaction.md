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
- **拡張ポイント**
  - `shouldIgnorePointerDown/Enter`: スクロール検知やページ固有モードの無効化に利用
  - `resolveInitialIntent`: トグル以外の初期状態（例: 強制 ON/OFF）を注入可能
  - `enableKeyboard`: 今後アクセシビリティ対応を段階導入するためのフラグ

### UI層での適用

- `getCellProps(key, options)` をインタラクション要素にスプレッドして利用
- 共通で `data-selection-key` 属性を付与し、ロジック層が DOM → key を逆引き
- 手動選択/週次入力は `disabled` オプションで編集不可モードを制御
- イベント回答ページではビュー切替（リスト/テーブル/ヒートマップ）すべて同一コントローラを使用
- 手動選択 UI では週単位で整列したキー配列を生成し、回答 UI と同様に連続範囲ドラッグを適用

## ページ別パラメータ

| ページ               | rangeResolver                | shouldIgnorePointerDown  | 備考                                                    |
| -------------------- | ---------------------------- | ------------------------ | ------------------------------------------------------- |
| イベント回答         | 日付 ID 配列に基づく連続範囲 | 週次モード中は true      | `touchAction` をドラッグ中のみ none                     |
| イベント作成（手動） | 単一セル（ペイント方式）     | -                        | 週単位でセルを塗る操作に最適化、`enableKeyboard: false` |
| 週ごと回答入力       | 単一セル（曜日×時間帯）      | 週次モード OFF 時に true | key を `weekday__timeslot` に統一                       |

## 共通仕様

- 週の開始曜日は常に **月曜日 (`weekStartsOn: 1`)**。ヒートマップ・手動選択・週次入力の各ビューで列順序とページネーションを揃える。

## テスト

- `src/components/__tests__/manual-time-slot-picker.test.tsx`
- `src/components/__tests__/availability-form.test.tsx`
  - PointerEvent ポリフィルを `jest.setup.js` に追加し、JSDOM 環境でも共通ロジックを実行可能にした

## 今後の拡張余地

- `resolveInitialIntent` を利用した「常にON」「範囲固定」などのカスタムモード
- `enableKeyboard` を true に設定し、フォーカス管理を導入（data-testid と組み合わせ）
- `rangeResolver` を2次元（行列）用に差し替え、時間帯ブロック全体選択を実現
- ログ計測用のフックポイント（onDragStart/onDragEnd）にOpenTelemetryイベントを接続

## 開発メモ

- 既存実装の `no-scroll` クラスは CSS 未定義だったため、overflow/touchAction を直接制御する実装で置き換え
- 週次UIは `selected` フラグを従来挙動（過去互換）として維持。将来的に `timeSlots` から自動算出する際は別途ドメイン仕様を決めてから調整する。
