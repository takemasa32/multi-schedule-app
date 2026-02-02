# Google ログインとイベント履歴同期の設計（案）

## 1. 目的・背景

- 現状は `localData` にアクセス履歴を保存しているため、デバイス間で履歴が共有されない。
- 「ログインは必須にしない」という方針を維持しつつ、**ログインしたユーザーだけが履歴を同期**できる付加価値を提供する。
- 認証は Auth.js（旧 NextAuth.js）を利用し、将来的な拡張（他プロバイダ追加、権限追加、通知機能など）に備える。

## 2. 要件整理

### 2.1 機能要件

- ログイン未実施でも既存機能はそのまま利用可能（ゲスト優先）。
- Google アカウントでログインしたユーザーは、**イベントアクセス履歴**を複数デバイスで共有できる。
- ログインは任意のタイミングで実施でき、ログイン後にローカル履歴の統合ができる。

### 2.2 非機能要件

- **DB へのアクセスはサーバーサイドのみ**。
- 認証の実装は Auth.js を中心に、複雑化を避ける。
- 将来的な拡張に備えて、認証周辺のコードとドメインデータを分離する。

## 3. 全体方針

- Auth.js を導入し、Google OAuth をプロバイダとして追加する。
- 認証・セッション管理は Auth.js 標準の仕組みを利用し、アプリ内で独自実装を増やさない。
- イベント履歴は DB に保存し、**user_id で紐づけ**る。
- ゲスト利用時は現行 `localData` を継続し、ログイン時のみサーバー保存を併用する。

## 4. アーキテクチャ案

### 4.1 認証基盤

- **Auth.js（NextAuth v4）を採用**。
- プロバイダ: Google
- セッション方式: JWT ではなく DB セッションを推奨（履歴同期などサーバー側で扱いやすくするため）。
- 永続化: Supabase Postgres を Auth.js の PostgreSQL Adapter で利用。

> 補足: Supabase Auth を利用せず、Auth.js で OAuth を完結させることで、
> 「ログイン不要の基本方針」と併存しつつ、必要最低限の認証レイヤで実装する。

#### 4.1.1 Supabase との適合性・実装可能性の検討

- Supabase は PostgreSQL を提供するため、Auth.js の PostgreSQL Adapter と整合する。
- Adapter が要求する標準テーブル（`users` / `accounts` / `sessions` / `verification_token`）を **専用スキーマ**（`authjs`）に分離して管理する。
- Adapter で使用する DB 接続は **サーバーサイドの環境変数（DB 接続 URL）**に限定する。
- Adapter が参照するスキーマは `search_path` で `authjs` を指定して切り替える。
- Auth.js のアダプタは `userId` や `emailVerified` などのキャメルケース列を参照するため、DB定義も同じ命名に合わせる。
- クライアントからの DB 操作は禁止し、**認証関連テーブルは RLS を無効化**する（Adapter が直接操作するため）。
  - 代わりに API 経由のアクセス制御を徹底し、**サーバー経由でのみ操作**される前提にする。

#### 4.1.2 環境変数（Auth.js）

| 変数名 | 用途 |
| --- | --- |
| `NEXTAUTH_SECRET` | セッション暗号化キー |
| `NEXTAUTH_URL` | Auth.js のベース URL |
| `GOOGLE_CLIENT_ID` | Google OAuth クライアントID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth クライアントシークレット |
| `SUPABASE_DB_URL` | Auth.js 用の PostgreSQL 接続 URL |

### 4.2 データ保存方針

- **イベント履歴はサーバー側で保存し、ログイン済みユーザーのみ同期**。
- 既存 `localData` はゲスト用のみに限定する。

#### 4.2.1 テーブル設計（案）

Auth.js が利用するテーブルは Adapter が管理するため、ここでは追加テーブルを設計する。

**event_access_histories（実装）**

| カラム名 | 型 | 説明 |
| --- | --- | --- |
| id | uuid | 主キー |
| user_id | text | Auth.js の user.id と紐づく外部キー |
| event_public_token | text | イベントの公開トークン |
| event_title | text | イベントタイトル |
| is_created_by_me | boolean | 自分が作成したイベントかどうか |
| first_accessed_at | timestamptz | 初回アクセス日時 |
| last_accessed_at | timestamptz | 最終アクセス日時 |
| access_count | integer | アクセス回数（簡易的な分析用途） |

- `user_id + event_public_token` にユニーク制約を付与し、`upsert` で更新できるようにする。
- RLS を有効化し、**サーバー経由のみ操作**する方針とする。

#### 4.2.2 Supabase セキュリティ前提

- `event_access_histories` は **RLS を有効化**し、クライアントからの直接アクセスを禁止する。
- 履歴の upsert は Server Actions 経由で行い、**Supabase service role を露出させない**。
- クライアント側での認証状態は表示制御にのみ使い、**DB への直接アクセスはしない**。

### 4.3 API / Server Actions

- **Server Actions で履歴登録/取得を行う**（API Routes は必要最小限）。
- 認証済みユーザーでない場合は、DB への書き込みを行わず `localData` を使用する。

#### 例: 利用フロー

1. ログイン前: `localData` に履歴保存。
2. ログイン後: `localData` の内容を取得 → Server Action で `event_access_histories` に upsert。
3. 以後はサーバー履歴を基準に表示し、必要に応じてローカルとマージする。

#### 4.3.1 実装ポイント

- 履歴の upsert は `upsert_event_access_history` RPC を使用してアクセス回数と最終アクセス日時を更新する。
- ログイン済みの場合は、ローカル履歴をサーバーへ同期してから表示する。
- イベント作成時はサーバー側で履歴登録を行い、作成者フラグを反映する。

### 4.4 UI/UX

- 画面上に **「履歴を同期するためにログイン」** の導線を設置（任意）。
- ログイン済みの場合は「履歴が同期される」ことを明示。
- ログアウト時はサーバー履歴を表示しない（再ログインで復元）。
- ヘッダーにログイン/ログアウトボタンを配置し、どのページからでも同期を開始できるようにする。
- アカウントページで履歴・お気に入りの確認、ログアウト、連携削除ができる導線を用意する。

## 5. セキュリティ・プライバシー

- Google OAuth のアクセストークンは保存しない（必要最低限の情報のみ）。
- Auth.js のセッションは HTTP Only Cookie で管理する。
- `event_access_histories` はユーザー自身のみ閲覧可能（RLS で制御）。
- 個人情報を含むログは出力しない。

### 5.1 懸念点と対策

- **Adapter テーブルへの RLS**: Auth.js Adapter は RLS と相性が悪いため、専用スキーマに分離し RLS を無効化する。
  - 代替として、DB への接続はサーバー環境からのみに限定し、機密情報の露出を防ぐ。
- **セッション固定化攻撃**: セッション ID は Auth.js の標準ローテーションを利用し、ログイン直後に再発行する。
- **ログイン不要方針**: ゲスト利用時は認証情報が不要であるため、**既存 UX を維持**し、ログインは「履歴同期」の付加価値として位置づける。

## 6. 拡張性（将来のための設計）

- 他の OAuth プロバイダ（Apple, GitHub 等）の追加が容易。
- アクセス履歴以外にも、以下の機能追加がしやすい構成:
  - お気に入りイベントのサーバー保存
  - 通知設定の同期
  - 参加者プロフィール（表示名・アイコン）

## 7. 実装ステップ（MVP）

1. Auth.js の導入（Google Provider + Adapter）
2. `event_access_histories` テーブルの追加（マイグレーション）
3. Server Action で履歴の upsert / fetch を実装
4. UI へログイン導線追加
5. `localData` とサーバー履歴の統合ロジック実装
6. 仕様を `/docs` に更新（CHANGELOG・README）

## 8. リスク・検討事項

- Auth.js Adapter の DB スキーマは一定の固定仕様があるため、Supabase の既存テーブルや RLS 設定と衝突しないように注意する。
- ログイン後の `localData` 同期タイミングは UX に影響するため、初回ログイン時のみ明示的な同期を推奨。
- DB 接続は必ずサーバーサイドで行い、クライアントから直接操作しない。

## 9. 実装反映（現状）

- 認証ページは `/auth/signin` と `/auth/error` を使用し、`callbackUrl` は相対パスに正規化して安全に遷移する。
- ヘッダーは **ゲスト表示（未ログイン）** と **アカウント導線（ログイン時）** を切り替える。
- アカウントページで履歴・お気に入りの閲覧、ログアウト、連携削除（確認入力＋モーダル）を提供する。
- `upsert_event_access_history` は **ON CONFLICT で原子的に更新**し、EXECUTE 権限を限定して公開しない。
