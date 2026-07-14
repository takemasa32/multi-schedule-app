# 候補日程追加 UX Design QA

- Source visual truth: `C:/Users/takem/.codex/visualizations/2026/07/14/019f6244-a56b-7872-bd5d-99477fd1a476/event-schedule-audit/03-add-schedule-period.png`
- Implementation screenshots:
  - `C:/Users/takem/.codex/visualizations/2026/07/14/019f6244-a56b-7872-bd5d-99477fd1a476/event-date-add-pr/02-desktop-open.png`
  - `C:/Users/takem/.codex/visualizations/2026/07/14/019f6244-a56b-7872-bd5d-99477fd1a476/event-date-add-pr/03-mobile-open.png`
- Viewport: desktop default / mobile 390 × 844
- State: 候補日程追加フォーム展開、同じ時間割で追加を選択

## Full-view comparison evidence

旧画面では追加フォームがデスクトップ右半分だけに展開され、左側に未使用領域が残っていた。更新後はイベント日程管理セクション全幅へ展開され、日付入力、追加件数、実行ボタンを同じ視線上で確認できる。モバイルでは横スクロールや操作要素の欠けがなく、主要CTAまで1カラムで到達できる。

## Focused region comparison evidence

- Fonts and typography: 既存のフォント、見出し階層、ウェイトを維持。方式名とCTAのみ目的が分かる文言へ変更。
- Spacing and layout rhythm: 展開時の未使用左カラムを廃止し、閉じる操作を見出し右側へ移動。既存の `surface`、`card`、余白トークンを維持。
- Colors and visual tokens: `btn-primary`、`btn-outline`、`bg-base-200/60` を使用し、既存テーマのライト／ダーク両方に追従。
- Image quality and asset fidelity: この画面に追加・変更対象となる画像アセットはない。
- Copy and content: 「同じ時間割で追加」「日時を個別に選ぶ」、追加日数・枠数、追加期限を明示。

## Findings

P0、P1、P2の未解決事項なし。

## Comparison history

1. P2: 展開フォームが右半分に限定され、デスクトップで大きな空白が発生していた。
   - Fix: 親コンポーネントへ開閉状態を通知し、展開中は日程確定欄を隠して追加フォームを全幅化。
   - Post-fix evidence: `02-desktop-open.png`。
2. P2: 選択中方式が `disabled` 表現となり、使用不可に見えていた。
   - Fix: ボタンを常に操作可能にし、`aria-pressed` と既存の primary / outline トークンで状態を表現。
   - Post-fix evidence: `02-desktop-open.png`、`03-mobile-open.png`。
3. P2: 初期状態が「追加なし」でCTAも無効だった。
   - Fix: 既存最終日の翌日を初期値にし、追加日数・枠数と期限を初期表示。
   - Post-fix evidence: `02-desktop-open.png`、`03-mobile-open.png`。

## Verification

- Primary interactions: フォーム開閉、追加方式切り替え、期間ベースの初期プレビューを確認。
- Console errors: なし。
- Responsive: デスクトップと 390 × 844 で確認。

## Follow-up polish

P3の継続課題なし。

final result: passed
