/**
 * 데모 모드용 샘플 데이터.
 * 당첨번호·판매점은 실제 데이터가 아니라 시드 난수로 만든 가짜 데이터입니다.
 */
import { DREAM_SEED } from '@/lib/lotto/dreamSeed';
import { GAME_PRICE } from '@/lib/lotto/constants';
import { ticketResult } from '@/lib/lotto/prize';
import { drawDate, drawTime, latestDrawnRound } from '@/lib/lotto/round';
import { pickNumbers, randInt, seededRng, type Rng } from '@/lib/random';
import type { DreamEntry, Profile, Store, Ticket, WinningDraw } from './types';

export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000000';

const nowIso = () => new Date().toISOString();

/** 홍대·합정·신촌 주변 가상의 판매점 */
export const DEMO_STORES: Store[] = [
  ['1100101', '행운편의점 홍대점', '서울 마포구 와우산로 94', 37.5546, 126.9229, 4, 11, true],
  ['1100102', '대박복권방 합정점', '서울 마포구 양화로 45', 37.5496, 126.9139, 2, 7, true],
  ['1100103', '황금돼지 로또 신촌점', '서울 서대문구 연세로 12', 37.5582, 126.9368, 1, 3, false],
  ['1100104', '럭키세븐 마트 연남점', '서울 마포구 동교로 263', 37.5623, 126.9256, 0, 2, false],
  ['1100105', '별빛복권 상수점', '서울 마포구 독막로 85', 37.5478, 126.9227, 3, 5, true],
  ['1100106', '쫄깃마트 망원점', '서울 마포구 망원로 70', 37.5563, 126.9047, 0, 1, false],
  ['1100107', '복덩이 편의점 서교점', '서울 마포구 잔다리로 30', 37.5521, 126.9195, 1, 4, false],
  ['1100108', '희망로또 동교점', '서울 마포구 동교로 194', 37.5583, 126.9234, 0, 0, false],
  ['1100109', '네잎클로버 복권 공덕점', '서울 마포구 마포대로 92', 37.5446, 126.9516, 5, 9, true],
  ['1100110', '무지개 슈퍼 이대점', '서울 서대문구 이화여대길 50', 37.5568, 126.9459, 0, 2, false],
].map(([code, name, address, lat, lng, first, second, hot]) => ({
  code: code as string,
  name: name as string,
  address: address as string,
  lat: lat as number,
  lng: lng as number,
  first_win_count: first as number,
  second_win_count: second as number,
  is_hot: hot as boolean,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}));

export const DEMO_DREAMS: DreamEntry[] = DREAM_SEED.map(([keyword, a, b]) => ({ keyword, numbers: [a, b] }));

export function demoProfile(): Profile {
  return {
    id: DEMO_USER_ID,
    email: 'demo@zzolgit.app',
    birth_date: '1992-08-15',
    monthly_budget: 30_000,
    created_at: nowIso(),
  };
}

function makeDraw(rng: Rng, round: number): WinningDraw {
  const numbers = pickNumbers(rng);
  let bonus = randInt(rng, 45) + 1;
  while (numbers.includes(bonus)) bonus = randInt(rng, 45) + 1;
  const firstStore = DEMO_STORES[randInt(rng, DEMO_STORES.length)].code;
  const secondStores = [0, 1, 2].map(() => DEMO_STORES[randInt(rng, DEMO_STORES.length)].code);
  return {
    round,
    draw_date: drawDate(round),
    numbers,
    bonus,
    store_codes: [firstStore],
    second_store_codes: [...new Set(secondStores)],
    prize_amounts: [
      1_500_000_000 + randInt(rng, 1_500_000) * 1000,
      45_000_000 + randInt(rng, 30_000) * 1000,
      1_300_000 + randInt(rng, 500) * 1000,
      50_000,
      5_000,
    ],
    created_at: nowIso(),
    updated_at: nowIso(),
  };
}

/** draw 번호 중 hits 개를 포함하고 나머지는 겹치지 않는 게임 */
function plantedGame(rng: Rng, draw: WinningDraw, hits: number): number[] {
  const pool = [...draw.numbers];
  const chosen = new Set<number>();
  while (chosen.size < hits) chosen.add(pool.splice(randInt(rng, pool.length), 1)[0]);
  while (chosen.size < 6) {
    const n = randInt(rng, 45) + 1;
    if (!draw.numbers.includes(n) && n !== draw.bonus) chosen.add(n);
  }
  return [...chosen].sort((a, b) => a - b);
}

export interface DemoDataset {
  generatedFor: number;
  draws: WinningDraw[];
  tickets: Ticket[];
}

/** 현재 날짜 기준 최근 30회차 당첨번호 + 최근 8주 티켓 */
export function buildDemoDataset(now = Date.now()): DemoDataset {
  const latest = latestDrawnRound(now);
  const rng = seededRng(latest * 7919);
  const draws: WinningDraw[] = [];
  for (let r = latest - 29; r <= latest; r += 1) draws.push(makeDraw(rng, r));
  const drawByRound = new Map(draws.map((d) => [d.round, d]));

  // [회차 오프셋, 게임 수, 심어둘 일치 개수(게임별), 개봉 여부]
  const plan: Array<[number, number, number[], boolean]> = [
    [-7, 5, [2, 1, 3], true],
    [-6, 2, [1], true],
    [-5, 5, [2, 0, 1, 2], true],
    [-4, 3, [4], true],
    [-3, 1, [1], true],
    [-2, 5, [0, 3, 1], true],
    [-1, 3, [2, 1], true],
    [0, 5, [1, 3, 2, 4, 0], false], // 이번 회차: 아직 안 열어본 티켓 (쫄깃 오픈 체험용)
    [0, 2, [2, 1], false],
  ];

  const tickets: Ticket[] = [];
  plan.forEach(([offset, gameCount, hits, opened], i) => {
    const round = latest + offset;
    const draw = drawByRound.get(round)!;
    const games = Array.from({ length: gameCount }, (_, g) =>
      g < hits.length ? plantedGame(rng, draw, hits[g]) : pickNumbers(rng),
    );
    const store = DEMO_STORES[(i * 3) % DEMO_STORES.length];
    // 추첨 1~3일 전 오후에 구매
    const purchase = new Date(drawTime(round).getTime() - (1 + randInt(rng, 3)) * 86_400_000 - randInt(rng, 6) * 3_600_000);
    const amount = games.length * GAME_PRICE;
    const win = ticketResult(games, draw).total;
    tickets.push({
      id: `demo-${round}-${i}`,
      user_id: DEMO_USER_ID,
      round,
      purchase_date: purchase.toISOString(),
      store_code: store.code,
      store_name: store.name,
      amount,
      games,
      win_amount: win,
      profit: win - amount,
      qr_raw: null,
      opened_at: opened ? purchase.toISOString() : null,
      settled_at: drawTime(round).toISOString(),
      created_at: purchase.toISOString(),
    });
  });

  // 다음 회차(추첨 전) 티켓
  const nextRound = latest + 1;
  const pendingGames = [pickNumbers(rng), pickNumbers(rng), pickNumbers(rng)];
  tickets.push({
    id: `demo-${nextRound}-pending`,
    user_id: DEMO_USER_ID,
    round: nextRound,
    purchase_date: new Date(Math.min(now, drawTime(nextRound).getTime() - 3_600_000)).toISOString(),
    store_code: DEMO_STORES[0].code,
    store_name: DEMO_STORES[0].name,
    amount: pendingGames.length * GAME_PRICE,
    games: pendingGames,
    win_amount: 0,
    profit: -pendingGames.length * GAME_PRICE,
    qr_raw: null,
    opened_at: null,
    settled_at: null,
    created_at: nowIso(),
  });

  tickets.sort((a, b) => b.purchase_date.localeCompare(a.purchase_date));
  return { generatedFor: latest, draws, tickets };
}
