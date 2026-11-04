import { NextResponse } from 'next/server';
import { safeNextPath } from '@/lib/safeNext';
import { createServerSupabase } from '@/lib/supabase/server';

/** Google OAuth 콜백: code → 세션 교환 후 생년월일이 없으면 온보딩으로 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safeNextPath(url.searchParams.get('next'));

  const forwardedHost = request.headers.get('x-forwarded-host');
  const base =
    process.env.NODE_ENV !== 'development' && forwardedHost ? `https://${forwardedHost}` : url.origin;

  if (code) {
    const supabase = createServerSupabase();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const { data: profile } = await supabase
        .from('users')
        .select('birth_date')
        .eq('id', data.user.id)
        .maybeSingle();
      const dest = profile?.birth_date ? next : `/onboarding?next=${encodeURIComponent(next)}`;
      return NextResponse.redirect(`${base}${dest}`);
    }
  }

  return NextResponse.redirect(`${base}/login?error=auth`);
}
