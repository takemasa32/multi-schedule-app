# GA4 計測設計

## 目的と範囲

DaySynth の公開フローで、利用者がどの段階まで進み、どの操作が成功したかを集計する。対象はブラウザから Google Analytics 4 へ送るページビューと操作イベントであり、イベントや回答の正確な件数をデータベースから集計する仕組みは含めない。

実装は `src/components/analytics/google-analytics.tsx` の型付き allowlist を中心に行う。GA4 用の追加 SDK は導入せず、Google tag の `gtag.js` を利用する。測定 ID が未設定の場合と開発環境では送信しない。送信失敗は画面操作や認証処理へ伝播させない。

## ページビューとプライバシー

初期化時と App Router のパス遷移時に、次の安全なコンテキストを明示して `page_view` を送る。`send_page_view: false` を指定し、ブラウザ履歴の自動ページビューとの二重計測を避ける。

- `page_path` と `page_location` はクエリを除外する。
- `/event/<公開トークン>` と許可された子パスは `/event/[public_id]` として送る。公開トークン、`participant_id`、その他のクエリは送らない。
- 既知の静的ルートだけをそのまま送る。allowlist 外のパスは `/unknown` に固定するため、404 などの任意パスも送らない。
- `page_title` は固定された画面名の allowlist から生成する。初期 inline config では安全な固定値 `DaySynth` を使う。
- 同一オリジンの `page_referrer` はサニタイズ済みの画面パスへ置き換え、外部リファラーはオリジンだけにする。値がない、または不正な場合は明示的に空文字を送る。
- カスタムイベントにも同じページコンテキストを付け、自由な URL、タイトル、入力値をパラメータとして受け付けない。

GA4 管理画面の Enhanced measurement は、カレンダー URL に日付やタイトルが含まれる場合の送信を防ぐため、リリース前に次を無効化する。

- ページビュー（ブラウザ履歴イベントを含む）
- 離脱クリック
- サイト内検索
- フォーム操作

これらはアプリ側の allowlist イベントと手動 `page_view` で必要な集計を行う。Enhanced measurement の設定変更は、本番コードをリリースする前に行い、二重計測がないことを DebugView と Realtime で確認する。

## イベント契約

イベント名は固定し、追加パラメータは `google-analytics.tsx` の型、allowlist、GA4 のカスタム定義を同時に更新する。真偽値は GA4 レポートで扱いやすい `yes` または `no` に正規化する。

| イベント                     | 発火条件                                                               | パラメータ                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `create_started`             | 作成ウィザードを表示したとき。1マウントにつき1回                       | なし                                                                                                |
| `create_step_completed`      | 作成ウィザードの入力検証に成功して次へ進んだとき。ステップごとに1回    | `step`、任意の `input_mode`                                                                         |
| `event_created`              | `createEvent` が成功し、公開トークンを受け取った後、リダイレクトする前 | `input_mode`、`interval_unit`                                                                       |
| `answer_started`             | 新規回答フローを表示したとき。編集では送らない                         | `auth_state`（フロー開始時）                                                                        |
| `answer_step_completed`      | 新規回答で入力検証に成功して次へ進んだとき。ステップごとに1回          | `step`、`auth_state`（フロー開始時）、週入力を経由する `weekly` / `availability` では `weekly_used` |
| `answer_submitted`           | 新規回答の保存が成功したとき                                           | `auth_state`（保存完了時）、`weekly_used`                                                           |
| `answer_edited`              | 既存回答の保存が成功したとき                                           | `auth_state`（保存完了時）、`weekly_used`                                                           |
| `share`                      | Web Share、クリップボード、fallback の共有処理が成功したとき           | `method`、`content_type`                                                                            |
| `finalize_started`           | 確定ウィザードを表示したとき。1マウントにつき1回                       | `has_existing_finalization`                                                                         |
| `event_finalized`            | 現在未確定のイベントを1件以上で保存したとき                            | `selection_count`                                                                                   |
| `event_finalization_updated` | 既存の確定日程がある状態で保存したとき（同じ選択の保存も含む）         | `selection_count`                                                                                   |
| `event_unfinalized`          | 確定済み日程を空にする保存が成功したとき                               | なし                                                                                                |
| `login`                      | NextAuth の Google OAuth 成功イベント後に短命マーカーを1回消費したとき | `method=Google`                                                                                     |

`create_step_completed.step` は `event_info`、`input_mode`、`candidate_settings`、`manual_calendar`、`confirmation`、`answer_step_completed.step` は `name`、`weekly`、`availability` に限定する。戻る操作で同じステップを再表示しても、同じマウント内では完了イベントを再送しない。スキップされた週入力や名前入力のステップにはイベントを送らない。

`weekly_used` は週入力画面を開いたかではなく、曜日一括操作によって回答の日付選択が実際に変更されたかを表す。`auth_state` は開始イベントでは開始時点、保存イベントでは保存完了時点を使う。認証状態の再水和だけでは `login` を送らない。

共有は成功した方式だけを送る。ユーザーが Web Share をキャンセルした場合、クリップボード API が失敗した場合、fallback のコピーが `false` を返した場合は `share` を送らない。`content_type` は通常のイベント詳細を `event`、確定済み日程を `finalized`、共通日程を `available_dates` とする。

確定状態は現在の画面で判定する。空の状態から保存した場合は `event_finalized`、既存の確定状態から保存した場合は `event_finalization_updated`、空に戻した場合は `event_unfinalized` である。一度解除した後の再確定も、現在が空なら `event_finalized` になる。このイベントはサービス全期間での初回確定を表さず、履歴用の DB カラムや追加クエリは設けない。

## パラメータと管理画面

アプリ側で利用するパラメータは次のとおり。`mode` はイベント名（`answer_submitted` / `answer_edited`）で識別できるため登録しない。

| パラメータ                  | 値                                                                 |
| --------------------------- | ------------------------------------------------------------------ |
| `input_mode`                | `auto` / `manual`                                                  |
| `interval_unit`             | `10` / `30` / `60` / `120` / `180` / `360` / `other`               |
| `auth_state`                | `authenticated` / `guest`                                          |
| `step`                      | イベント表で定義したステップ値                                     |
| `weekly_used`               | `yes` / `no`                                                       |
| `method`                    | 共有は `web_share` / `clipboard` / `fallback`、ログインは `Google` |
| `content_type`              | `event` / `finalized` / `available_dates`                          |
| `has_existing_finalization` | `yes` / `no`                                                       |
| `selection_count`           | 選択した確定日程数（数値）                                         |

GA4 管理画面では `input_mode`、`interval_unit`、`auth_state`、`step`、`weekly_used`、`has_existing_finalization` をイベントスコープのカスタムディメンションとして登録し、`selection_count` をイベントスコープのカスタム指標として登録する。`method` と `content_type` は同名の標準ディメンションで参照できるため、重複するカスタム定義は作成しない。

キーイベントは `event_created`、`answer_submitted`、`event_finalized` を各1回として登録する。金額は設定せず、既存の `purchase` 設定は維持する。キーイベント数は UI 操作の成立回数であり、ユニークな DB イベント数や参加者数ではない。

## 認証マーカー

NextAuth の `events.signIn` で `account.provider === 'google'` の成功時だけ、識別情報を含まない短命 Cookie を設定する。GoogleAnalytics コンポーネントがクライアントで一度だけ読み取り、直ちに削除して `login` を送る。Google ボタンのクリック、既存セッションの水和、キャンセル後に残った既存セッションは成功として扱わない。Cookie の読み書きや計測の例外は OAuth の成功を妨げない。

## 個人情報を送らない境界

カスタムイベントには、公開トークン、参加者 ID・名前、イベントタイトル・説明、回答内容、候補日時・確定日程の ID、メールアドレス、OAuth プロフィール、カレンダー連携 URL を含めない。ページビューもクエリと公開トークンを除去し、ページタイトルは画面名の allowlist から生成する。分析用の値が必要な場合は、上記の固定カテゴリまたは件数へ変換する。

## ファネルと DB KPI の違い

GA4 は匿名ブラウザを含む利用者の到達段階、操作成功、共有方式などのファネル分析に使う。リロードや再試行、ブラウザ設定による欠測があり得るため、`event_created` の件数を DB 上のイベント成立件数として扱わない。確定イベントのユニーク件数、回答者数、候補日の成立件数、保存の整合性は既存 DB を基準に集計する。確定のキーイベントもユニークイベント数ではない。

## ロールアウトと確認

2026-09-04 時点ではこの実装は本番へ未公開で、GA4 の Enhanced measurement（ページビュー履歴、離脱クリック、サイト内検索、フォーム操作）も未変更である。カスタム定義の `input_mode`、`interval_unit`、`auth_state`、`step`、`weekly_used`、`has_existing_finalization` と `selection_count` は登録済み。`event_created` と `answer_submitted` は各1回・金額なしのキーイベントとして登録し、開始から完了までの2段階ファネルを保存済み。`event_finalized` のキーイベントは、`has_existing_finalization=no` の開始条件が受信できておらず、条件設定を保留している。

保存済みの探索リンクは次のとおり。確定ファネルは本番未公開のため `has_existing_finalization=no` の受信後に開始条件を設定する。

- [作成ファネル](https://analytics.google.com/analytics/web/#/analysis/a299588562p487595650/edit/k06J4OSvQk60sZA0eclwcg)
- [回答ファネル](https://analytics.google.com/analytics/web/#/analysis/a299588562p487595650/edit/Tj6sT986Q9OtLM6zU2AGIw)
- [確定ファネル（開始条件の設定待ち）](https://analytics.google.com/analytics/web/#/analysis/a299588562p487595650/edit/oBkfu8GITE-cAhuymthjkA)

1. 本番の `NEXT_PUBLIC_GOOGLE_ANALYTICS` に測定 ID を設定し、開発環境では無効のままにする。
2. 本番コードを公開する前に Enhanced measurement の自動ページビュー（履歴変更を含む）、離脱クリック、サイト内検索、フォーム操作を無効化する。
3. DebugView で初期 `page_view`、SPA 遷移、各成功イベントを確認し、URL の公開トークン、`participant_id`、イベントタイトル、候補日時、カレンダー URL が payload にないことを確認する。
4. 作成・新規回答・編集回答・共有のキャンセル／失敗・確定保存／更新／解除・Google OAuth 成功・セッション再水和を確認する。
5. Realtime のキーイベントと DB 集計を同じ期間で照合し、両者の意味が異なることを運用メモに残す。

実装の単体テストでは、成功時の一度だけの送信、失敗・キャンセル時の無送信、新規／編集の分岐、解除／更新の分岐、パスとリファラーのサニタイズ、ログイン再水和の無送信、SPA ページビュー、スキップされたステップを検証する。

## 検証結果

実装時の検証では、依存関係を `npm ci` で lock ファイルの指定に復元した後、lint（エラー・警告なし）、unit（64 suites、370 passed、1 skipped）、production build、isolated browser smoke を完了した。ブラウザスモークは Google への通信を遮断したローカル環境で、初期化、遅延ロード、SPA ページビュー、サニタイズを確認している。unknown パス、測定 ID 未設定、development 環境は unit で検証した。

最新の `origin/main`（`a8bcf26`）を base にした隔離worktreeでは、再度 `npm ci` を実行し、lint（エラー・警告なし）、unit（65 suites、378 passed、1 skipped）、typecheck、production build（ダミー測定 ID と既存のローカル環境変数を使用）を完了した。isolated browser smoke は実装時の検証結果であり、最新baseでは再実施していない。

本番の Google OAuth、GA4 DebugView、Enhanced measurement の切り替えは未実施である。本番コードの公開後に、運用手順に従って実データの受信と自動計測の無効化を確認する。
