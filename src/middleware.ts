import { getSessionCookie } from 'better-auth/cookies';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { IS_DEMO } from '@/lib/env';

/**
 * 로그인 없이도 화면은 열립니다 (게스트 모드: 번호 추천·당첨 확인·명당지도).
 * 로그인이 필요한 화면(티켓로그·가계부·설정·문의)은 화면에서 안내하고,
 * 데이터는 /api/repo 가 서버에서 세션을 검사해 보호합니다.
 */
export function middleware(request: NextRequest) {
  // 이미 로그인했으면 로그인 화면은 건너뜀
  if (!IS_DEMO && request.nextUrl.pathname === '/login' && getSessionCookie(request)) {
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
