/**
 * crawl-draw — 토요일 20:35 이후 당첨번호 크롤링 → winning_draws 저장 → tickets.win_amount 자동 정산
 *
 * 호출: pg_cron (supabase/migrations/*_schedule_crawl.sql) 또는 수동
 *   POST /functions/v1/crawl-draw            최신 회차까지 자동
 *   POST /functions/v1/crawl-draw {"round": 1248}
 *   POST /functions/v1/crawl-draw {"from": 1200, "to": 1248}   과거 데이터 채우기 (최대 30회)
 * 인증: Authorization: Bearer <CRON_SECRET>  (config.toml 에서 verify_jwt = false)
 */
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  fetchDraw,
  fetchPrizes,
  fetchTopStores,
  normalizeStoreCode,
  type DrawInfo,
  type TopStore,
} from '../_shared/dhlottery.ts';
import { geocodeAddress } from '../_shared/kakao.ts';
import { latestDrawnRound } from '../_shared/round.ts';

const MAX_ROUNDS_PER_CALL = 30;
const FIXED_PRIZE_4 = 50_000;
const FIXED_PRIZE_5 = 5_000;

interface RoundOutcome {
  round: number;
  status: 'saved' | 'not-yet' | 'error';
  settledTickets?: number;
  stores?: number;
  skippedStoreIds?: string[];
  error?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function serviceKey(): string {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  // 새 API 키 체계: SUPABASE_SECRET_KEYS = {"default": "sb_secret_..."}
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>;
    return keys.default ?? Object.values(keys)[0] ?? '';
  } catch {
    return '';
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 처리할 회차 목록 */
async function pickRounds(sb: SupabaseClient, params: { round?: number; from?: number; to?: number }): Promise<number[]> {
  const latest = latestDrawnRound();
  if (params.round) return [params.round];
  if (params.from && params.to) {
    const from = Math.max(1, params.from);
    const to = Math.min(latest, params.to);
    return Array.from({ length: Math.max(0, Math.min(MAX_ROUNDS_PER_CALL, to - from + 1)) }, (_, i) => from + i);
  }
  const { data } = await sb
    .from('winning_draws')
    .select('round, prize_amounts, store_codes')
    .order('round', { ascending: false })
    .limit(1);
  const last = data?.[0];
  const rounds: number[] = [];
  // 최근 회차인데 당첨금/배출점이 비어 있으면 다시 채움 (일요일 재시도용)
  const incomplete =
    last && latest - last.round <= 1 && (!last.prize_amounts || last.prize_amounts.slice(0, 3).some((p: number | null) => p === null) || !last.store_codes?.length);
  if (incomplete) rounds.push(last.round);
  const start = last ? last.round + 1 : latest;
  for (let r = start; r <= latest && rounds.length < MAX_ROUNDS_PER_CALL; r += 1) rounds.push(r);
  return rounds;
}

async function upsertStores(sb: SupabaseClient, stores: TopStore[]): Promise<{ codes: string[]; skipped: string[] }> {
  const kakaoKey = Deno.env.get('KAKAO_REST_API_KEY');
  const codes: string[] = [];
  const skipped: string[] = [];
  const rows = [];
  for (const s of stores) {
    const code = normalizeStoreCode(s.id);
    if (!code) {
      skipped.push(s.id);
      continue;
    }
    codes.push(code);
    rows.push({ code, name: s.name.slice(0, 100), address: s.address });
  }
  if (!rows.length) return { codes, skipped };

  const unique = [...new Map(rows.map((r) => [r.code, r])).values()];
  const { data: existing } = await sb.from('stores').select('code, lat').in('code', unique.map((r) => r.code));
  const hasCoord = new Set((existing ?? []).filter((e) => e.lat !== null).map((e) => e.code));

  const withCoords = await Promise.all(
    unique.map(async (r) => {
      if (hasCoord.has(r.code)) return r;
      const coord = await geocodeAddress(r.address, kakaoKey).catch(() => null);
      return coord ? { ...r, ...coord } : r;
    }),
  );
  const { error } = await sb.from('stores').upsert(withCoords, { onConflict: 'code' });
  if (error) throw error;
  return { codes, skipped };
}

async function crawlRound(sb: SupabaseClient, round: number): Promise<RoundOutcome> {
  const draw: DrawInfo | null = await fetchDraw(round);
  if (!draw) return { round, status: 'not-yet' };

  const [prizes, stores] = await Promise.all([
    fetchPrizes(round).catch(() => [null, null, null, null, null] as Array<number | null>),
    fetchTopStores(round).catch(() => [] as TopStore[]),
  ]);
  const prize_amounts = [
    prizes[0] ?? draw.firstPrize,
    prizes[1],
    prizes[2],
    prizes[3] ?? FIXED_PRIZE_4,
    prizes[4] ?? FIXED_PRIZE_5,
  ];

  const first = stores.filter((s) => s.rank === 1);
  const second = stores.filter((s) => s.rank === 2);
  const { codes, skipped } = await upsertStores(sb, stores);

  // winning_draws.store_codes 는 text[] — 코드 형식이 달라도 원본 ID 를 남겨 둡니다
  const toCode = (s: TopStore) => normalizeStoreCode(s.id) ?? s.id;
  const { error } = await sb.from('winning_draws').upsert(
    {
      round,
      draw_date: draw.drawDate,
      numbers: draw.numbers,
      bonus: draw.bonus,
      store_codes: [...new Set(first.map(toCode))],
      second_store_codes: [...new Set(second.map(toCode))],
      prize_amounts,
    },
    { onConflict: 'round' },
  );
  if (error) throw error;

  const { data: settled, error: settleError } = await sb.rpc('settle_round', { p_round: round });
  if (settleError) throw settleError;
  if (codes.length) await sb.rpc('refresh_store_stats', { p_codes: codes });

  return { round, status: 'saved', settledTickets: settled ?? 0, stores: codes.length, skippedStoreIds: skipped };
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return json({ error: 'unauthorized' }, 401);
  }

  const url = new URL(req.url);
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const num = (v: unknown) => (v === undefined || v === null || v === '' ? undefined : Number(v));
  const params = {
    round: num(url.searchParams.get('round') ?? body.round),
    from: num(url.searchParams.get('from') ?? body.from),
    to: num(url.searchParams.get('to') ?? body.to),
  };

  const sb = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rounds = await pickRounds(sb, params);
  const results: RoundOutcome[] = [];
  for (const round of rounds) {
    try {
      const outcome = await crawlRound(sb, round);
      results.push(outcome);
      if (outcome.status === 'not-yet') break; // 아직 발표 전 → 다음 cron 에서 재시도
    } catch (e) {
      results.push({ round, status: 'error', error: e instanceof Error ? e.message : String(e) });
    }
    if (rounds.length > 1) await sleep(400); // 동행복권 서버 부담 줄이기
  }

  console.log('[crawl-draw]', JSON.stringify(results));
  return json({ ok: true, latestByDate: latestDrawnRound(), results });
});
