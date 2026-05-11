-- 週予定のアカウント保存廃止に伴い、旧週次テンプレテーブルを削除する。
-- 復帰が必要な場合は、このマイグレーション適用前に取得したDBバックアップと
-- 本変更のGit差分（docs/architecture/account-schedule.md の「復帰時の参照差分」）を参照する。

DROP TABLE IF EXISTS public.user_schedule_templates;
