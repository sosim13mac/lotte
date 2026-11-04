import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { readServiceAccount, sendPush, type PushMessage } from './fcm.ts';

interface Outcome {
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
export async function notifyRound(sb: SupabaseClient, round: number): Promise<Outcome> {
  const sa = readServiceAccount(Deno.env.get('FCM_SERVICE_ACCOUNT'));
  if (!sa) return { favoriteWins: 0, drawResults: 0, removedTokens: 0, skipped: 'FCM_SERVICE_ACCOUNT 없음' };

  // 먼저 표시해서 동시에 실행된 크롤러가 두 번 보내지 않게
  const { data: claimed } = await sb
    .from('winning_draws')
    .update({ notified_at: new Date().toISOString() })
    .eq('round', round)
    .is('notified_at', null)
    .select('round');
  if (!claimed?.length) return { favoriteWins: 0, drawResults: 0, removedTokens: 0, skipped: '이미 발송됨' };

  const appUrl = Deno.env.get('APP_URL') ?? undefined;
  const invalid = new Set<string>();
  const send = async (token: string, msg: PushMessage) => {
    const r = await sendPush(sa, token, msg, appUrl).catch(() => 'error' as const);
    if (r === 'invalid-token') invalid.add(token);
    return r === 'ok';
  };

  let favoriteWins = 0;
  const { data: favs } = await sb.rpc('favorite_win_targets', { p_round: round });
  for (const f of (favs ?? []) as Array<{ token: string; store_name: string; rank: number }>) {
    if (await send(f.token, { title: '단골점 당첨 소식 🎉', body: `내 단골 ${f.store_name}에서 ${f.rank}등 나왔어요!`, url: '/map', tag: `fav-${round}` })) favoriteWins += 1;
  }

  let drawResults = 0;
  const { data: mine } = await sb.rpc('draw_result_targets', { p_round: round });
  for (const m of (mine ?? []) as Array<{ token: string; tickets: number }>) {
    if (await send(m.token, { title: `${round}회 결과가 나왔어요`, body: `내 티켓 ${m.tickets}장, 쫄깃하게 열어볼까요?`, url: '/logs', tag: `draw-${round}` })) drawResults += 1;
  }

  if (invalid.size) await sb.from('push_tokens').delete().in('token', [...invalid]);
  return { favoriteWins, drawResults, removedTokens: invalid.size };
}
