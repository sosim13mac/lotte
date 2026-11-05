import { FIXED_PRIZE } from './constants';

export type Rank = 1 | 2 | 3 | 4 | 5;

export interface DrawLike {
  numbers: number[];
  bonus: number;
  prize_amounts?: number[] | null;
}

/** 200만원 이하 비과세 */
export const TAX_FREE_LIMIT = 2_000_000;
/** 3억원 초과분은 높은 세율 */
export const HIGH_TAX_THRESHOLD = 300_000_000;

/**
 * 제세금(소득세+지방소득세). 당첨금 1건(게임) 기준.
 * - 200만원 이하: 비과세
 * - 200만원 초과: 22% (소득세 20% + 지방세 2%)
 * - 3억원 초과분: 33% (소득세 30% + 지방세 3%)
 */
export function lottoTax(prize: number): number {
  if (!(prize > TAX_FREE_LIMIT)) return 0;
  const low = Math.min(prize, HIGH_TAX_THRESHOLD);
  const high = Math.max(0, prize - HIGH_TAX_THRESHOLD);
  return Math.floor(low * 0.22 + high * 0.33);
}

/** 세금을 뗀 실수령액 */
export function netPrize(prize: number): number {
  return prize - lottoTax(prize);
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
  /** 알려진 당첨금 합계 (세전) */
  total: number;
  /** 알려진 당첨금의 실수령액 합계 (게임별 세금 차감 후) */
  net: number;
  /** 1~3등 당첨이 있는데 금액 정보가 없는 경우 */
  hasUnknownPrize: boolean;
  bestRank: Rank | null;
}

export function ticketResult(games: readonly (readonly number[])[], draw: DrawLike): TicketResult {
  const results = games.map((g) => gameResult(g, draw));
  let total = 0;
  let net = 0;
  let hasUnknownPrize = false;
  let bestRank: Rank | null = null;
  for (const r of results) {
    if (r.rank && (bestRank === null || r.rank < bestRank)) bestRank = r.rank;
    if (r.prize === null) hasUnknownPrize = true;
    else {
      total += r.prize;
      net += netPrize(r.prize);
    }
  }
  return { games: results, total, net, hasUnknownPrize, bestRank };
}

export const RANK_LABEL: Record<Rank, string> = { 1: '1등', 2: '2등', 3: '3등', 4: '4등', 5: '5등' };
