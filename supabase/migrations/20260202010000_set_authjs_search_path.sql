-- Auth.jsのAdapterが参照するスキーマをDBロール側で固定する
ALTER ROLE CURRENT_USER SET search_path TO authjs, public;

DO $$
DECLARE
  target_role text := 'postgres.dpspvnwzxqswdraiivia';
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = target_role) THEN
    EXECUTE format('ALTER ROLE %I SET search_path TO authjs, public', target_role);
  END IF;
END;
$$;
