/**
 * Supabase 스키마 타입 (supabase/migrations 기준).
 * 스키마가 바뀌면 `npx supabase gen types typescript --local > src/types/database.ts` 로 다시 생성할 수 있습니다.
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
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
