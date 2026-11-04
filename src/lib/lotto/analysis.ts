/** 조합 통계 (추천 필터 · 품질 평가 · 이유 태그 공통) */

/** 10단위 구간: 1~10, 11~20, 21~30, 31~40, 41~45 (공 색상 구간과 동일) */
export function zoneOf(n: number): number {
  return Math.min(4, Math.floor((n - 1) / 10));
}

export interface GameStats {
  sum: number;
  odd: number;
  even: number;
  /** 가장 긴 연속 번호 길이 (예: 7,8,9 → 3) */
  maxRun: number;
  /** 구간별 개수 [1~10, 11~20, 21~30, 31~40, 41~45] */
  zones: number[];
  /** 한 구간에 몰린 최대 개수 */
  maxZone: number;
  /** 번호가 하나라도 있는 구간 수 */
  zonesUsed: number;
  /** 1~22 저번호 / 23~45 고번호 */
  low: number;
  high: number;
}

/** sorted 를 가정하지 않음 */
export function gameStats(game: readonly number[]): GameStats {
  const nums = [...game].sort((a, b) => a - b);
  let sum = 0;
  let odd = 0;
  let low = 0;
  const zones = [0, 0, 0, 0, 0];
  let maxRun = 1;
  let run = 1;
  nums.forEach((n, i) => {
    sum += n;
    if (n % 2 === 1) odd += 1;
    if (n <= 22) low += 1;
    zones[zoneOf(n)] += 1;
    if (i > 0) {
      run = n === nums[i - 1] + 1 ? run + 1 : 1;
      if (run > maxRun) maxRun = run;
    }
  });
  return {
    sum,
    odd,
    even: nums.length - odd,
    maxRun,
    zones,
    maxZone: Math.max(...zones),
    zonesUsed: zones.filter(Boolean).length,
    low,
    high: nums.length - low,
  };
}

/** 추천 필터 기준 (요구사항 3-b) */
export const RECOMMEND_FILTER = {
  /** 연속 3개 이상 제외 */
  maxRunExclusive: 3,
  /** 한 구간 4개 이상 제외 */
  maxZoneExclusive: 4,
  /** 합계 90~200 밖 제외 */
  sumMin: 90,
  sumMax: 200,
} as const;

export function passesRecommendFilters(s: GameStats): boolean {
  return (
    s.maxRun < RECOMMEND_FILTER.maxRunExclusive &&
    s.maxZone < RECOMMEND_FILTER.maxZoneExclusive &&
    s.sum >= RECOMMEND_FILTER.sumMin &&
    s.sum <= RECOMMEND_FILTER.sumMax &&
    s.odd !== 0 &&
    s.odd !== 6 // 홀짝 6:0, 0:6 제외
  );
}

/**
 * passesRecommendFilters(gameStats(p)) 와 같은 판정을 할당 없이 수행 (100만 회 루프용).
 * p 는 오름차순 정렬된 6개 번호, zones 는 길이 5 이상의 작업용 버퍼.
 */
export function passesRecommendFiltersFast(p: ArrayLike<number>, zones: Uint8Array): boolean {
  zones.fill(0);
  let sum = 0;
  let odd = 0;
  let run = 1;
  let maxRun = 1;
  let maxZone = 0;
  for (let i = 0; i < 6; i += 1) {
    const n = p[i];
    sum += n;
    odd += n & 1;
    const z = n > 40 ? 4 : ((n - 1) / 10) | 0;
    zones[z] += 1;
    if (zones[z] > maxZone) maxZone = zones[z];
    if (i > 0 && n === p[i - 1] + 1) {
      run += 1;
      if (run > maxRun) maxRun = run;
    } else run = 1;
  }
  return (
    maxRun < RECOMMEND_FILTER.maxRunExclusive &&
    maxZone < RECOMMEND_FILTER.maxZoneExclusive &&
    sum >= RECOMMEND_FILTER.sumMin &&
    sum <= RECOMMEND_FILTER.sumMax &&
    odd !== 0 &&
    odd !== 6
  );
}
