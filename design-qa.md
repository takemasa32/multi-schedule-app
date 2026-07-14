# Design QA

- source visual truth path: `/tmp/daysynth-breadcrumb-audit/01-event-detail-breadcrumb.jpg`
- implementation screenshot path: `/tmp/daysynth-back-link-final/event-detail-back-link-desktop-light.png`, `/tmp/daysynth-back-link-final/event-detail-back-link-mobile-light.png`, `/tmp/daysynth-back-link-final/event-detail-back-link-mobile-dark.png`
- viewport: 既存ブラウザー幅 682 × 1502、モバイル 390 × 844
- state: イベント詳細、ライト／ダークテーマ、未確定イベント

## Full-view comparison evidence

戻るリンクをイベントタイトルより前へ配置し、回答CTA、集計表の構成は維持した。ページ固有の現在地表示が重複せず、既存コンテンツの幅、カード形状、タイポグラフィ、配色に意図しない変更がないことを確認した。

## Focused region comparison evidence

- 変更前の「ホーム / イベント詳細」と変更後の「← ホームへ戻る」を同時に目視比較した。
- リンクは13px・標準ウェイトの補助テキスト、14pxのArrowLeft、44pxの操作領域で表示される。
- ライト／ダークともにニュートラルな補助色を維持し、主要CTAのブランド紫と競合しない。
- アクセシブルネーム「ホームへ戻る」とナビゲーションラベル「戻るナビゲーション」をDOMで確認した。
- DOM順が「戻るナビゲーション → イベント名のh1 → 回答操作」であることを確認した。
- ヘッダー直後のページ余白をモバイル16px・デスクトップ24pxとし、戻るリンクの44px操作領域を含めてもタイトルカードから離れすぎないことを確認した。

## Findings

P0、P1、P2の差異なし。戻り先はブラウザー履歴に依存しない `/` とし、共有URLから直接開いた場合も動作する。残存するP3の調整事項なし。

## Comparison history

- 初回: パンくずの現在ページ名がイベントタイトルと役割上重複し、戻る操作として判別しづらかった。
- 修正: 区切りと現在ページ名を削除し、ArrowLeft付きの短い「ホーム」へ変更した。アクセシブルネームでは「ホームへ戻る」を維持した。
- 再確認: 390 × 844のライト／ダーク表示、タイトル前の配置、44pxの操作領域、ホームへの実遷移を確認した。

final result: passed
