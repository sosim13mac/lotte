import 'server-only';
import { getPool } from '@/lib/server/db';
import { latestDrawnRound } from '@/lib/lotto/round';
import { fetchDraw, fetchTopStores, normalizeStoreCode, type DrawInfo, type TopStore } from './dhlottery';
import { geocodeAddress } from './kakao';
import { notifyRound, type NotifyOutcome } from './notify';

export const MAX_ROUNDS_PER_CALL = 30;
const FIXED_PRIZE_4 = 50_000;
const FIXED_PRIZE_5 = 5_000;

export interface RoundOutcome {
  round: number;
  status: 'saved' | 'not-yet' | 'error';
  settledTickets?: number;
  stores?: number;
  skippedStoreIds?: string[];
  push?: NotifyOutcome | { skipped: string };
  error?: string;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 처리할 회차 목록 */
export async function pickRounds(params: { round?: number; from?: number; to?: number }): Promise<number[]> {
  const latest = latestDrawnRound();
  if (params.round) return [params.round];
  if (params.from && params.to) {
    const from = Math.max(1, params.from);
    const to = Math.min(latest, params.to);
    return Array.from({ length: Math.max(0, Math.min(MAX_ROUNDS_PER_CALL, to - from + 1)) }, (_, i) => from + i);
  }
  const { rows } = await getPool().query<{ round: number; prize_amounts: (number | null)[] | null; store_codes: string[] | null }>(
    'select round, prize_amounts, store_codes from public.winning_draws order by round desc limit 1',
  );
  const last = rows[0];
  const rounds: number[] = [];
  // 최근 회차인데 당첨금/배출점이 비어 있으면 다시 채움 (일요일 재시도용)
  const incomplete =
    last && latest - last.round <= 1 && (!last.prize_amounts || last.prize_amounts.slice(0, 3).some((p) => p === null) || !last.store_codes?.length);
  if (incomplete) rounds.push(last.round);
  const start = last ? last.round + 1 : latest;
  for (let r = start; r <= latest && rounds.length < MAX_ROUNDS_PER_CALL; r += 1) rounds.push(r);
  return rounds;
}

async function upsertStores(stores: TopStore[]): Promise<{ codes: string[]; skipped: string[] }> {
  const kakaoKey = process.env.KAKAO_REST_API_KEY;
  const pool = getPool();
  const codes: string[] = [];
  const skipped: string[] = [];
  const rows: Array<{ code: string; name: string; address: string; lat: number | null; lng: number | null }> = [];
  for (const s of stores) {
    const code = normalizeStoreCode(s.id);
    if (!code) {
      skipped.push(s.id);
      continue;
    }
    codes.push(code);
    rows.push({ code, name: s.name.slice(0, 100), address: s.address, lat: s.lat, lng: s.lng });
  }
  if (!rows.length) return { codes, skipped };

  const unique = [...new Map(rows.map((r) => [r.code, r])).values()];
  const existing = await pool.query<{ code: string; lat: number | null }>('select code, lat from public.stores where code = any($1::text[])', [unique.map((r) => r.code)]);
  const hasCoord = new Set(existing.rows.filter((e) => e.lat !== null).map((e) => e.code));

  // 좌표: 동행복권이 주는 값 우선 → 없고 아직 좌표도 없는 판매점만 카카오 지오코딩 (보통 0건)
  const coords = await Promise.all(
    unique.map(async (r) => {
      if (r.lat !== null && r.lng !== null) return { lat: r.lat, lng: r.lng };
      if (hasCoord.has(r.code)) return null;
      return geocodeAddress(r.address, kakaoKey).catch(() => null);
    }),
  );
  // 한 번의 쿼리로 일괄 저장 (왕복 횟수를 줄여 함수 제한 시간 안에 끝내기 위해)
  await pool.query(
    `insert into public.stores (code, name, address, lat, lng)
     select * from unnest($1::text[], $2::text[], $3::text[], $4::float8[], $5::float8[])
     on conflict (code) do update set name = excluded.name, address = excluded.address,
       lat = coalesce(excluded.lat, public.stores.lat), lng = coalesce(excluded.lng, public.stores.lng)`,
    [unique.map((r) => r.code), unique.map((r) => r.name), unique.map((r) => r.address), coords.map((c) => c?.lat ?? null), coords.map((c) => c?.lng ?? null)],
  );
  return { codes, skipped };
}

export async function crawlRound(round: number): Promise<RoundOutcome> {
  const pool = getPool();
  const draw: DrawInfo | null = await fetchDraw(round);
  if (!draw) return { round, status: 'not-yet' };

  const stores = await fetchTopStores(round).catch(() => [] as TopStore[]);
  const [p1, p2, p3, p4, p5] = draw.prizes;
  const prize_amounts = [p1, p2, p3, p4 ?? FIXED_PRIZE_4, p5 ?? FIXED_PRIZE_5];

  const first = stores.filter((s) => s.rank === 1);
  const second = stores.filter((s) => s.rank === 2);
  const { codes, skipped } = await upsertStores(stores);

  // winning_draws.store_codes 는 text[] — 코드 형식이 달라도 원본 ID 를 남겨 둡니다
  const toCode = (s: TopStore) => normalizeStoreCode(s.id) ?? s.id;
  await pool.query(
    `insert into public.winning_draws (round, draw_date, numbers, bonus, store_codes, second_store_codes, prize_amounts)
     values ($1, $2, $3::int[], $4, $5::text[], $6::text[], $7::bigint[])
     on conflict (round) do update set draw_date = excluded.draw_date, numbers = excluded.numbers, bonus = excluded.bonus,
       store_codes = excluded.store_codes, second_store_codes = excluded.second_store_codes, prize_amounts = excluded.prize_amounts`,
    [round, draw.drawDate, draw.numbers, draw.bonus, [...new Set(first.map(toCode))], [...new Set(second.map(toCode))], prize_amounts],
  );

  const settled = await pool.query<{ n: number }>('select public.settle_round($1) as n', [round]);
  if (codes.length) await pool.query('select public.refresh_store_stats($1::text[])', [codes]);

  // 최근 회차만 푸시 (과거 데이터 채우기 중에는 보내지 않음)
  const push = round >= latestDrawnRound() - 1 ? await notifyRound(round).catch((e) => ({ skipped: String(e) })) : undefined;

  return { round, status: 'saved', settledTickets: settled.rows[0]?.n ?? 0, stores: codes.length, skippedStoreIds: skipped, push };
}
