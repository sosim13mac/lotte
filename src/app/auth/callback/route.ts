import { NextResponse } from 'next/server';
import { safeNextPath } from '@/lib/safeNext';
import { getPool } from '@/lib/server/db';
import { getSessionUser } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

/** 로그인 직후 도착 지점: 생년월일이 없으면 온보딩으로 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNextPath(url.searchParams.get('next'));
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const base = forwardedHost ? `${forwardedProto || 'https'}://${forwardedHost}` : url.origin;

  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(`${base}/login?error=auth`);

  const { rows } = await getPool().query('select birth_date from public.users where id = $1', [user.id]);
  const dest = rows[0]?.birth_date ? next : `/onboarding?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(`${base}${dest}`);
}
