import { NextResponse } from 'next/server';
import { crawlRound, pickRounds, sleep, type RoundOutcome } from '@/lib/crawler/crawl';
import { latestDrawnRound } from '@/lib/lotto/round';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * 당첨번호 크롤링 → winning_draws 저장 → 티켓 자동 정산 → 단골점/내 회차 FCM 푸시
 *
 * 호출: Vercel Cron(vercel.json, GET) 또는 수동
 *   GET|POST /api/cron/crawl-draw                      최신 회차까지 자동
 *   GET|POST /api/cron/crawl-draw?round=1248
 *   GET|POST /api/cron/crawl-draw?from=1200&to=1248     과거 데이터 채우기 (최대 30회)
 * 인증: Authorization: Bearer <CRON_SECRET>  (Vercel Cron 은 CRON_SECRET 환경변수를 자동으로 헤더에 실어 보냅니다)
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};
  const num = (v: unknown) => (v === undefined || v === null || v === '' ? undefined : Number(v));
  const params = {
    round: num(url.searchParams.get('round') ?? body.round),
    from: num(url.searchParams.get('from') ?? body.from),
    to: num(url.searchParams.get('to') ?? body.to),
  };

  const rounds = await pickRounds(params);
  const results: RoundOutcome[] = [];
  for (const round of rounds) {
    try {
      const outcome = await crawlRound(round);
      results.push(outcome);
      if (outcome.status === 'not-yet') break; // 아직 발표 전 → 다음 cron 에서 재시도
    } catch (e) {
      results.push({ round, status: 'error', error: e instanceof Error ? e.message : String(e) });
    }
    if (rounds.length > 1) await sleep(400); // 동행복권 서버 부담 줄이기
  }

  console.log('[crawl-draw]', JSON.stringify(results));
  return NextResponse.json({ ok: true, latestByDate: latestDrawnRound(), results });
}

export const GET = handle;
export const POST = handle;
