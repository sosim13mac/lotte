/**
 * 환경 설정.
 * NEXT_PUBLIC_* 값은 빌드 시 인라인되므로 반드시 리터럴 접근(process.env.NEXT_PUBLIC_X)으로 읽습니다.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Supabase 설정이 없거나 강제 지정 시 → 로그인 없이 로컬 샘플 데이터로 동작하는 데모 모드 */
export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === '1' || !SUPABASE_URL || !SUPABASE_KEY;
