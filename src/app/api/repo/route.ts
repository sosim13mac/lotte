import { NextResponse } from 'next/server';
import { HttpError, ops, PUBLIC_OPS } from '@/lib/server/repoOps';
import { getSessionUser } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

/** 브라우저 neonRepo 의 단일 진입점: { op, ...args } → 서버 연산 */
export async function POST(request: Request) {
  const sessionUser = await getSessionUser();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청이에요' }, { status: 400 });
  }
  const name = String(body.op);
  if (!Object.prototype.hasOwnProperty.call(ops, name)) {
    return NextResponse.json({ error: '알 수 없는 요청이에요' }, { status: 404 });
  }

  // 로그인하지 않아도 되는 읽기 전용 연산(공개 데이터)만 게스트에게 허용
  if (!sessionUser && !PUBLIC_OPS.has(name)) return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 });
  const user = sessionUser ?? { id: '', email: '' };

  try {
    return NextResponse.json({ data: (await ops[name](user, body)) ?? null });
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    const err = e as { code?: string; message?: string };
    if (err.code === '23505') return NextResponse.json({ error: '이미 등록된 항목이에요', code: 'duplicate' }, { status: 409 });
    if (err.code?.startsWith('23') || err.code?.startsWith('22')) {
      return NextResponse.json({ error: '입력값이 올바르지 않아요', code: err.code }, { status: 400 });
    }
    console.error('[api/repo]', name, err.message);
    return NextResponse.json({ error: '서버 오류가 발생했어요' }, { status: 500 });
  }
}
