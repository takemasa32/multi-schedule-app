# 回答入力UI Design QA（2026-09-08）

## 判定

添付画像は修正前の現状を示す Before 証拠として扱い、After は文章で定義された受け入れ基準に対して判定した。対象は回答入力ウィザードのモバイル UI であり、既存のデスクトップ表示と7日一覧は維持した。

- Source visual truth（Before のみ）: C:/Users/takem/AppData/Local/Temp/codex-clipboard-cadf91e7-1f2d-4c5c-a539-77e7d17819ed.png
- Before の実寸: 376 × 754 px
- After（曜日一括入力）: C:/Users/takem/.codex/visualizations/2026/09/07/01a07c21-9124-7fe3-9491-d20b24091f40/mobile-availability/after-weekly-390x844.png
- After（予定確認・修正）: C:/Users/takem/.codex/visualizations/2026/09/07/01a07c21-9124-7fe3-9491-d20b24091f40/mobile-availability/after-heatmap-390x844.png
- After（デスクトップ初期表示）: C:/Users/takem/.codex/visualizations/2026/09/07/01a07c21-9124-7fe3-9491-d20b24091f40/mobile-availability/desktop-initial-1280x900.png
- Before/After 比較: C:/Users/takem/.codex/visualizations/2026/09/07/01a07c21-9124-7fe3-9491-d20b24091f40/mobile-availability/before-after-comparison.png

比較画像は同一の 390 × 844 CSS viewport にそろえ、Before は元画像を contain 配置した比較用画像である。Before のカード表現や重複見出しを目標として再現するのではなく、ユーザー記載の受け入れ基準を実装後の正とした。

## 対象状態と検証環境

- モバイル: 390 × 844、未ログインの新規回答者、回答者情報入力後の「曜日一括入力」
- 次の状態: 曜日セルを選択して「次へ」を押した「予定確認・修正」
- デスクトップ: 1280 × 900、イベント回答入力の初期状態
- フォント: 既存の Inter / system 系フォントと既存テーマを維持
- 画像アセット: この画面で追加・変更対象なし

## 受け入れ基準と結果

| 優先度 | 受け入れ基準                                                                                            | 結果                                                                                                                                |
| ------ | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| P0     | 入力セル内の縦横ドラッグを優先し、body ロックなしで時刻列・表外からページを縦スクロールできる           | 入力セルだけ touch-action: none、表ラッパーと時刻列は pan-y。body の overflow / touch-action / overscroll-behavior は未変更。       |
| P1     | 640px 未満で回答ウィザード外枠をページ背景と一体化し、不要な入れ子カード・重複 padding を除く           | surface / form shell / 曜日入力面を透明、border 0、radius 0、shadow none、padding 0 に統一。ページ側の左右 16px は維持。            |
| P1     | 「曜日一括入力」の見出しを1つに統合し、progress → title → description → table → guide → next の順にする | 見出しは1つ。DOM 順を単体テストとブラウザ計測で確認。固定ヘッダー下に progress と title が収まるよう自動スクロールを調整。          |
| P1     | 7日一覧を画面内に維持し、左右スクロールを許可しない                                                     | 8列を画面幅へ均等配分。390pxでは曜日セル約44.67px、表とdocumentの scrollWidth / clientWidth が一致。320pxでも横オーバーフローなし。 |
| P2     | 時刻列を中立背景・境界で入力セルから分離し、選択イベントを持たせない                                    | 時刻列に中立背景と右境界を付与し、data-selection-key / aria-pressed を持たせない。                                                  |
| P2     | キーボード操作・aria属性・focus-visible を維持する                                                      | role / aria-label / aria-pressed / aria-disabled と focus-visible の既存挙動を維持。                                                |

## 390 × 844 の測定値

- ページ左右余白: x = 16px
- 回答ウィザード外枠・曜日入力面: 背景 transparent、border 0、border-radius 0、box-shadow none、padding 0
- progress: top = 80.7px、bottom = 120.7px
- ステップタイトル: top = 132.7px
- 曜日入力見出し: top = 172.7px
- 曜日入力セル: 約 44.67 × 45px、min-height = 44px、touch-action = none
- 時刻列: 約 44 × 44px、touch-action = pan-y
- 曜日表ラッパー: clientWidth = 358px、scrollWidth = 358px、overflow-x = hidden
- ヒートマップラッパー: clientWidth = 358px、scrollWidth = 358px、overflow-x = hidden
- document: clientWidth = 390px、scrollWidth = 390px
- body: overflow / touch-action / overscroll-behavior は空文字で、body ロックなし

## 320 × 700 の狭幅確認

- 曜日表ラッパー: clientWidth = 288px、scrollWidth = 288px
- document: clientWidth = 320px、scrollWidth = 320px
- 曜日入力セル: 約 35.92px。7日表示と左右スクロール禁止を優先するため、390px未満では幅を均等縮小する。

## Full-view comparison evidence

Before は外側カード、内側カード、重複した「曜日一括入力」により、モバイルの入力表までの余白と境界が過剰だった。After はページの16px余白を残したまま回答入力面をページ背景へ統合し、progress、タイトル、説明、表、操作案内、CTA が連続して見える。

デスクトップの After では既存のカード、progress、7日一覧、回答者情報フォームを保持し、モバイル専用の境界除去がデスクトップへ波及していない。

## Focused region comparison evidence

- Typography: 既存の見出し階層、フォント、ウェイトを維持。
- Spacing: モバイルの重複 padding とカード間余白を削減し、390pxではページ左右16pxと約44pxの入力セルを維持。
- Colors and boundaries: 入力セルの状態色は既存テーマを維持。時刻列のみ中立背景と右境界で視覚的に分離。
- Interaction: 入力セルだけローカルなタッチ制御を持ち、時刻列・表外はページ縦スクロールを妨げない。
- Copy: 重複見出しを除去し、説明・操作案内・次へボタンの順序を統一。

## Findings

P0、P1、P2 の未解決事項なし。

## Comparison history

1. P1: モバイルの回答ウィザードが外側カードと内側カードの二重表現になっていた。
   - Fix: 640px未満では外枠・入力面の背景、境界、角丸、影、padding を解除し、ページ左右16pxだけを残した。
   - Evidence: after-weekly-390x844.png、before-after-comparison.png
2. P1: 「曜日一括入力」の見出しが重複していた。
   - Fix: ステップ見出しを1つに統合し、入力表をその直下へ配置した。
   - Evidence: availability-form の単体テスト、after-weekly-390x844.png
3. P2: 固定ヘッダー下でステップ遷移後のタイトルが隠れる可能性があった。
   - Fix: 遷移時のスクロール先を progress に変更し、ヘッダー下端から16pxの位置へ調整した。
   - Evidence: progress top = 80.7px、title top = 132.7px、after-heatmap-390x844.png
4. P2: 時刻列が入力セルと同じ選択操作に見えた。
   - Fix: 時刻列から選択イベントを外し、中立背景・境界・pan-y を付与した。
   - Evidence: ブラウザ計測、availability-form の単体テスト
5. P1: 狭幅時の逃げとして表ラッパーに左右スクロールを残していた。
   - Fix: 表を8列の固定レイアウトで均等配分し、曜日表とヒートマップを overflow-x: hidden / touch-action: pan-y へ変更した。
   - Evidence: 390pxと320pxで表・documentとも scrollWidth = clientWidth、availability-form の単体テスト

## Verification

- Primary interactions: 回答者名入力 → ログインせずに進む → 曜日セル選択 → 次へ → ヒートマップセル選択を確認。
- Selection state: 曜日セルの aria-pressed が false から true へ変化し、表示が ○ へ変化することを確認。
- Time column: 選択キー、aria-pressed、選択イベントなしを確認。
- Console: CUA のブラウザ console logs は error / warning ともに空配列。
- Responsive: 320 × 700、390 × 844、1280 × 900 で確認。
- Unit tests: 65 suites passed、382 tests passed、1 skipped。
- Build: next build 成功。
- Prettier: 全対象ファイルで通過。
- Lint: 既存の ESLint 設定解決エラーで実行不能。eslint.config.mjs が eslint-config-next/core-web-vitals を拡張子なしで解決しようとし、ESLint 9.31.0 / eslint-config-next の ESM 解決で ERR_MODULE_NOT_FOUND となる。今回の実装起因の lint エラーではない。

## 残課題

- 320〜389pxでは7日表示と左右スクロール禁止を優先するため、セル幅は44px未満へ均等縮小する。390pxでは約44pxを確保できる。
- 認証済みアカウントの予定表はローカル未認証のため、今回の対象状態には含めていない。

final result: passed
