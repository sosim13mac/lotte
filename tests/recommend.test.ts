import { describe, expect, it } from 'vitest';
import { gameStats, passesRecommendFilters, passesRecommendFiltersFast } from '@/lib/lotto/analysis';
import { birthdayNumber } from '@/lib/lotto/birthday';
import { matchDream } from '@/lib/lotto/dream';
import { computeNumberStats, recommend } from '@/lib/lotto/recommend';
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
  // 최근 20회 가상 당첨번호 (최신이 먼저)
  const rngDraws = seededRng(99);
  const recentDraws = Array.from({ length: 20 }, () => pickNumbers(rngDraws));
  const withStats = { ...input, recentDraws };
  const result = recommend(withStats, { samples: 200_000, rng: seededRng(7) });
  const bday = birthdayNumber('1992-08-15')!;
  const dreamNums = [12, 26];

  it('5게임, 각 6개 번호, 이유 태그 3개, 번호별 근거', () => {
    expect(result.games).toHaveLength(5);
    for (const g of result.games) {
      expect(g.numbers).toHaveLength(6);
      expect(new Set(g.numbers).size).toBe(6);
      expect(g.tags).toHaveLength(3);
      expect(g.notes.map((n) => n.n)).toEqual(g.numbers);
      for (const n of g.notes) expect(n.note.length).toBeGreaterThan(0);
    }
  });

  it('모든 게임이 균형 필터를 통과', () => {
    for (const g of result.games) expect(passesRecommendFilters(gameStats(g.numbers))).toBe(true);
  });

  it('생일수는 전체 게임이 아니라 1~2게임에만 들어간다', () => {
    for (let seed = 1; seed <= 12; seed += 1) {
      const r = recommend(withStats, { samples: 120_000, rng: seededRng(seed) });
      const withBday = r.games.filter((g) => g.numbers.includes(bday)).length;
      expect(withBday).toBeGreaterThanOrEqual(1);
      expect(withBday).toBeLessThanOrEqual(2);
      expect(withBday).toBe(r.roleCounts.birthday);
    }
  });

  it('꿈 행운수도 1~2게임에만, 역할과 실제 번호가 일치한다', () => {
    expect(result.dream?.keyword).toBe('돼지');
    const withDream = result.games.filter((g) => g.numbers.some((n) => dreamNums.includes(n)));
    expect(withDream.length).toBe(result.roleCounts.dream);
    expect(withDream.length).toBeGreaterThanOrEqual(1);
    expect(withDream.length).toBeLessThanOrEqual(2);
    for (const g of result.games) {
      if (g.role === 'birthday') expect(g.numbers).toContain(bday);
      if (g.role === 'dream') expect(g.numbers.some((n) => dreamNums.includes(n))).toBe(true);
      if (g.role === 'stats' || g.role === 'balance') {
        expect(g.numbers).not.toContain(bday);
        expect(g.numbers.some((n) => dreamNums.includes(n))).toBe(false);
      }
    }
    expect(result.roleCounts.stats).toBeGreaterThanOrEqual(1);
  });

  it('통계 게임은 자주 나온 번호와 오래 안 나온 번호를 모두 포함한다', () => {
    const a = result.analysis!;
    expect(a.window).toBe(20);
    expect(a.hot).toHaveLength(8);
    expect(a.cold).toHaveLength(8);
    for (const g of result.games.filter((x) => x.role === 'stats')) {
      expect(g.numbers.some((n) => a.hot.includes(n))).toBe(true);
      expect(g.numbers.some((n) => a.cold.includes(n))).toBe(true);
    }
  });

  it('태그와 번호별 근거는 실제 데이터와 일치한다', () => {
    const a = computeNumberStats(recentDraws)!;
    for (const g of result.games) {
      if (g.role === 'birthday') expect(g.tags[0]).toBe(`생년월일 수 ${bday} 포함`);
      if (g.role === 'dream') expect(g.tags[0]).toMatch(/^돼지꿈 행운수 (12|26|12·26)$/);
      for (const { n, note } of g.notes) {
        if (n === bday) expect(note).toBe('생년월일 수');
        const m = note.match(/^최근 20회 중 (\d+)회 출현/);
        if (m) expect(Number(m[1])).toBe(a.freq[n]);
      }
    }
  });

  it('게임끼리 3개 넘게 겹치지 않는다', () => {
    const gs = result.games.map((g) => g.numbers);
    for (let i = 0; i < gs.length; i += 1)
      for (let j = i + 1; j < gs.length; j += 1) expect(gs[i].filter((n) => gs[j].includes(n)).length).toBeLessThanOrEqual(3);
  });

  it('통계: 생성 수 ≥ 필터 통과 ≥ 통계 조건 부합', () => {
    expect(result.sampled).toBe(200_000);
    expect(result.passedFilters).toBeGreaterThan(result.candidates);
    expect(result.candidates).toBeGreaterThan(100);
  });

  it('당첨번호 데이터가 5회 미만이면 통계 분석을 생략하고 균형 조합으로 구성', () => {
    const r = recommend({ ...input, recentDraws: recentDraws.slice(0, 3) }, { samples: 60_000, rng: seededRng(5) });
    expect(r.analysis).toBeNull();
    expect(r.games).toHaveLength(5);
    expect(r.games.every((g) => g.role !== 'stats')).toBe(true);
    expect(r.candidates).toBe(r.passedFilters);
  });

  it('생년월일·꿈이 없어도 동작 (통계·균형 기반)', () => {
    const r = recommend({ birthDate: null, dreamMap: [], recentDraws }, { samples: 40_000, rng: seededRng(1) });
    expect(r.games).toHaveLength(5);
    expect(r.roleCounts.birthday + r.roleCounts.dream).toBe(0);
    expect(r.games[0].tags.some((t) => /^합계/.test(t))).toBe(true);
  });

  it('통계 계산: 출현 횟수와 미출현 기간', () => {
    const draws = [
      [1, 2, 3, 4, 5, 6],
      [1, 2, 3, 4, 5, 7],
      [1, 2, 3, 4, 5, 8],
      [1, 2, 3, 4, 5, 9],
      [1, 2, 3, 4, 5, 10],
    ];
    const st = computeNumberStats(draws)!;
    expect(st.freq[1]).toBe(5);
    expect(st.freq[10]).toBe(1);
    expect(st.absence[6]).toBe(0); // 직전 회차에 나옴
    expect(st.absence[10]).toBe(4); // 4회 전
    expect(st.absence[45]).toBe(5); // 창 안에 없음 → window
    expect(computeNumberStats(draws.slice(0, 4))).toBeNull();
  });

  it('100만 개 생성이 충분히 빠르다', () => {
    const t = performance.now();
    recommend(withStats, { rng: seededRng(3) });
    expect(performance.now() - t).toBeLessThan(3000);
  });
});
