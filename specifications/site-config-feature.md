# サイト情報一元管理仕様書

## 1. 概要

本アプリでは、サービス名・キャッチフレーズ・説明文・OGP画像・PWA manifest の name/short_name など、サイト全体で利用する情報を一元管理するための仕組みを導入しています。これにより、サービス名称や説明文の変更、SEO・PWA最適化、UI表示の統一が容易になります。

## 2. 管理対象情報

- サービス名（full/short）
- キャッチフレーズ
- サイト説明文
- OGP画像パス
- PWA manifest の name/short_name/description
- その他、SEOやUIで利用する共通情報

## 3. 実装方法

- `/src/lib/site-config.ts` にて、サイト情報を TypeScript オブジェクトとして一元管理します。
- 各ページやコンポーネント、manifest.json、OGP生成、SEO設定などでこの site-config.ts を参照します。
- manifest.json の name/short_name/description も site-config.ts の値と揃えることが推奨されます。

## 4. メリット

- サービス名や説明文の変更が1ファイルの修正で全体に反映される
- SEO・PWA・OGP・UI表示の一貫性が保たれる
- 多言語対応や将来的なブランド変更にも柔軟に対応可能

## 5. 今後の拡張方針

- 多言語対応時は site-config.ts を言語ごとに分割、または i18n 対応の仕組みを導入
- サイト情報の一部を Supabase など外部DBで管理し、動的に反映する拡張も検討可能

## 6. 実装ファイル

- `/src/lib/site-config.ts`（サイト情報一元管理の本体）
- `/public/manifest.json`（PWA manifest、site-config.tsの値と揃える）
- 各種SEO/OGP/ページタイトル設定箇所

---

本仕様は、サービス名称・説明文・OGP・PWA manifest などのサイト情報を一元管理し、保守性・一貫性・拡張性を高めるための実装方針を示しています。
