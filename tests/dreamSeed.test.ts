import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DREAM_SEED } from '@/lib/lotto/dreamSeed';

const sql = readFileSync('supabase/migrations/20261104000100_init_schema.sql', 'utf8');

describe('dream_map 시드', () => {
  it('키워드가 겹치지 않고 번호는 1~45 서로 다른 2개', () => {
    const keys = DREAM_SEED.map(([k]) => k);
    expect(new Set(keys).size).toBe(keys.length);
    for (const [, a, b] of DREAM_SEED) {
      expect(a).not.toBe(b);
      for (const n of [a, b]) expect(n >= 1 && n <= 45).toBe(true);
    }
  });

  it('마이그레이션 INSERT 와 TS 원본이 같다', () => {
    const rows = [...sql.matchAll(/\('([^']+)', array\[(\d+), (\d+)\]\)/g)].map(
      (m) => [m[1], Number(m[2]), Number(m[3])] as const,
    );
    expect(rows).toEqual(DREAM_SEED.map((r) => [...r]));
  });
});
