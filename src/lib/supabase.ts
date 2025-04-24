import { createClient as supabaseCreateClient } from "@supabase/supabase-js";

// 環境変数からSupabaseの設定を取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 環境変数のチェック
if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URLが設定されていません");
}

// アプリケーション内で使用するラッパー関数（引数なしでも使用可能）
export function createClient() {
  return supabaseCreateClient(supabaseUrl!, supabaseAnonKey || "");
}

// 匿名アクセス用クライアント (RLSの制限あり、フロントエンドで使用可能)
export const supabase = supabaseCreateClient(supabaseUrl, supabaseAnonKey || "");

// サーバーサイドで使用するAdmin権限クライアント (RLS無視可能)
export const getSupabaseAdmin = () => {
  if (!supabaseServiceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEYが設定されていません");
  }
  return supabaseCreateClient(supabaseUrl, supabaseServiceKey);
};

// サーバーサイドで使用するクライアントを取得する関数
// この関数は常にサービスロールキーを使用します
export const getSupabaseServerClient = () => {
  return getSupabaseAdmin();
};
