import { getSessionCookie } from 'better-auth/cookies';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { IS_DEMO } from '@/lib/env';

/** 로그인 없이 접근 가능한 경로 */
const PUBLIC_PREFIXES = ['/login', '/auth', '/api/auth', '/api/cron', '/offline'];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(request: NextRequest) {
  // 데모 모드: 인증 없이 로컬 샘플 데이터로 동작
  if (IS_DEMO) return NextResponse.next();

  // 세션 쿠키 유무만 빠르게 확인합니다. 실제 검증은 각 API 가 서버에서 합니다.
  const signedIn = Boolean(getSessionCookie(request));
  const { pathname, search } = request.nextUrl;

  if (!signedIn && !isPublicPath(pathname)) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    if (pathname !== '/') url.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  if (signedIn && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // 정적 파일, PWA 자산, OCR 엔진 파일은 미들웨어를 거치지 않음
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.json|sw.js|icons/|brand/|tesseract/|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|wasm|gz|js)$).*)',
  ],
};
