import { describe, expect, it } from 'vitest';
import { evaluateQuality } from '@/lib/lotto/quality';

const recent = [
  [3, 12, 19, 28, 33, 42],
  [5, 11, 17, 24, 36, 41],
];

describe('품질 점수', () => {
  it('1,2,3,4,5,6 은 인기 패턴 → 희소성 0', () => {
    const r = evaluateQuality([1, 2, 3, 4, 5, 6], recent);
    expect(r.breakdown.rarity).toBe(0);
    // 밸런스 50 (홀짝 3:3 만점 + 합계 21 → 0) x 0.4 + 희소성 0 + 중복회피 100 x 0.2 = 40
    expect(r.score).toBe(40);
    expect(r.label).toBe('흔한 패턴과 닮음');
  });

  it('홀짝 3:3 + 합계 140~170 → 밸런스 100', () => {
    const r = evaluateQuality([7, 14, 22, 29, 33, 40], recent); // 홀 7,29,33 / 짝 14,22,40, 합 145
    expect(r.stats.sum).toBe(145);
    expect(r.breakdown.balance).toBe(100);
    expect(r.breakdown.rarity).toBe(100);
  });

  it('1~31 에만 있으면 희소성 감점', () => {
    const r = evaluateQuality([2, 9, 14, 21, 26, 31], recent);
    expect(r.breakdown.rarity).toBe(65);
  });

  it('최근 1등 번호와 3개 이상 겹치면 중복회피 감점', () => {
    expect(evaluateQuality([3, 12, 19, 30, 37, 44], recent).breakdown.dupAvoid).toBe(60);
    expect(evaluateQuality([3, 12, 19, 28, 37, 44], recent).breakdown.dupAvoid).toBe(30);
    expect(evaluateQuality([1, 8, 15, 30, 37, 44], recent).breakdown.dupAvoid).toBe(100);
  });

  it('가중 평균 40/40/20', () => {
    const r = evaluateQuality([2, 9, 14, 21, 26, 31], recent);
    const { balance, rarity, dupAvoid } = r.breakdown;
    expect(r.score).toBe(Math.round(balance * 0.4 + rarity * 0.4 + dupAvoid * 0.2));
  });

  it('용지 세로 한 줄(7칸 격자) 감점', () => {
    const r = evaluateQuality([1, 8, 15, 22, 29, 36], []);
    expect(r.notes.some((n) => n.text.includes('등차수열') || n.text.includes('세로'))).toBe(true);
    expect(r.breakdown.rarity).toBeLessThan(70);
  });

  it('코멘트에 확률 표현이 없다 (점수 85 이상일 때 1/8,145,060 안내만)', () => {
    for (const g of [
      [1, 2, 3, 4, 5, 6],
      [7, 14, 22, 29, 33, 40],
      [2, 9, 14, 21, 26, 31],
    ]) {
      const r = evaluateQuality(g, recent);
      expect(r.comment).not.toMatch(/\d+\s*%/);
      expect(r.comment).not.toMatch(/당첨\s*확률/);
      if (r.score >= 85) expect(r.comment).toContain('1/8,145,060');
    }
  });
});
