// 회차 계산 (앱의 src/lib/lotto/round.ts 와 같은 규칙). 1회 추첨 2002-12-07 20:35 KST, 매주 토요일.
const ROUND1_DRAW = Date.UTC(2002, 11, 7, 11, 35);
const WEEK = 7 * 24 * 60 * 60 * 1000;

export function latestDrawnRound(now: number = Date.now()): number {
  return Math.max(0, Math.floor((now - ROUND1_DRAW) / WEEK) + 1);
}

export function drawDateOf(round: number): string {
  return new Date(ROUND1_DRAW + (round - 1) * WEEK + 9 * 3_600_000).toISOString().slice(0, 10);
}
