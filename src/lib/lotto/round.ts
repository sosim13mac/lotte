/**
 * 회차 ↔ 날짜 계산 (모두 KST, 서머타임 없음).
 * 1회 추첨: 2002-12-07(토). 매주 토요일 20:35 KST 추첨, 판매 마감은 토요일 20:00.
 */
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const WEEK = 7 * DAY;
const KST_OFFSET = 9 * 60 * MINUTE;

/** 1회 추첨 시각 (2002-12-07 20:35 KST = 11:35 UTC) */
const ROUND1_DRAW = Date.UTC(2002, 11, 7, 11, 35);
/** 1회 판매 마감 (추첨 35분 전, 토 20:00 KST) */
const ROUND1_SALES_CLOSE = ROUND1_DRAW - 35 * MINUTE;

const ts = (d: Date | number | string) => (d instanceof Date ? d.getTime() : new Date(d).getTime());

/** 회차의 추첨 시각 */
export function drawTime(round: number): Date {
  return new Date(ROUND1_DRAW + (round - 1) * WEEK);
}

/** 회차의 추첨일 'YYYY-MM-DD' (KST) */
export function drawDate(round: number): string {
  return new Date(drawTime(round).getTime() + KST_OFFSET).toISOString().slice(0, 10);
}

/** now 시점까지 추첨이 끝난 가장 최근 회차 */
export function latestDrawnRound(now: Date | number = Date.now()): number {
  return Math.max(0, Math.floor((ts(now) - ROUND1_DRAW) / WEEK) + 1);
}

/** 해당 시각에 산 복권의 회차 (토 20:00 마감 이후 구매분은 다음 회차) */
export function roundForPurchase(at: Date | number | string = Date.now()): number {
  return Math.max(1, Math.ceil((ts(at) - ROUND1_SALES_CLOSE) / WEEK) + 1);
}

/** 다음 추첨까지 남은 ms */
export function msUntilNextDraw(now: Date | number = Date.now()): number {
  return drawTime(latestDrawnRound(now) + 1).getTime() - ts(now);
}

/** 로또 판매 시간인지 (토 20:00 ~ 일 06:00 판매 중지, 그 외 매일 06:00~24:00) */
export function isLottoOnSale(now: Date | number = Date.now()): boolean {
  const kst = new Date(ts(now) + KST_OFFSET);
  const day = kst.getUTCDay(); // 0=일 ... 6=토
  const minutes = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  if (minutes < 6 * 60) return false; // 매일 00:00~06:00 판매 없음
  if (day === 6 && minutes >= 20 * 60) return false; // 토 20:00 마감
  return true;
}
