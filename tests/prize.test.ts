import { describe, expect, it } from 'vitest';
import { birthdayNumber } from '@/lib/lotto/birthday';
import { rankOf, ticketResult } from '@/lib/lotto/prize';

const draw = {
  numbers: [3, 12, 19, 28, 33, 42],
  bonus: 7,
  prize_amounts: [2_000_000_000, 50_000_000, 1_500_000, 50_000, 5_000],
};

describe('당첨 등수', () => {
  it.each([
    [[3, 12, 19, 28, 33, 42], 1],
    [[3, 7, 12, 19, 28, 33], 2],
    [[3, 8, 12, 19, 28, 33], 3],
    [[3, 8, 9, 12, 19, 28], 4],
    [[1, 2, 3, 12, 19, 44], 5],
    [[1, 2, 3, 7, 12, 44], null],
  ])('%j → %s', (game, rank) => {
    expect(rankOf(game, draw)).toBe(rank);
  });

  it('티켓 합계', () => {
    const r = ticketResult(
      [
        [1, 2, 3, 12, 19, 44], // 5등
        [3, 8, 9, 12, 19, 28], // 4등
        [1, 2, 4, 5, 6, 8], // 낙첨
      ],
      draw,
    );
    expect(r.total).toBe(55_000);
    expect(r.bestRank).toBe(4);
    expect(r.hasUnknownPrize).toBe(false);
  });

  it('1~3등 금액 정보가 없으면 unknown 표시', () => {
    const r = ticketResult([[3, 8, 12, 19, 28, 33]], { ...draw, prize_amounts: null });
    expect(r.bestRank).toBe(3);
    expect(r.hasUnknownPrize).toBe(true);
    expect(r.total).toBe(0);
  });
});

describe('생일수', () => {
  it('(년+월+일) % 45 + 1', () => {
    expect(birthdayNumber('1992-08-15')).toBe(36);
    expect(birthdayNumber('2000-01-01')).toBe(((2000 + 1 + 1) % 45) + 1);
  });
  it('잘못된 형식', () => {
    expect(birthdayNumber('')).toBeNull();
    expect(birthdayNumber('1992-13-01')).toBeNull();
  });
});
