import { describe, expect, it } from 'vitest';
import { gameStats, passesRecommendFilters, passesRecommendFiltersFast } from '@/lib/lotto/analysis';
import { birthdayNumber } from '@/lib/lotto/birthday';
import { matchDream } from '@/lib/lotto/dream';
import { recommend } from '@/lib/lotto/recommend';
import { DEMO_DREAMS } from '@/lib/repo/demoData';
import { pickNumbers, seededRng } from '@/lib/random';

const input = { birthDate: '1992-08-15', dreamText: '황금 돼지꿈 꿨어요', dreamMap: DEMO_DREAMS };

describe('필터', () => {
  it.each([
    [[1, 2, 3, 20, 30, 40], false], // 연속 3개
    [[1, 2, 10, 20, 30, 40], true], // 연속 2개는 허용 (합계 103)
    [[11, 13, 15, 17, 30, 40], false], // 11~20 구간 4개 + 홀수 많음
    [[1, 3, 5, 7, 9, 44], false], // 홀짝 6:0 + 1~10 구간 5개
    [[1, 4, 8, 12, 15, 22], false], // 합계 62
    [[30, 35, 38, 41, 43, 45], false], // 합계 232
    [[3, 12, 19, 28, 33, 42], true],
  ])('%j → %s', (game, ok) => {
    expect(passesRecommendFilters(gameStats(game))).toBe(ok);
  });

  it('빠른 필터 = 기본 필터 (무작위 2만 개 비교)', () => {
    const rng = seededRng(42);
    const zones = new Uint8Array(5);
    for (let i = 0; i < 20_000; i += 1) {
      const g = pickNumbers(rng);
      expect(passesRecommendFiltersFast(g, zones)).toBe(passesRecommendFilters(gameStats(g)));
    }
  });
});

describe('꿈 키워드', () => {
  it('가장 긴 키워드 우선', () => {
    expect(matchDream('물고기 잡는 꿈', DEMO_DREAMS)?.keyword).toBe('물고기');
    expect(matchDream('황금 돼지꿈', DEMO_DREAMS)?.numbers).toEqual([12, 26]);
    expect(matchDream('아무 꿈도 안 꿨음', DEMO_DREAMS)).toBeNull();
  });
});

describe('개인화 추천', () => {
  const result = recommend(input, { samples: 200_000, rng: seededRng(7) });
  const bday = birthdayNumber('1992-08-15')!;

  it('5게임, 각 6개 번호, 이유 태그 3개', () => {
    expect(result.games).toHaveLength(5);
    for (const g of result.games) {
      expect(g.numbers).toHaveLength(6);
      expect(new Set(g.numbers).size).toBe(6);
      expect(g.tags).toHaveLength(3);
    }
  });

  it('모든 게임이 필터를 통과', () => {
    for (const g of result.games) expect(passesRecommendFilters(gameStats(g.numbers))).toBe(true);
  });

  it('생일수와 꿈 행운수가 강제 포함되고 태그로 설명된다', () => {
    expect(result.birthdayNumber).toBe(bday);
    expect(result.dream?.keyword).toBe('돼지');
    for (const g of result.games) {
      expect(g.numbers).toContain(bday);
      expect(g.numbers.some((n) => [12, 26].includes(n))).toBe(true);
      expect(g.tags[0]).toBe(`생일수 ${bday} 포함`);
      expect(g.tags[1]).toMatch(/^돼지꿈 행운수 (12|26|12·26)$/);
      expect(g.tags[2]).toMatch(/^합계 \d+ 균형$/);
    }
  });

  it('게임끼리 3개 넘게 겹치지 않는다', () => {
    const gs = result.games.map((g) => g.numbers);
    for (let i = 0; i < gs.length; i += 1)
      for (let j = i + 1; j < gs.length; j += 1) expect(gs[i].filter((n) => gs[j].includes(n)).length).toBeLessThanOrEqual(3);
  });

  it('통계: 생성 수 ≥ 필터 통과 ≥ 후보', () => {
    expect(result.sampled).toBe(200_000);
    expect(result.passedFilters).toBeGreaterThan(result.candidates);
    expect(result.candidates).toBeGreaterThan(100);
  });

  it('생년월일·꿈이 없어도 동작 (태그는 통계 기반)', () => {
    const r = recommend({ birthDate: null, dreamMap: [] }, { samples: 20_000, rng: seededRng(1) });
    expect(r.games).toHaveLength(5);
    expect(r.games[0].tags[0]).toMatch(/^합계/);
  });

  it('100만 개 생성이 충분히 빠르다', () => {
    const t = performance.now();
    recommend(input, { rng: seededRng(3) });
    expect(performance.now() - t).toBeLessThan(3000);
  });
});
