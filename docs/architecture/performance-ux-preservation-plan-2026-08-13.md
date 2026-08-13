# 見た目・使い勝手を維持する性能 / UX 改善方針

作成日: 2026-08-13
対象: DaySynth 現行実装
位置づけ: 2026-07-29 の総合監査を、最新のプロダクト判断と実測結果で更新する実装方針

## 1. 結論

権限は現行どおり、公開リンクを知る利用者が同じ操作を行える設計を維持する。権限分離、管理リンク、organizer capability は導入しない。

次の改善は、見た目、文言、URL、操作順、ライト / ダークテーマ、レスポンシブ挙動を変えず、次の順で進める。

1. 計測と視覚回帰テストを先に固定する。
2. 不要なDB往復、逐次処理、重複処理を削る。
3. 巨大なClient Componentを、同じDOMと操作契約のまま分割する。
4. 日時処理と未使用依存を整理し、配信・ビルド・保守コストを減らす。
5. インデックスや新ライブラリは、実測で効果を証明できたものだけ導入する。

「速くなったように見える演出」を追加するのではなく、実際の待ち時間、入力応答、転送量、DB呼び出し回数を減らす。

## 2. 変更しないもの

この改善では以下を不変条件とする。

- 公開リンク利用者の権限と操作範囲
- ログイン不要の回答
- 回答送信とアカウント予定保存の分離
- 日程確定の専用ルートと差分確認
- 現行URL、主要文言、ボタン配置、ステップ順
- DaisyUIを含む現行の配色、余白、角丸、フォーカス表示
- 390pxで成立している曜日表・日付表・ヒートマップ
- ライト / ダークテーマ
- `data-testid` / `data-e2e` とアクセシブルネーム
- Supabaseへのアクセスをサーバーサイドだけに限定する方針
- 更新後は常に最新状態を取得する現行のデータ鮮度

性能改善を理由に、次の変更は行わない。

- 永続キャッシュでイベント詳細を古く見せる
- UI全体の再デザイン
- 装飾アニメーションやスケルトンの追加
- 仮想化による表の読み上げ順・キーボード操作の変更
- TanStack QueryによるServer Componentsとの二重データ取得
- React Aria / XStateへの全面置換
- 根拠のないインデックス追加

## 3. 現在までに実装済みの性能改善

過去の変更を再確認した結果、以下はすでに実装されている。重複して作り直さない。

- `getEvent` の `React.cache` によるリクエスト内重複取得の排除
- イベント詳細の独立クエリを `Promise.all` で並列化
- 重い回答集計の `Suspense` ストリーミング
- `last_accessed_at` 更新を Next.js `after` 経由でレスポンス後に実行
- 回答保存を `submit_availability_bundle` RPCへ集約
- 同期プレビューのN+1クエリ解消
- 履歴同期の一括RPC化
- アカウント予定の週単位遅延取得とページキャッシュ
- Supabaseの1,000件上限を考慮したページネーション
- `Link` とルート別ローディングUIによる画面遷移の空白抑制

既存方針の詳細は [体感最適化と整合性担保](performance-latency-improvements.md) を参照する。

## 4. 今回の実測

### 4.1 実行環境

- WSL / Node.js `v22.20.0`
- Next.js 実インストール `16.2.3`
- Supabase CLI 実インストール `2.84.5`
- ローカルSupabase: `events 159件 / event_dates 3,455件 / participants 197件 / availabilities 1,349件`
- 本番ビルド: コンパイル約5.0秒、TypeScript約6.4秒、静的13ページ生成

注意: `package.json` は Next.js `^16.2.6`、Supabase CLI `^2.108.0` を要求する一方、既存 `node_modules` は古い。改善前に `npm ci` でlockfile基準の再現環境を作り、測定条件を統一する必要がある。

### 4.2 イベント詳細

ローカルSupabaseへ接続した本番サーバーで `/event/SeedToken0001` を5回取得した。

| 状態 | TTFB       | 完了       |
| ---- | ---------- | ---------- |
| 初回 | 約185ms    | 約243ms    |
| 以後 | 約17〜30ms | 約27〜39ms |

Chromeのリロード計測では、46リソース、16スクリプト、記録上約548KBの転送処理、約175msのスクリプト処理を確認した。ブラウザキャッシュとローカルネットワークを含むため本番値ではないが、今後の同条件比較の基準には使える。

![イベント詳細の基準画面](../audit/screenshots/2026-08-13-performance-plan/01-event-detail-baseline.png)

### 4.3 回答画面

回答画面は通常幅、390pxともページ全体の横方向オーバーフローがなく、現行レスポンシブ実装は維持対象と判断した。

![回答画面の基準表示](../audit/screenshots/2026-08-13-performance-plan/02-answer-baseline.png)

![回答画面の390px基準表示](../audit/screenshots/2026-08-13-performance-plan/03-answer-mobile-baseline.png)

### 4.4 DB

回答数が最も多いローカルイベントは936行の `availabilities` を持つ。現行クエリでは `idx_avail_event` が利用されている。現在のローカル規模だけでは追加インデックスの必要性を証明できないため、先に本番相当データで `EXPLAIN (ANALYZE, BUFFERS)` を比較する。

Supabase公式も、クエリパターンに合わせてインデックスを選び、`EXPLAIN` で効果がなければ削除すること、過剰なインデックスは書き込みを遅くすることを案内している。

- [Supabase Query Optimization](https://supabase.com/docs/guides/database/query-optimization)
- [Supabase index_advisor](https://supabase.com/docs/guides/database/extensions/index_advisor)

## 5. 優先改善

### P0: 測定条件と回帰防止を固定する

#### 5.1 依存環境を再現可能にする

実施:

1. WSLのNode.jsを22系へ明記する。
2. `npm ci` で依存を再構築する。
3. `npm ls --depth=0` が `invalid` なしで終了することを確認する。
4. Supabase CLI / `supabase-js` 更新前に最新changelogのbreaking changeを確認する。
5. 更新と性能改善は別PRにし、差分原因を混ぜない。

理由:

現在の `package.json` と実インストールに差があり、この状態では前後比較に再現性がない。2026-06-30以降のSupabaseクライアントはNode.js 22以上を前提とするため、Node.js 20互換の記述も合わせて見直す。

#### 5.2 利用者指標を取得する

新しい分析SDKは最初から追加しない。Next.js標準の `useReportWebVitals` と既存のGoogle Analytics送信経路を使い、個人情報やイベント名を含めずに以下を計測する。

- LCP
- INP
- CLS
- TTFB
- 作成画面表示から作成完了まで
- 回答画面表示から回答完了まで
- ステップ遷移に100ms以上かかった回数
- Server Actionの処理時間と結果コード

目標値:

| 指標                            | 初期目標             |
| ------------------------------- | -------------------- |
| LCP p75                         | 2.5秒以下            |
| INP p75                         | 200ms以下            |
| CLS p75                         | 0.1以下              |
| 回答ステップ切替                | 通常100ms以内        |
| ローカルイベント詳細のwarm TTFB | 現行比で悪化させない |

参考: [Next.js useReportWebVitals](https://nextjs.org/docs/app/api-reference/functions/use-report-web-vitals)、[Web Vitals](https://web.dev/articles/vitals)

#### 5.3 見た目・操作契約を自動固定する

既存Playwrightへ、同じseedを使うスクリーンショット比較を追加する。

対象:

- `/event/[public_id]`
- 回答ウィザード4ステップ
- 日程確定2ステップと確認ダイアログ
- 390 / 768 / 1280px
- ライト / ダーク

比較時は現在時刻、ランダムID、動的更新時刻だけを固定またはマスクする。許容差は最初から広げず、意図した差分だけスナップショットを更新する。

追加する契約テスト:

- 主要文言、リンク先、ボタン順
- `data-testid` / `data-e2e`
- フォーカス移動
- 390pxでページ全体の横スクロールなし
- 200%ズーム時の主要操作到達性
- 回答値と次ステップ反映値の一致

### P1: サーバー待ち時間を減らす

#### 5.4 回答ページの部分的なwaterfallを解消する

現状:

1. イベント取得
2. 候補日・既存回答を並列取得
3. その完了後に `getUserScheduleContext` を開始

`getUserScheduleContext` は候補日を必要とするが、セッション取得は先に開始できる。以下へ整理する。

1. イベント取得後、候補日、既存回答、セッション解決を同時開始
2. 候補日とセッションが揃った時点で予定範囲クエリを開始
3. 同一ページ内でセッションを重複取得しない

表示するpropsと初期値は変更しない。

#### 5.5 イベント詳細のDB往復を減らす

現在はイベント、候補日、参加者、回答、確定日、回答紐づけを並列取得している。並列化は正しいが、外部SupabaseまでのHTTP往復数は残る。

次の順で試す。

1. `select('*')` を画面で必要な列だけへ絞る。
2. Supabaseリクエスト数、受信bytes、TTFBを記録する。
3. 往復時間が支配的な場合だけ、読み取り専用の `get_event_page_bundle` RPCを試作する。
4. 現行並列取得とRPCを同じデータ量で比較し、p75が10%以上改善した場合だけ採用する。

RPC化しても、返す型、並び順、エラー表示、最新性は維持する。レスポンス共有キャッシュは導入しない。

#### 5.6 回答保存後の重複処理を除く

`submit_availability_bundle` はログイン利用者の `user_event_links` を更新しているが、Server Action側でも `upsertUserEventLink` を再実行している。マイグレーションの全バージョンでRPC側更新が保証されることをテストしたうえで、重複呼び出しを1回削減する。

履歴同期は利用者へ返す成功を遅らせない候補だが、現在の部分失敗警告を失わないようにする。単純に `after` へ移すのではなく、次のどちらかを測定して選ぶ。

- 履歴更新を同じRPC内の非致命処理として行い、警告コードを返す
- `after` で実行し、UI警告に代わる再試行・運用検知を用意する

Next.jsの `after` はログや副作用など、レスポンスを待たせる必要がない処理向けである。ただし実行時間上限があるため、大量同期ジョブには使わない。

参考: [Next.js after](https://nextjs.org/docs/app/api-reference/functions/after)

#### 5.7 日程確定後の利用者別逐次同期を外す

`finalizeEvent` は紐づいた利用者を取得し、利用者ごとに `syncUserAvailabilities` を逐次実行してから成功を返している。イベント参加者が増えるほど確定ボタンの待ち時間が線形に増える。

改善案:

1. 確定自体は `finalize_event_safe` の成功時点で返却可能にする。
2. 同期対象を1回で処理するバッチRPCを作る。
3. 小規模ではレスポンス後処理、大規模では再試行可能なジョブへ切り替える。
4. 同期完了までの整合性要件をテストで明記する。

画面は現在と同じ成功バナーへ遷移させる。確定内容の保存だけは非同期化しない。

#### 5.8 DBインデックスは測定後に決める

候補:

- `availabilities(event_id, created_at)`
- `finalized_dates(event_id, created_at)`
- 予定範囲検索向けの `user_schedule_blocks` 索引

採用条件:

1. 本番相当件数のseedを用意する。
2. `EXPLAIN (ANALYZE, BUFFERS)` を保存する。
3. `index_advisor` または仮想インデックスで候補を比較する。
4. 読み取り改善と回答保存の書き込みコストを両方測る。
5. 実行時間またはbuffer readが明確に下がるものだけmigration化する。

`supabase db lint` は現在、`public` に導入されたpgTAP関数由来の警告を大量に返す。アプリ関数と拡張関数を区別したlint手順を先に定義し、警告を一括無視しない。

### P1: クライアント応答を軽くする

#### 5.9 回答ウィザードを同じDOMのまま分割する

`availability-form.tsx` は約1,476行、19個の `useState`、複数の表計算とモーダルを持つ。見た目を変えず、次へ分割する。

```text
event-response/
  response-wizard.tsx
  response-reducer.ts
  steps/
    identity-step.tsx
    weekly-step.tsx
    date-review-step.tsx
    submit-review-step.tsx
  model/
    build-weekly-matrix.ts
    apply-weekly-selection.ts
    build-date-matrix.ts
```

ルール:

- 先に純粋関数と現行挙動のcharacterization testを追加する。
- `useReducer` で遷移を明示するが、ステップ順は変えない。
- ステップコンポーネントへ必要なprimitive値だけ渡す。
- 高頻度のドラッグ値は必要に応じてrefへ分離する。
- `memo` はReact Profilerで再描画が確認できた境界だけに使う。
- JSX、className、アクセシブルネームを分割前後で一致させる。

#### 5.10 ヒートマップの二重計算を減らす

現行コードには、日付ヘッダーごとに全日付のISO配列を再生成するO(n²)処理がある。また、配列の `includes` をループ内で使う箇所がある。

低リスク修正:

- 全日付ISO配列を1回だけ `useMemo` する。
- `finalizedDateIds`、`dailyAutoFillDateIds` などを `Set` 化する。
- 同じ日付変換、時刻ラベル、過去判定を1回の前処理へまとめる。
- 参加可 / 不可集計を一度の走査で作る。
- `Intl.DateTimeFormat` をrender loop外で再利用する。

採用条件:

- 同一データでDOMスナップショットとスクリーンショットが一致
- React Profilerのcommit時間が現行比10%以上改善
- 参加者数 × 候補数が大きいfixtureで操作遅延が悪化しない

表の仮想化は、キーボード・読み上げ・ドラッグ操作を変える可能性があるため、この段階では採用しない。

#### 5.11 後段ステップだけを遅延読込する

初期回答画面に不要な大きいステップを、`next/dynamic` または `React.lazy` で分割できるか検証する。

対象候補:

- 日付確認グリッド
- 送信確認の補助UI
- 日程確定の重い集計UI

条件:

- 次へ押下前にhover / focus / 前ステップ滞在中にpreloadする。
- ステップ遷移時に新しいローディング表示を出さない。
- 初期JavaScriptが10%以上減り、遷移p75が悪化しない場合だけ採用する。

Next.jsのlazy loadingはClient Componentとライブラリを必要時まで遅延し、初期JavaScriptを減らすための仕組みである。

参考: [Next.js Lazy Loading](https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading)

### P2: 依存と日時境界を整理する

#### 5.12 未使用依存を削除する

現行ソースから直接利用を確認できない候補:

- `axios`
- `lodash`
- `framer-motion`
- `motion`
- `@supabase/ssr`
- `bcryptjs` と型定義
- `flatted`
- `follow-redirects`
- `picomatch`

実施前に、設定ファイル、テスト、CLI、transitive dependencyを確認する。1パッケージずつ削除し、lockfile、build、unit、E2Eを通す。削除は主にインストール・CI・供給網・保守コストへ効くものであり、未使用依存の削除を画面JavaScript改善として過大評価しない。

#### 5.13 日時ライブラリを統一する

カレンダーAPIだけで使う `dayjs` を `date-fns` / `date-fns-tz` へ移し、`dayjs` を削除する。

変更前に次をgolden test化する。

- GoogleカレンダーURL
- ICS
- 00:00 / 24:00
- 日跨ぎ
- DSTがあるタイムゾーン
- 日本時間表示

出力文字列が一致する範囲だけを先に置き換え、日時モデル自体の変更は別PRにする。

#### 5.14 入力上限を共通化する

ZodをServer Action入口へ段階導入し、見た目と既存エラーメッセージを維持したまま、過大入力による重い処理を防ぐ。

対象:

- タイトル・説明・名前・コメントの最大長
- 候補日数
- availability配列数
- URL / token / UUID形式
- 開始・終了の相関
- 重複候補

最初は `createEvent` と `submitAvailability` に限定する。フォームライブラリは追加せず、既存FormDataとServer Actionを維持する。

## 6. 導入判断

| 技術                   | 判断               | 理由                                       |
| ---------------------- | ------------------ | ------------------------------------------ |
| `useReportWebVitals`   | 採用               | Next.js標準で追加bundleを抑えられる        |
| Next.js `after`        | 条件付き採用       | 短い非必須処理だけ。大量同期には使わない   |
| React `cache`          | 継続               | 同一リクエスト内の重複排除に限定           |
| `next/dynamic`         | 計測後             | 初期JS削減と遷移待ちの両方を比較する       |
| Zod                    | 段階採用           | 病的入力を境界で拒否し、処理量を制限できる |
| fast-check             | 開発依存として検討 | 日時・候補生成の境界値を広く検証できる     |
| Sentry / OpenTelemetry | 保留               | まず既存基盤と構造化ログで不足を測る       |
| TanStack Query         | 不採用             | 現行Server Componentsと責務が重なる        |
| XState                 | 不採用             | `useReducer` と純粋関数で十分              |
| React Aria全面移行     | 不採用             | 操作感とDOM契約の変更リスクが高い          |
| 表の仮想化             | 保留               | a11yとドラッグ操作を維持できる証拠が必要   |
| 新しいMotion           | 不採用             | 速度改善にならず、既存方針とも合わない     |

## 7. PR分割

### PR 1: 測定基盤と回帰契約

- Node / npm / lockfile整合
- Web Vitals
- Server Action / DB時間の構造化ログ
- 主要画面スクリーンショットテスト
- 性能fixtureと基準値保存

### PR 2: 重複DB処理とwaterfall削減

- 回答ページの部分依存並列化
- 回答後 `user_event_links` 重複upsert削除
- `select('*')` の縮小
- 前後のリクエスト数 / bytes / TTFB比較

### PR 3: 確定後同期のバッチ化

- 利用者別逐次同期の排除
- 失敗時の再試行
- 確定結果と同期状態の整合性テスト

### PR 4: 回答ウィザード内部分割

- 純粋関数のcharacterization test
- reducer化
- ステップ単位のコンポーネント分割
- Profiler比較

### PR 5: ヒートマップ計算量削減

- O(n²)処理除去
- Set / Map前計算
- 大規模fixtureでcommit時間比較

### PR 6: 依存・日時整理

- 未使用依存削除
- dayjs削除
- 日時golden test

### PR 7: DB索引またはbundle RPC

実測で必要だった場合だけ作る。効果が基準未満ならPR自体を作らない。

## 8. 各PRの完了条件

機能確認:

- `npm run lint`
- `npm run typecheck`
- `npm run test:ci -- --runInBand`
- `npm run build`
- ローカルSupabaseで回答、編集、集計、確定を完走

見た目・操作:

- 基準スクリーンショットに意図しない差分なし
- 390 / 768 / 1280pxでページ全体の横スクロールなし
- ライト / ダークで同一情報階層
- キーボード操作、フォーカス、主要アクセシブルネーム維持
- 既存URL、文言、ステップ順、ボタン順維持

性能:

- 改善対象のp75が10%以上改善、または外部リクエストを1回以上削減
- 改善対象外の主要指標を5%以上悪化させない
- DB索引は読み取り改善と書き込み悪化の両方を記録
- bundle分割は初期JSと次ステップ待ち時間を両方記録

運用:

- PII、イベント名、回答者名を性能ログへ含めない
- migrationを伴う場合はrollback方針を記載
- `/docs`、README、CHANGELOG、テストを同じPRで更新

## 9. 実装順の最終判断

最初に着手すべきなのは、画面変更ではなく `PR 1: 測定基盤と回帰契約` である。現状はローカルで十分速いが、本番p75、イベント規模別の遅延、クライアント再描画時間が計測されていない。ここを飛ばしてキャッシュ、仮想化、ライブラリ追加を行うと、見た目と使い勝手を守れたか、実際に速くなったかを判断できない。

その後は、外部往復を確実に1回減らせる回答後の重複upsert、部分waterfall、日程確定後の逐次同期を優先する。巨大コンポーネントの分割と計算量削減は、同じDOMを保証するスクリーンショット・契約テストが整ってから行う。
