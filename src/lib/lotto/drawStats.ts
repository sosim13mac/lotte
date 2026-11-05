/**
 * 역대 당첨번호 분석 데이터 요약 (홀짝 · 저고 · 합계 · 평균).
 * DB 에는 winning_draws 의 odd_count / low_count / sum_numbers / avg_number 로 회차마다 기록되고,
 * 이 순수 함수가 그 값을 분포로 집계합니다 (서버 · 데모 모드 · 테스트 공용).
 */
import type { DrawStatsSummary } from '@/lib/repo/types';

/** 회차 하나의 기록값 */
export interface DrawStatRow {
  odd: number;
  low: number;
  sum: number;
  avg: number;
}

export const SUM_BUCKET = 20;

export function summarizeDrawStats(rows: readonly DrawStatRow[]): DrawStatsSummary | null {
  if (!rows.length) return null;
  const oddDist = new Array<number>(7).fill(0);
  const lowDist = new Array<number>(7).fill(0);
  const buckets = new Map<number, number>();
  let sumTotal = 0;
  let avgTotal = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const r of rows) {
    oddDist[r.odd] += 1;
    lowDist[r.low] += 1;
    const from = Math.floor(r.sum / SUM_BUCKET) * SUM_BUCKET;
    buckets.set(from, (buckets.get(from) ?? 0) + 1);
    sumTotal += r.sum;
    avgTotal += r.avg;
    min = Math.min(min, r.sum);
    max = Math.max(max, r.sum);
  }
  return {
    total: rows.length,
    oddDist,
    lowDist,
    sum: {
      avg: Math.round((sumTotal / rows.length) * 10) / 10,
      min,
      max,
      buckets: [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([from, count]) => ({ from, to: from + SUM_BUCKET - 1, count })),
    },
    meanAvg: Math.round((avgTotal / rows.length) * 10) / 10,
  };
}

/** 합계가 속한 구간에서 역대 몇 회가 나왔는지 */
export function sumBucketOf(s: DrawStatsSummary, sum: number): { from: number; to: number; count: number } {
  const from = Math.floor(sum / SUM_BUCKET) * SUM_BUCKET;
  return s.sum.buckets.find((b) => b.from === from) ?? { from, to: from + SUM_BUCKET - 1, count: 0 };
}
