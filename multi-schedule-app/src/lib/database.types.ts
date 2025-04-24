// SupabaseのデータベースType Definitionの仮実装
// 実際の型は `supabase gen types typescript --linked` コマンドで生成できます

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
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
        };
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
        };
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
        };
      };
      event_dates: {
        Row: {
          id: string;
          event_id: string;
          date_time: string;
          label: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          date_time: string;
          label?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          date_time?: string;
          label?: string | null;
          created_at?: string;
        };
      };
      participants: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          response_token: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          response_token?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          name?: string;
          response_token?: string | null;
          created_at?: string;
        };
      };
      availabilities: {
        Row: {
          id: string;
          event_id: string;
          participant_id: string;
          event_date_id: string;
          availability: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          participant_id: string;
          event_date_id: string;
          availability: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          participant_id?: string;
          event_date_id?: string;
          availability?: boolean;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
