/**
 * 개인화 추천 (랜덤 + 이유 태그). 순수 함수 — Web Worker 에서도, 테스트에서도 그대로 실행됩니다.
 *
 * a. 100만 개 조합을 무작위 생성
 * b. 필터: 연속 3개 이상 / 한 구간(10단위) 4개 이상 / 합계 90~200 밖 / 홀짝 6:0·0:6 제외
 * c. 생일수 (년+월+일)%45+1 강제 포함
 * d. 꿈 키워드가 dream_map 에 있으면 그 행운수 2개 중 1개 이상 강제 포함
 * e. 5게임 + 게임마다 이유 태그 3개
 *
 * 어떤 조합도 1등 확률(1/8,145,060)은 같습니다. 필터는 '보기 좋은 조합'을 고르는 취향일 뿐입니다.
 */
import type { DreamEntry } from '@/lib/repo/types';
import { defaultRng, randInt, type Rng } from '@/lib/random';
import { gameStats, passesRecommendFiltersFast, type GameStats } from './analysis';
import { birthdayNumber } from './birthday';
import { matchDream } from './dream';

export interface RecommendInput {
  /** 'YYYY-MM-DD' */
  birthDate: string | null;
  /** 꿈 내용 (자유 입력) */
  dreamText?: string | null;
  dreamMap: readonly DreamEntry[];
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

export interface RecommendedGame {
  numbers: number[];
  /** 이유 태그 3개 (예: "생일수 23 포함", "돼지꿈 행운수 12", "합계 142 균형") */
  tags: string[];
  stats: GameStats;
}

export interface RecommendResult {
  games: RecommendedGame[];
  birthdayNumber: number | null;
  dream: DreamEntry | null;
  sampled: number;
  /** 필터(b)를 통과한 조합 수 */
  passedFilters: number;
  /** 필터 + 강제 포함(c, d)까지 만족한 조합 수 */
  candidates: number;
}

const MAX_CANDIDATES = 300_000;

export function recommend(input: RecommendInput, opts: RecommendOptions = {}): RecommendResult {
  const samples = opts.samples ?? 1_000_000;
  const count = opts.count ?? 5;
  const maxOverlap = opts.maxOverlap ?? 3;
  const rng = opts.rng ?? defaultRng();

  const bday = input.birthDate ? birthdayNumber(input.birthDate) : null;
  const dream = matchDream(input.dreamText, input.dreamMap);
  const dreamNums = dream?.numbers ?? [];

  // a~d: 무작위 생성 → 필터 → 강제 포함 조건
  const pool = new Uint8Array(45);
  const pick = new Uint8Array(6);
  const zones = new Uint8Array(5);
  const buffer = new Uint8Array(MAX_CANDIDATES * 6);
  let stored = 0;
  let candidates = 0;
  let passed = 0;

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
    if (bday !== null && !pick.includes(bday)) continue;
    if (dreamNums.length && !dreamNums.some((n) => pick.includes(n))) continue;
    candidates += 1;
    // 후보가 아주 많으면 저장소 크기만큼 균등 표본 유지 (reservoir sampling)
    if (stored < MAX_CANDIDATES) {
      buffer.set(pick, stored * 6);
      stored += 1;
    } else {
      const r = randInt(rng, candidates);
      if (r < MAX_CANDIDATES) buffer.set(pick, r * 6);
    }
  }

  // e: 후보를 섞어서, 서로 너무 겹치지 않게 count 개 고르기
  const order = Array.from({ length: stored }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = randInt(rng, i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  const chosen: number[][] = [];
  for (const limit of [maxOverlap, 4, 5]) {
    for (const idx of order) {
      if (chosen.length >= count) break;
      const g = Array.from(buffer.subarray(idx * 6, idx * 6 + 6));
      const overlapOk = chosen.every((c) => c.filter((n) => g.includes(n)).length <= limit);
      const duplicate = chosen.some((c) => c.every((n, k) => n === g[k]));
      if (overlapOk && !duplicate) chosen.push(g);
    }
    if (chosen.length >= count) break;
  }

  return {
    games: chosen.map((numbers) => {
      const stats = gameStats(numbers);
      return { numbers, stats, tags: reasonTags(numbers, stats, bday, dream) };
    }),
    birthdayNumber: bday,
    dream,
    sampled: samples,
    passedFilters: passed,
    candidates,
  };
}

/** 이유 태그 3개: 생일수 → 꿈 → 합계 → 홀짝 → 구간 → 저고 순으로 채움 */
export function reasonTags(numbers: number[], stats: GameStats, bday: number | null, dream: DreamEntry | null): string[] {
  const tags: string[] = [];
  if (bday !== null && numbers.includes(bday)) tags.push(`생일수 ${bday} 포함`);
  if (dream) {
    const hit = dream.numbers.filter((n) => numbers.includes(n));
    if (hit.length) tags.push(`${dream.keyword}꿈 행운수 ${hit.join('·')}`);
  }
  tags.push(`합계 ${stats.sum} 균형`);
  tags.push(`홀짝 ${stats.odd}:${stats.even}`);
  tags.push(`${stats.zonesUsed}개 구간 분산`);
  tags.push(`저고 ${stats.low}:${stats.high}`);
  return tags.slice(0, 3);
}
