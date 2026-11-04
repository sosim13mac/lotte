import { describe, expect, it } from 'vitest';
import { gameLook, highlightMode, nextSealedRow } from '@/lib/lotto/reveal';

const draw = { numbers: [3, 12, 19, 28, 33, 42], bonus: 7, prize_amounts: null };
const A = [3, 12, 19, 30, 40, 44]; // 3개 일치 (5등)
const B = [3, 7, 12, 19, 28, 33]; // 5개 + 보너스 (2등)
const C = [1, 2, 4, 5, 6, 8]; // 0개

const S = (...n: number[]) => new Set(n);

describe('당첨번호 클릭 하이라이트', () => {
  it('선택 없음 → 아무것도 안 빛남', () => {
    expect(highlightMode(draw, S())).toBe('none');
    expect(gameLook(A, draw, S()).balls.some((b) => b.glow)).toBe(false);
  });

  it('1개 클릭 → 그 숫자를 가진 공이 전부 빛남', () => {
    const sel = S(3);
    expect(gameLook(A, draw, sel).balls.map((b) => b.glow)).toEqual([true, false, false, false, false, false]);
    expect(gameLook(B, draw, sel).balls[0].glow).toBe(true);
    expect(gameLook(C, draw, sel).dim).toBe(true);
  });

  it('2개 클릭 → 2개 모두 가진 게임만 빛남', () => {
    const sel = S(3, 28);
    expect(gameLook(A, draw, sel).dim).toBe(true); // 28 없음
    expect(gameLook(A, draw, sel).balls.some((b) => b.glow)).toBe(false);
    const b = gameLook(B, draw, sel);
    expect(b.dim).toBe(false);
    expect(b.balls.filter((x) => x.glow)).toHaveLength(2);
  });

  it('가려진 공도 선택한 숫자면 살짝 보여줌 (peek)', () => {
    expect(gameLook(A, draw, S(3, 28)).balls[0].peek).toBe(true);
  });

  it('6개 모두 클릭 → 결과 하이라이트 (등수 + 맞은 공 전부)', () => {
    const sel = S(...draw.numbers);
    expect(highlightMode(draw, sel)).toBe('result');
    const a = gameLook(A, draw, sel);
    expect(a.rank).toBe(5);
    expect(a.balls.filter((x) => x.glow)).toHaveLength(3);
    const b = gameLook(B, draw, sel);
    expect(b.rank).toBe(2);
    expect(b.balls.filter((x) => x.glow)).toHaveLength(6); // 5개 + 보너스
    expect(gameLook(C, draw, sel).dim).toBe(true);
  });
});

describe('한 줄씩 오픈 순서', () => {
  it('티켓 순서대로, 덜 열린 첫 줄', () => {
    expect(nextSealedRow(['t1', 't2'], { t1: [6, 6], t2: [6, 3, 0] })).toEqual({ ticketId: 't2', game: 1 });
    expect(nextSealedRow(['t1'], { t1: [6, 6] })).toBeNull();
  });
});
