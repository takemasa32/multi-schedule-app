// Supabaseクライアント初期化用ファイル
import { createClient } from '@supabase/supabase-js'

// 環境変数からSupabaseの設定を取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// 匿名アクセス用のクライアント（フロントエンドでも利用可能）
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// サービスロール用のクライアント（サーバーサイドのみ利用可能）
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// DB型定義（後で詳細に拡張予定）
export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          public_token: string;
          admin_token: string;
          title: string;
          description: string | null;
          is_finalized: boolean;
          final_date_id: string | null;
          created_at: string;
          created_by: string | null;
        }
        Insert: {
          id?: string;
          public_token?: string;
          admin_token?: string;
          title: string;
          description?: string | null;
          is_finalized?: boolean;
          final_date_id?: string | null;
          created_at?: string;
          created_by?: string | null;
        }
        Update: {
          id?: string;
          public_token?: string;
          admin_token?: string;
          title?: string;
          description?: string | null;
          is_finalized?: boolean;
          final_date_id?: string | null;
          created_at?: string;
          created_by?: string | null;
        }
      };
      event_dates: {
        Row: {
          id: string;
          event_id: string;
          date_time: string;
          label: string | null;
          created_at: string;
        }
        Insert: {
          id?: string;
          event_id: string;
          date_time: string;
          label?: string | null;
          created_at?: string;
        }
        Update: {
          id?: string;
          event_id?: string;
          date_time?: string;
          label?: string | null;
          created_at?: string;
        }
      };
      participants: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          response_token: string | null;
          created_at: string;
        }
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          response_token?: string | null;
          created_at?: string;
        }
        Update: {
          id?: string;
          event_id?: string;
          name?: string;
          response_token?: string | null;
          created_at?: string;
        }
      };
      availabilities: {
        Row: {
          id: string;
          event_id: string;
          participant_id: string;
          event_date_id: string;
          availability: boolean;
          created_at: string;
        }
        Insert: {
          id?: string;
          event_id: string;
          participant_id: string;
          event_date_id: string;
          availability: boolean;
          created_at?: string;
        }
        Update: {
          id?: string;
          event_id?: string;
          participant_id?: string;
          event_date_id?: string;
          availability?: boolean;
          created_at?: string;
        }
      };
    }
  }
};