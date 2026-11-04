import { FIXED_PRIZE } from './constants';

export type Rank = 1 | 2 | 3 | 4 | 5;

export interface DrawLike {
  numbers: number[];
  bonus: number;
  prize_amounts?: number[] | null;
}

export interface GameResult {
  matches: number;
  bonusHit: boolean;
  rank: Rank | null;
  /** 당첨금. 1~3등인데 회차 당첨금 정보가 아직 없으면 null */
  prize: number | null;
}

export function countMatches(game: readonly number[], numbers: readonly number[]): number {
  const set = new Set(numbers);
  let n = 0;
  for (const x of game) if (set.has(x)) n += 1;
  return n;
}

/** 6개 일치 1등, 5개+보너스 2등, 5개 3등, 4개 4등, 3개 5등 */
export function rankOf(game: readonly number[], draw: Pick<DrawLike, 'numbers' | 'bonus'>): Rank | null {
  const matches = countMatches(game, draw.numbers);
  if (matches === 6) return 1;
  if (matches === 5) return game.includes(draw.bonus) ? 2 : 3;
  if (matches === 4) return 4;
  if (matches === 3) return 5;
  return null;
}

export function prizeFor(rank: Rank, draw: DrawLike): number | null {
  if (rank === 4 || rank === 5) return FIXED_PRIZE[rank];
  const amount = draw.prize_amounts?.[rank - 1];
  return typeof amount === 'number' ? amount : null;
}

export function gameResult(game: readonly number[], draw: DrawLike): GameResult {
  const matches = countMatches(game, draw.numbers);
  const bonusHit = game.includes(draw.bonus);
  const rank = rankOf(game, draw);
  return { matches, bonusHit, rank, prize: rank ? prizeFor(rank, draw) : 0 };
}

export interface TicketResult {
  games: GameResult[];
  /** 알려진 당첨금 합계 */
  total: number;
  /** 1~3등 당첨이 있는데 금액 정보가 없는 경우 */
  hasUnknownPrize: boolean;
  bestRank: Rank | null;
}

export function ticketResult(games: readonly (readonly number[])[], draw: DrawLike): TicketResult {
  const results = games.map((g) => gameResult(g, draw));
  let total = 0;
  let hasUnknownPrize = false;
  let bestRank: Rank | null = null;
  for (const r of results) {
    if (r.rank && (bestRank === null || r.rank < bestRank)) bestRank = r.rank;
    if (r.prize === null) hasUnknownPrize = true;
    else total += r.prize;
  }
  return { games: results, total, hasUnknownPrize, bestRank };
}

export const RANK_LABEL: Record<Rank, string> = { 1: '1등', 2: '2등', 3: '3등', 4: '4등', 5: '5등' };
