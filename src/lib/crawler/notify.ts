import 'server-only';
import { getPool } from '@/lib/server/db';
import { readServiceAccount, sendPush, type PushMessage } from './fcm';

export interface NotifyOutcome {
  favoriteWins: number;
  drawResults: number;
  removedTokens: number;
  skipped?: string;
}

/**
 * 회차 결과가 저장된 뒤 1번만 실행 (winning_draws.notified_at 으로 중복 방지)
 * - 단골점에서 1·2등 → "내 단골 홍대GS25에서 2등 나왔어요!"
 * - 내 티켓이 있는 회차 → 결과는 앱에서 쫄깃하게 열어보도록 스포일러 없이 안내
 */
export async function notifyRound(round: number): Promise<NotifyOutcome> {
  const sa = readServiceAccount(process.env.FCM_SERVICE_ACCOUNT);
  if (!sa) return { favoriteWins: 0, drawResults: 0, removedTokens: 0, skipped: 'FCM_SERVICE_ACCOUNT 없음' };

  const pool = getPool();
  // 먼저 표시해서 동시에 실행된 크롤러가 두 번 보내지 않게
  const claimed = await pool.query('update public.winning_draws set notified_at = now() where round = $1 and notified_at is null returning round', [round]);
  if (!claimed.rowCount) return { favoriteWins: 0, drawResults: 0, removedTokens: 0, skipped: '이미 발송됨' };

  const appUrl = process.env.APP_URL || undefined;
  const invalid = new Set<string>();
  const send = async (token: string, msg: PushMessage) => {
    const r = await sendPush(sa, token, msg, appUrl).catch(() => 'error' as const);
    if (r === 'invalid-token') invalid.add(token);
    return r === 'ok';
  };

  let favoriteWins = 0;
  const favs = await pool.query<{ token: string; store_name: string; rank: number }>('select * from public.favorite_win_targets($1)', [round]);
  for (const f of favs.rows) {
    if (await send(f.token, { title: '단골점 당첨 소식 🎉', body: `내 단골 ${f.store_name}에서 ${f.rank}등 나왔어요!`, url: '/map', tag: `fav-${round}` })) favoriteWins += 1;
  }

  let drawResults = 0;
  const mine = await pool.query<{ token: string; tickets: number }>('select * from public.draw_result_targets($1)', [round]);
  for (const m of mine.rows) {
    if (await send(m.token, { title: `${round}회 결과가 나왔어요`, body: `내 티켓 ${m.tickets}장, 쫄깃하게 열어볼까요?`, url: '/logs', tag: `draw-${round}` })) drawResults += 1;
  }

  if (invalid.size) await pool.query('delete from public.push_tokens where token = any($1::text[])', [[...invalid]]);
  return { favoriteWins, drawResults, removedTokens: invalid.size };
}
