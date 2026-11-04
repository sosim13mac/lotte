export const LOTTO_MAX = 45;
export const LOTTO_PICK = 6;
export const GAME_PRICE = 1_000;
export const MAX_GAMES_PER_TICKET = 5;
export const GAME_LABELS = ['A', 'B', 'C', 'D', 'E'] as const;

/** 6/45 전체 조합 수. 어떤 조합이든 1등 확률은 1/8,145,060 으로 같습니다. */
export const TOTAL_COMBINATIONS = 8_145_060;

/** 법적 고지 문구 — 화면에서 문구를 바꾸지 말고 이 상수를 쓰세요. */
export const DISCLAIMER = '본 앱은 통계 참고 도구이며 당첨을 보장하지 않습니다';
export const ODDS_NOTICE = '모든 번호 조합의 1등 확률은 1/8,145,060으로 동일합니다';

/** 4등·5등은 고정 당첨금 (1~3등은 회차별 변동) */
export const FIXED_PRIZE: Readonly<Record<4 | 5, number>> = { 4: 50_000, 5: 5_000 };

/** 만 19세 미만은 복권을 구매할 수 없습니다 (복권 및 복권기금법). */
export const MIN_AGE = 19;

export type BallTone = 'y' | 'b' | 'r' | 'g' | 'n';

/** 동행복권 공 색상 구간: 1~10 노랑, 11~20 파랑, 21~30 빨강, 31~40 회색, 41~45 초록 */
export function ballTone(n: number): BallTone {
  if (n <= 10) return 'y';
  if (n <= 20) return 'b';
  if (n <= 30) return 'r';
  if (n <= 40) return 'g';
  return 'n';
}
