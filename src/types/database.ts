/**
 * DB 스키마 타입 (db/neon/schema.sql 기준). 스키마가 바뀌면 이 파일도 함께 고치세요.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '13';
  };
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          birth_date: string | null;
          monthly_budget: number | null;
          notify_geofence: boolean;
          notify_favorite_win: boolean;
          notify_draw_result: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          birth_date?: string | null;
          monthly_budget?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          birth_date?: string | null;
          monthly_budget?: number | null;
          notify_geofence?: boolean;
          notify_favorite_win?: boolean;
          notify_draw_result?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      tickets: {
        Row: {
          id: string;
          user_id: string;
          round: number;
          purchase_date: string;
          store_code: string | null;
          store_name: string | null;
          amount: number;
          games: Json;
          win_amount: number;
          profit: number;
          qr_raw: string | null;
          opened_at: string | null;
          settled_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          round: number;
          purchase_date?: string;
          store_code?: string | null;
          store_name?: string | null;
          amount?: number;
          games: Json;
          qr_raw?: string | null;
          opened_at?: string | null;
        };
        Update: {
          round?: number;
          purchase_date?: string;
          store_code?: string | null;
          store_name?: string | null;
          amount?: number;
          games?: Json;
          opened_at?: string | null;
        };
        Relationships: [];
      };
      winning_draws: {
        Row: {
          round: number;
          draw_date: string;
          numbers: number[];
          bonus: number;
          store_codes: string[];
          second_store_codes: string[];
          prize_amounts: number[] | null;
          /** 본번호 6개 분석 기록 (DB 트리거가 numbers 로부터 계산) */
          odd_count: number;
          even_count: number;
          /** 저구간 1~22 */
          low_count: number;
          /** 고구간 23~45 */
          high_count: number;
          sum_numbers: number;
          avg_number: number;
          notified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          round: number;
          draw_date: string;
          numbers: number[];
          bonus: number;
          store_codes?: string[];
          second_store_codes?: string[];
          prize_amounts?: number[] | null;
        };
        Update: {
          draw_date?: string;
          numbers?: number[];
          bonus?: number;
          store_codes?: string[];
          second_store_codes?: string[];
          prize_amounts?: number[] | null;
        };
        Relationships: [];
      };
      stores: {
        Row: {
          code: string;
          name: string;
          address: string | null;
          lat: number | null;
          lng: number | null;
          first_win_count: number;
          second_win_count: number;
          is_hot: boolean;
          open_time: string | null;
          close_time: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          name: string;
          address?: string | null;
          lat?: number | null;
          lng?: number | null;
          first_win_count?: number;
          second_win_count?: number;
          is_hot?: boolean;
        };
        Update: {
          name?: string;
          address?: string | null;
          lat?: number | null;
          lng?: number | null;
          first_win_count?: number;
          second_win_count?: number;
          is_hot?: boolean;
        };
        Relationships: [];
      };
      favorite_stores: {
        Row: { user_id: string; store_code: string; created_at: string };
        Insert: { user_id?: string; store_code: string };
        Update: { store_code?: string };
        Relationships: [
          {
            foreignKeyName: 'favorite_stores_store_code_fkey';
            columns: ['store_code'];
            isOneToOne: false;
            referencedRelation: 'stores';
            referencedColumns: ['code'];
          },
        ];
      };
      push_tokens: {
        Row: { token: string; user_id: string; platform: string; created_at: string; last_seen_at: string };
        Insert: { token: string; user_id: string; platform: string };
        Update: { platform?: string };
        Relationships: [];
      };
      dream_map: {
        Row: { keyword: string; numbers: number[] };
        Insert: { keyword: string; numbers: number[] };
        Update: { keyword?: string; numbers?: number[] };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      get_ledger_stats: { Args: Record<PropertyKey, never>; Returns: Json };
      compute_win_amount: { Args: { p_games: Json; p_round: number }; Returns: number };
      settle_round: { Args: { p_round: number }; Returns: number };
      refresh_store_stats: { Args: { p_codes?: string[] | null }; Returns: number };
      register_push_token: { Args: { p_token: string; p_platform: string }; Returns: undefined };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
