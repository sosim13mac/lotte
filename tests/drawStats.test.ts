import { describe, expect, it } from 'vitest';
import { gameStats } from '@/lib/lotto/analysis';
import { summarizeDrawStats, sumBucketOf, type DrawStatRow } from '@/lib/lotto/drawStats';

const row = (numbers: number[]): DrawStatRow => {
  const g = gameStats(numbers);
  return { odd: g.odd, low: g.low, sum: g.sum, avg: Math.round((g.sum / 6) * 10) / 10 };
};

describe('역대 당첨번호 분포 집계', () => {
  const rows = [
    row([3, 12, 19, 28, 33, 42]), // 홀 3, 저 3, 합 137
    row([1, 2, 10, 23, 30, 45]), // 홀 3, 저 3, 합 111
    row([16, 18, 27, 36, 38, 42]), // 홀 1, 저 2, 합 177
  ];
  const s = summarizeDrawStats(rows)!;

  it('저구간은 1~22, 고구간은 23~45 로 센다', () => {
    expect(gameStats([22, 23, 1, 2, 3, 4]).low).toBe(5);
    expect(gameStats([22, 23, 1, 2, 3, 4]).high).toBe(1);
  });

  it('홀수·저구간 개수별 회차 수', () => {
    expect(s.total).toBe(3);
    expect(s.oddDist).toEqual([0, 1, 0, 2, 0, 0, 0]);
    expect(s.lowDist).toEqual([0, 0, 1, 2, 0, 0, 0]);
  });

  it('합계 평균·최소·최대와 20 단위 구간', () => {
    expect(s.sum.avg).toBe(141.7);
    expect(s.sum.min).toBe(111);
    expect(s.sum.max).toBe(177);
    expect(s.sum.buckets).toEqual([
      { from: 100, to: 119, count: 1 },
      { from: 120, to: 139, count: 1 },
      { from: 160, to: 179, count: 1 },
    ]);
    expect(sumBucketOf(s, 137)).toEqual({ from: 120, to: 139, count: 1 });
    expect(sumBucketOf(s, 200).count).toBe(0);
  });

  it('번호 평균의 평균', () => {
    expect(s.meanAvg).toBe(23.6); // (22.8 + 18.5 + 29.5) / 3
  });

  it('회차가 없으면 null', () => {
    expect(summarizeDrawStats([])).toBeNull();
  });
});
