import type { Json } from '@/types/database';

/** jsonb games → 정렬된 number[][] (방어적으로 정리) */
export function normalizeGames(raw: Json | number[][]): number[][] {
  if (!Array.isArray(raw)) return [];
  const games: number[][] = [];
  for (const g of raw as unknown[]) {
    if (!Array.isArray(g)) continue;
    games.push(
      g
        .map(Number)
        .filter((n) => Number.isInteger(n))
        .sort((a, b) => a - b),
    );
  }
  return games;
}
