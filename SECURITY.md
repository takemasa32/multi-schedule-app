# Security Policy

DaySynth の安全性を守るため、脆弱性や秘密情報の取り扱いには注意してください。

## 対象

- Supabase 関連の設定や権限
- NextAuth と認証フロー
- RLS やサーバーサイドのデータアクセス
- 外部連携 API と環境変数

## 報告方法

Please do not report security vulnerabilities through public GitHub issues.

If GitHub Private Vulnerability Reporting is enabled for this repository, please use it.

If it is not available, please contact the maintainer via the GitHub profile @takemasa32.

## 報告に含めてほしい情報

- 問題の概要
- 影響範囲
- 再現手順
- 期待される挙動
- 影響を受ける URL や機能名

## 対応方針

- 秘密情報はローテーションまたは失効を優先します。
- 修正後は関連テストと設定確認を行います。
- 必要に応じてドキュメントも更新します。
