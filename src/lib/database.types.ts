export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          operationName?: string;
          query?: string;
          variables?: Json;
          extensions?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      availabilities: {
        Row: {
          availability: boolean;
          created_at: string;
          event_date_id: string;
          event_id: string;
          id: string;
          participant_id: string;
        };
        Insert: {
          availability: boolean;
          created_at?: string;
          event_date_id: string;
          event_id: string;
          id?: string;
          participant_id: string;
        };
        Update: {
          availability?: boolean;
          created_at?: string;
          event_date_id?: string;
          event_id?: string;
          id?: string;
          participant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'availabilities_event_date_id_fkey';
            columns: ['event_date_id'];
            isOneToOne: false;
            referencedRelation: 'event_dates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'availabilities_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'availabilities_participant_id_fkey';
            columns: ['participant_id'];
            isOneToOne: false;
            referencedRelation: 'participants';
            referencedColumns: ['id'];
          },
        ];
      };
      event_dates: {
        Row: {
          created_at: string;
          end_time: string;
          event_id: string;
          id: string;
          label: string | null;
          start_time: string;
        };
        Insert: {
          created_at?: string;
          end_time: string;
          event_id: string;
          id?: string;
          label?: string | null;
          start_time: string;
        };
        Update: {
          created_at?: string;
          end_time?: string;
          event_id?: string;
          id?: string;
          label?: string | null;
          start_time?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_dates_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      events: {
        Row: {
          admin_password_hash: string | null;
          admin_token: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          final_date_id: string | null;
          id: string;
          is_finalized: boolean;
          last_accessed_at: string | null;
          public_token: string;
          title: string;
        };
        Insert: {
          admin_password_hash?: string | null;
          admin_token?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          final_date_id?: string | null;
          id?: string;
          is_finalized?: boolean;
          last_accessed_at?: string | null;
          public_token?: string;
          title: string;
        };
        Update: {
          admin_password_hash?: string | null;
          admin_token?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          final_date_id?: string | null;
          id?: string;
          is_finalized?: boolean;
          last_accessed_at?: string | null;
          public_token?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_events_final_date';
            columns: ['final_date_id'];
            isOneToOne: false;
            referencedRelation: 'event_dates';
            referencedColumns: ['id'];
          },
        ];
      };
      event_access_histories: {
        Row: {
          access_count: number;
          event_public_token: string;
          event_title: string;
          first_accessed_at: string;
          id: string;
          is_created_by_me: boolean;
          last_accessed_at: string;
          user_id: string;
        };
        Insert: {
          access_count?: number;
          event_public_token: string;
          event_title: string;
          first_accessed_at?: string;
          id?: string;
          is_created_by_me?: boolean;
          last_accessed_at?: string;
          user_id: string;
        };
        Update: {
          access_count?: number;
          event_public_token?: string;
          event_title?: string;
          first_accessed_at?: string;
          id?: string;
          is_created_by_me?: boolean;
          last_accessed_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_access_histories_event_public_token_fkey';
            columns: ['event_public_token'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['public_token'];
          },
        ];
      };
      finalized_dates: {
        Row: {
          created_at: string;
          event_date_id: string;
          event_id: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          event_date_id: string;
          event_id: string;
          id?: string;
        };
        Update: {
          created_at?: string;
          event_date_id?: string;
          event_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'finalized_dates_event_date_id_fkey';
            columns: ['event_date_id'];
            isOneToOne: false;
            referencedRelation: 'event_dates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'finalized_dates_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      user_event_availability_overrides: {
        Row: {
          availability: boolean;
          event_date_id: string;
          event_id: string;
          id: string;
          reason: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          availability: boolean;
          event_date_id: string;
          event_id: string;
          id?: string;
          reason: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          availability?: boolean;
          event_date_id?: string;
          event_id?: string;
          id?: string;
          reason?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_event_availability_overrides_event_date_id_fkey';
            columns: ['event_date_id'];
            isOneToOne: false;
            referencedRelation: 'event_dates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_event_availability_overrides_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      user_event_links: {
        Row: {
          auto_sync: boolean;
          created_at: string;
          event_id: string;
          id: string;
          participant_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          auto_sync?: boolean;
          created_at?: string;
          event_id: string;
          id?: string;
          participant_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          auto_sync?: boolean;
          created_at?: string;
          event_id?: string;
          id?: string;
          participant_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_event_links_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_event_links_participant_id_fkey';
            columns: ['participant_id'];
            isOneToOne: false;
            referencedRelation: 'participants';
            referencedColumns: ['id'];
          },
        ];
      };
      user_schedule_blocks: {
        Row: {
          availability: boolean;
          end_time: string;
          event_id: string | null;
          id: string;
          source: string;
          start_time: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          availability: boolean;
          end_time: string;
          event_id?: string | null;
          id?: string;
          source: string;
          start_time: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          availability?: boolean;
          end_time?: string;
          event_id?: string | null;
          id?: string;
          source?: string;
          start_time?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_schedule_blocks_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      user_schedule_templates: {
        Row: {
          availability: boolean;
          end_time: string;
          id: string;
          sample_count: number;
          source: string;
          start_time: string;
          updated_at: string;
          user_id: string;
          weekday: number;
        };
        Insert: {
          availability: boolean;
          end_time: string;
          id?: string;
          sample_count?: number;
          source: string;
          start_time: string;
          updated_at?: string;
          user_id: string;
          weekday: number;
        };
        Update: {
          availability?: boolean;
          end_time?: string;
          id?: string;
          sample_count?: number;
          source?: string;
          start_time?: string;
          updated_at?: string;
          user_id?: string;
          weekday?: number;
        };
        Relationships: [];
      };
      participants: {
        Row: {
          comment: string | null;
          created_at: string;
          event_id: string;
          id: string;
          name: string;
          response_token: string | null;
        };
        Insert: {
          comment?: string | null;
          created_at?: string;
          event_id: string;
          id?: string;
          name: string;
          response_token?: string | null;
        };
        Update: {
          comment?: string | null;
          created_at?: string;
          event_id?: string;
          id?: string;
          name?: string;
          response_token?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'participants_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_event_dates_safe: {
        Args: { p_event_id: string; p_event_dates: Json };
        Returns: boolean;
      };
      create_event_with_dates: {
        Args: {
          p_title: string;
          p_description: string;
          p_public_token: string;
          p_admin_token: string;
          p_event_dates: Json;
        };
        Returns: {
          event_id: string;
          public_token: string;
          admin_token: string;
        }[];
      };
      finalize_event_safe: {
        Args: { p_event_id: string; p_date_ids: Json };
        Returns: boolean;
      };
      find_old_events: {
        Args: { threshold: string };
        Returns: {
          id: string;
        }[];
      };
      update_participant_availability: {
        Args: {
          p_participant_id: string;
          p_event_id: string;
          p_availabilities: Json;
        };
        Returns: boolean;
      };
      upsert_event_access_history: {
        Args: {
          p_user_id: string;
          p_event_public_token: string;
          p_event_title: string;
          p_is_created_by_me: boolean;
          p_accessed_at: string;
        };
        Returns: {
          access_count: number;
          event_public_token: string;
          event_title: string;
          first_accessed_at: string;
          id: string;
          is_created_by_me: boolean;
          last_accessed_at: string;
          user_id: string;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
