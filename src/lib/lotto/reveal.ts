/**
 * 티켓로그 '당첨번호 클릭 인터랙션' 규칙 (순수 함수).
 *
 * - 당첨번호를 1~5개 선택: 선택한 번호를 '모두' 가진 게임만 해당 공이 빛남 (AND)
 *   → 1개 클릭: 그 숫자를 가진 공이 전부 빛남 / 2개 클릭: 2개 모두 가진 게임만 빛남
 * - 본번호 6개를 모두 선택: '결과 하이라이트' — 게임마다 맞은 공이 빛나고, 당첨 게임은 등수 표시
 */
import { rankOf, type DrawLike, type Rank } from './prize';

export type HighlightMode = 'none' | 'filter' | 'result';

export function highlightMode(draw: Pick<DrawLike, 'numbers'> | null, selected: ReadonlySet<number>): HighlightMode {
  if (!draw || selected.size === 0) return 'none';
  return draw.numbers.every((n) => selected.has(n)) ? 'result' : 'filter';
}

export function gameContainsAll(game: readonly number[], selected: ReadonlySet<number>): boolean {
  for (const n of selected) if (!game.includes(n)) return false;
  return true;
}

export interface BallLook {
  /** Glow + scale 1.2 + 금색 테두리 */
  glow: boolean;
  /** 선택한 번호와 같아서 가려져 있어도 보여줄 공 */
  peek: boolean;
}

export interface GameLook {
  balls: BallLook[];
  /** 조건에 맞지 않아 흐리게 */
  dim: boolean;
  /** 결과 모드에서 등수 */
  rank: Rank | null;
}

export function gameLook(
  game: readonly number[],
  draw: DrawLike | null,
  selected: ReadonlySet<number>,
): GameLook {
  const mode = highlightMode(draw, selected);
  if (mode === 'none' || !draw) {
    return { balls: game.map(() => ({ glow: false, peek: false })), dim: false, rank: null };
  }
  if (mode === 'filter') {
    const all = gameContainsAll(game, selected);
    return {
      balls: game.map((n) => ({ glow: all && selected.has(n), peek: selected.has(n) })),
      dim: !all,
      rank: null,
    };
  }
  const rank = rankOf(game, draw);
  return {
    balls: game.map((n) => {
      const main = draw.numbers.includes(n);
      const bonus = n === draw.bonus && rank === 2;
      return { glow: main || bonus, peek: main || (n === draw.bonus && selected.has(n)) };
    }),
    dim: rank === null,
    rank,
  };
}

/** 한 줄씩 오픈: 아직 다 안 열린 첫 번째 (티켓, 게임) */
export function nextSealedRow(
  ticketIds: readonly string[],
  reveal: Readonly<Record<string, readonly number[]>>,
): { ticketId: string; game: number } | null {
  for (const id of ticketIds) {
    const rows = reveal[id] ?? [];
    const g = rows.findIndex((c) => c < 6);
    if (g >= 0) return { ticketId: id, game: g };
  }
  return null;
}
