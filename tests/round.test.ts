import { describe, expect, it } from 'vitest';
import { drawDate, isLottoOnSale, latestDrawnRound, roundForPurchase } from '@/lib/lotto/round';

/** KST 시각 → Date */
const kst = (s: string) => new Date(`${s}+09:00`);

describe('회차 계산', () => {
  it('추첨일', () => {
    expect(drawDate(1)).toBe('2002-12-07');
    expect(drawDate(1100)).toBe('2023-12-30');
    expect(drawDate(1248)).toBe('2026-10-31');
  });

  it('가장 최근 추첨 회차 (토 20:35 기준)', () => {
    expect(latestDrawnRound(kst('2026-11-04T12:00:00'))).toBe(1248);
    expect(latestDrawnRound(kst('2026-10-31T20:34:59'))).toBe(1247);
    expect(latestDrawnRound(kst('2026-10-31T20:35:00'))).toBe(1248);
    expect(latestDrawnRound(kst('2002-12-01T00:00:00'))).toBe(0);
  });

  it('구매 시각 → 회차 (토 20:00 판매 마감)', () => {
    expect(roundForPurchase(kst('2026-10-31T19:59:00'))).toBe(1248);
    expect(roundForPurchase(kst('2026-10-31T20:00:00'))).toBe(1248);
    expect(roundForPurchase(kst('2026-10-31T20:00:01'))).toBe(1249);
    expect(roundForPurchase(kst('2026-11-01T10:00:00'))).toBe(1249);
    expect(roundForPurchase(kst('2026-11-04T18:00:00'))).toBe(1249);
  });

  it('판매 시간', () => {
    expect(isLottoOnSale(kst('2026-10-31T19:59:00'))).toBe(true);
    expect(isLottoOnSale(kst('2026-10-31T20:30:00'))).toBe(false);
    expect(isLottoOnSale(kst('2026-11-01T05:59:00'))).toBe(false);
    expect(isLottoOnSale(kst('2026-11-01T06:00:00'))).toBe(true);
    expect(isLottoOnSale(kst('2026-11-04T23:59:00'))).toBe(true);
  });
});
