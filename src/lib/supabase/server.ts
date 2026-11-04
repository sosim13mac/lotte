import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SUPABASE_KEY, SUPABASE_URL } from '@/lib/env';
import type { Database } from '@/types/database';

/** Route Handler / Server Component 용 클라이언트. 요청마다 새로 만듭니다. */
export function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component 에서는 쿠키를 쓸 수 없음 — 미들웨어가 세션을 갱신하므로 무시해도 됩니다.
        }
      },
    },
  });
}
