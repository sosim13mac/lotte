import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from '@/lib/env';
import type { Database } from '@/types/database';

export type TypedSupabase = SupabaseClient<Database>;

let browserClient: TypedSupabase | null = null;

/** 브라우저용 싱글턴 클라이언트 (세션은 쿠키에 저장되어 미들웨어/서버와 공유) */
export function getBrowserSupabase(): TypedSupabase {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_KEY);
  }
  return browserClient;
}
