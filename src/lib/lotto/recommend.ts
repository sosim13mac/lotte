/**
 * 개인화 추천 (랜덤 + 이유). 순수 함수 — Web Worker 에서도, 테스트에서도 그대로 실행됩니다.
 *
 * a. 100만 개 조합을 무작위 생성
 * b. 균형 필터: 연속 3개 이상 / 한 구간(10단위) 4개 이상 / 합계 90~200 밖 / 홀짝 6:0·0:6 제외
 * c. 게임마다 "역할"을 나눠 구성 — 생년월일 수는 5게임 중 1~2게임에만, 꿈 행운수는 1~2게임에만,
 *    나머지는 최근 당첨번호 통계(자주 나온 번호 + 오래 안 나온 번호)를 섞어 구성
 * d. 서로 너무 겹치지 않는 count 게임 + 게임·번호마다 실제 근거(이유) 표시
 *
 * 어떤 조합도 1등 확률(1/8,145,060)은 같습니다. 통계·필터는 '근거 있게 고르는 방식'일 뿐
 * 당첨 가능성을 높이지 않으며, 화면에도 그렇게 안내합니다.
 */
import type { DreamEntry } from '@/lib/repo/types';
import { defaultRng, randInt, type Rng } from '@/lib/random';
import { gameStats, passesRecommendFiltersFast, zoneOf, type GameStats } from './analysis';
import { birthdayNumber } from './birthday';
import { matchDream } from './dream';

export interface RecommendInput {
  /** 'YYYY-MM-DD' */
  birthDate: string | null;
  /** 꿈 내용 (자유 입력) */
  dreamText?: string | null;
  dreamMap: readonly DreamEntry[];
  /** 최근 당첨번호 (최신 회차가 먼저). 5회 미만이면 통계 분석은 생략합니다 */
  recentDraws?: readonly (readonly number[])[];
}

export interface RecommendOptions {
  /** 생성할 무작위 조합 수 (기본 1,000,000) */
  samples?: number;
  /** 반환 게임 수 (기본 5) */
  count?: number;
  /** 고른 게임끼리 겹쳐도 되는 번호 수 (기본 3) */
  maxOverlap?: number;
  rng?: Rng;
}

/** 게임을 구성한 방식 */
export type GameRole = 'birthday' | 'dream' | 'stats' | 'balance';

export interface NumberNote {
  n: number;
  /** 이 번호를 넣은 근거 (예: "생년월일 수", "최근 20회 중 5회 출현") */
  note: string;
}

export interface RecommendedGame {
  numbers: number[];
  role: GameRole;
  /** 이유 태그 3개 */
  tags: string[];
  /** 번호별 근거 (numbers 와 같은 순서) */
  notes: NumberNote[];
  stats: GameStats;
}

/** 최근 당첨번호 통계 요약 (화면에 분석 근거로 보여줌) */
export interface StatsSummary {
  /** 분석한 회차 수 */
  window: number;
  /** 자주 나온 번호 (많이 나온 순) */
  hot: number[];
  /** 오래 안 나온 번호 (오래된 순) */
  cold: number[];
}

export interface RecommendResult {
  games: RecommendedGame[];
  birthdayNumber: number | null;
  dream: DreamEntry | null;
  /** 최근 당첨번호 통계 (데이터가 5회 미만이면 null) */
  analysis: StatsSummary | null;
  /** 역할별 게임 수 */
  roleCounts: Record<GameRole, number>;
  sampled: number;
  /** 균형 필터(b)를 통과한 조합 수 */
  passedFilters: number;
  /** 필터 + 통계 조건(자주 나온 번호·오래 안 나온 번호 포함)까지 만족한 조합 수. 통계가 없으면 passedFilters 와 같음 */
  candidates: number;
}

const MAX_CANDIDATES = 300_000;
const MIN_DRAWS_FOR_STATS = 5;
const HOT_COUNT = 8;
const COLD_COUNT = 8;

interface NumberStats {
  window: number;
  freq: number[]; // [1..45] 최근 window 회 중 출현 횟수
  absence: number[]; // [1..45] 마지막으로 나온 뒤 지난 회차 수 (window 안에 없으면 window)
  hot: boolean[];
  cold: boolean[];
  hotList: number[];
  coldList: number[];
  last: Set<number>; // 직전 회차 번호
}

/** 최근 당첨번호(최신 먼저)에서 번호별 출현 횟수·미출현 기간을 계산 */
export function computeNumberStats(draws: readonly (readonly number[])[] | undefined): NumberStats | null {
  if (!draws || draws.length < MIN_DRAWS_FOR_STATS) return null;
  const window = draws.length;
  const freq = new Array<number>(46).fill(0);
  const absence = new Array<number>(46).fill(window);
  draws.forEach((numbers, age) => {
    for (const n of numbers) {
      if (n < 1 || n > 45) continue;
      freq[n] += 1;
      if (absence[n] === window) absence[n] = age;
    }
  });
  const nums = Array.from({ length: 45 }, (_, i) => i + 1);
  const hotList = [...nums].sort((a, b) => freq[b] - freq[a] || a - b).slice(0, HOT_COUNT);
  const coldList = [...nums].sort((a, b) => absence[b] - absence[a] || freq[a] - freq[b] || a - b).slice(0, COLD_COUNT);
  const hot = new Array<boolean>(46).fill(false);
  const cold = new Array<boolean>(46).fill(false);
  hotList.forEach((n) => (hot[n] = true));
  coldList.forEach((n) => (cold[n] = true));
  return { window, freq, absence, hot, cold, hotList, coldList, last: new Set(draws[0]) };
}

/** 통계 게임 조건: 자주 나온 번호 ≥1 + 오래 안 나온 번호 ≥1 + 직전 회차 번호 ≤1 */
function statsOk(p: ArrayLike<number>, st: NumberStats): boolean {
  let h = 0;
  let c = 0;
  let carry = 0;
  for (let i = 0; i < p.length; i += 1) {
    const n = p[i];
    if (st.hot[n]) h += 1;
    if (st.cold[n]) c += 1;
    if (st.last.has(n)) carry += 1;
  }
  return h >= 1 && c >= 1 && carry <= 1;
}

/** 5게임이면 생일수 1~2게임, 꿈 1~2게임 (통계 게임이 1개 이상 남도록) */
function planRoles(count: number, hasBday: boolean, hasDream: boolean, hasStats: boolean, rng: Rng): GameRole[] {
  const base: GameRole = hasStats ? 'stats' : 'balance';
  const roles: GameRole[] = Array.from({ length: count }, () => base);
  const room = Math.max(0, count - 1); // 최소 1게임은 통계/균형 게임으로 남김
  let nb = hasBday && room > 0 ? 1 + (count >= 5 ? randInt(rng, 2) : 0) : 0;
  let nd = hasDream && room > 0 ? 1 + (count >= 5 ? randInt(rng, 2) : 0) : 0;
  while (nb + nd > room) {
    if (nd > 1 || (nd >= nb && nd > 0)) nd -= 1;
    else nb -= 1;
  }
  const idx = Array.from({ length: count }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i -= 1) {
    const j = randInt(rng, i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  for (let k = 0; k < nb; k += 1) roles[idx[k]] = 'birthday';
  for (let k = 0; k < nd; k += 1) roles[idx[nb + k]] = 'dream';
  return roles;
}

export function recommend(input: RecommendInput, opts: RecommendOptions = {}): RecommendResult {
  const samples = opts.samples ?? 1_000_000;
  const count = opts.count ?? 5;
  const maxOverlap = opts.maxOverlap ?? 3;
  const rng = opts.rng ?? defaultRng();

  const bday = input.birthDate ? birthdayNumber(input.birthDate) : null;
  const dream = matchDream(input.dreamText, input.dreamMap);
  const dreamNums = dream?.numbers ?? [];
  const st = computeNumberStats(input.recentDraws);

  // a, b: 무작위 생성 → 균형 필터 (생일수·꿈은 여기서 강제하지 않음)
  const pool = new Uint8Array(45);
  const pick = new Uint8Array(6);
  const zones = new Uint8Array(5);
  const buffer = new Uint8Array(MAX_CANDIDATES * 6);
  let stored = 0;
  let passed = 0;
  let candidates = 0;

  for (let s = 0; s < samples; s += 1) {
    for (let i = 0; i < 45; i += 1) pool[i] = i + 1;
    for (let i = 0; i < 6; i += 1) {
      const j = i + randInt(rng, 45 - i);
      const t = pool[i];
      pool[i] = pool[j];
      pool[j] = t;
      pick[i] = pool[i];
    }
    pick.sort();
    if (!passesRecommendFiltersFast(pick, zones)) continue;
    passed += 1;
    if (!st || statsOk(pick, st)) candidates += 1;
    // 통과 조합이 아주 많으면 저장소 크기만큼 균등 표본 유지 (reservoir sampling)
    if (stored < MAX_CANDIDATES) {
      buffer.set(pick, stored * 6);
      stored += 1;
    } else {
      const r = randInt(rng, passed);
      if (r < MAX_CANDIDATES) buffer.set(pick, r * 6);
    }
  }

  const order = Array.from({ length: stored }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = randInt(rng, i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }

  const has = (idx: number, n: number) => {
    for (let k = 0; k < 6; k += 1) if (buffer[idx * 6 + k] === n) return true;
    return false;
  };
  const hasAny = (idx: number, nums: readonly number[]) => nums.some((n) => has(idx, n));
  const matchesRole = (idx: number, role: GameRole): boolean => {
    const view = buffer.subarray(idx * 6, idx * 6 + 6);
    const withBday = bday !== null && has(idx, bday);
    const withDream = dreamNums.length > 0 && hasAny(idx, dreamNums);
    // 생일수·꿈 행운수는 해당 역할의 게임에만 들어가서 "N게임에만 넣었다"는 설명이 사실이 되게 함
    switch (role) {
      case 'birthday':
        return withBday && !withDream;
      case 'dream':
        return withDream && !withBday;
      case 'stats':
        return !withBday && !withDream && st !== null && statsOk(view, st);
      default:
        return !withBday && !withDream;
    }
  };

  const roles = planRoles(count, bday !== null, dream !== null, st !== null, rng);
  // 구하기 어려운 역할(생일수·꿈)부터 채움
  const slotOrder = roles.map((_, i) => i).sort((a, b) => rank(roles[a]) - rank(roles[b]));
  const slots: Array<{ numbers: number[]; role: GameRole } | null> = Array.from({ length: count }, () => null);
  const chosen = () => slots.filter((s): s is { numbers: number[]; role: GameRole } => s !== null).map((s) => s.numbers);

  for (const slot of slotOrder) {
    // 겹침 허용치를 단계적으로 늘리고, 그래도 없으면 역할을 '균형'으로 낮춰 정직하게 표시
    for (const role of roleFallbacks(roles[slot])) {
      for (const limit of [maxOverlap, 4, 5]) {
        for (const idx of order) {
          if (!matchesRole(idx, role)) continue;
          const g = Array.from(buffer.subarray(idx * 6, idx * 6 + 6));
          const cur = chosen();
          const overlapOk = cur.every((c) => c.filter((n) => g.includes(n)).length <= limit);
          const duplicate = cur.some((c) => c.every((n, k) => n === g[k]));
          if (overlapOk && !duplicate) {
            slots[slot] = { numbers: g, role };
            break;
          }
        }
        if (slots[slot]) break;
      }
      if (slots[slot]) break;
    }
  }

  const ctx: Ctx = { bday, dream, st };
  const games: RecommendedGame[] = slots
    .filter((s): s is { numbers: number[]; role: GameRole } => s !== null)
    .map(({ numbers, role }) => {
      const stats = gameStats(numbers);
      return { numbers, role, stats, tags: reasonTags(numbers, stats, role, ctx), notes: numbers.map((n) => ({ n, note: numberNote(n, ctx) })) };
    });

  const roleCounts: Record<GameRole, number> = { birthday: 0, dream: 0, stats: 0, balance: 0 };
  games.forEach((g) => (roleCounts[g.role] += 1));

  return {
    games,
    birthdayNumber: bday,
    dream,
    analysis: st ? { window: st.window, hot: st.hotList, cold: st.coldList } : null,
    roleCounts,
    sampled: samples,
    passedFilters: passed,
    candidates,
  };
}

const rank = (r: GameRole) => (r === 'birthday' ? 0 : r === 'dream' ? 1 : r === 'stats' ? 2 : 3);
const roleFallbacks = (r: GameRole): GameRole[] => (r === 'balance' ? ['balance'] : r === 'stats' ? ['stats', 'balance'] : [r, 'balance']);

interface Ctx {
  bday: number | null;
  dream: DreamEntry | null;
  st: NumberStats | null;
}

/** 번호 하나를 넣은 근거. 모든 문구는 실제 데이터에서 계산한 값입니다. */
export function numberNote(n: number, ctx: Ctx): string {
  if (ctx.bday !== null && n === ctx.bday) return '생년월일 수';
  if (ctx.dream?.numbers.includes(n)) return `${ctx.dream.keyword}꿈 행운수`;
  const st = ctx.st;
  if (!st) return `${zoneOf(n) + 1}번째 구간(${zoneOf(n) * 10 + 1}~${Math.min(45, zoneOf(n) * 10 + 10)}번대)`;
  if (st.cold[n]) return st.absence[n] >= st.window ? `최근 ${st.window}회 동안 미출현` : `${st.absence[n]}회째 미출현`;
  if (st.hot[n]) return `최근 ${st.window}회 중 ${st.freq[n]}회 출현`;
  return `최근 ${st.window}회 중 ${st.freq[n]}회 출현 (평균권)`;
}

/** 이유 태그 3개: 구성 방식 → 통계 근거 → 균형 순 */
export function reasonTags(numbers: number[], stats: GameStats, role: GameRole, ctx: Ctx): string[] {
  const tags: string[] = [];
  if (role === 'birthday' && ctx.bday !== null) tags.push(`생년월일 수 ${ctx.bday} 포함`);
  if (role === 'dream' && ctx.dream) {
    const hit = ctx.dream.numbers.filter((n) => numbers.includes(n));
    tags.push(`${ctx.dream.keyword}꿈 행운수 ${hit.join('·')}`);
  }
  const st = ctx.st;
  if (st) {
    const hot = numbers.filter((n) => st.hot[n]).sort((a, b) => st.freq[b] - st.freq[a])[0];
    const cold = numbers.filter((n) => st.cold[n]).sort((a, b) => st.absence[b] - st.absence[a])[0];
    if (hot !== undefined) tags.push(`${hot}번 최근 ${st.window}회 중 ${st.freq[hot]}회 출현`);
    if (cold !== undefined) tags.push(st.absence[cold] >= st.window ? `${cold}번 ${st.window}회 미출현` : `${cold}번 ${st.absence[cold]}회째 미출현`);
  }
  tags.push(`합계 ${stats.sum} 균형`);
  tags.push(`홀짝 ${stats.odd}:${stats.even}`);
  tags.push(`${stats.zonesUsed}개 구간 분산`);
  return tags.slice(0, 3);
}
