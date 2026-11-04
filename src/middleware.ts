import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { IS_DEMO } from '@/lib/env';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // 데모 모드: 인증 없이 로컬 샘플 데이터로 동작
  if (IS_DEMO) return NextResponse.next();
  return updateSession(request);
}

export const config = {
  matcher: [
    // 정적 파일, PWA 자산, OCR 엔진 파일은 미들웨어를 거치지 않음
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.json|sw.js|icons/|tesseract/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|wasm|gz|js)$).*)',
  ],
};
