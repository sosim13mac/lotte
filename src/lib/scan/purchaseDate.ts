import { drawTime, roundForPurchase } from '@/lib/lotto/round';

/**
 * 스캔한 티켓의 구매 시각.
 * 1) OCR 텍스트에 '2026/10/31 (토) 15:20:37' 같은 발행일시가 있고 회차와 맞으면 그 값
 * 2) 이번 판매 회차 티켓이면 지금
 * 3) 지난 회차 티켓이면 그 회차 추첨일 정오(KST)로 추정 (가계부의 회차·월 집계가 어긋나지 않도록)
 */
export function estimatePurchaseDate(round: number, ocrText: string, now: Date = new Date()): { iso: string; estimated: boolean } {
  const m = /(20\d{2})[/.-](\d{1,2})[/.-](\d{1,2})\D{0,8}?(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(ocrText);
  if (m) {
    const [, y, mo, d, h, mi, s] = m;
    const pad = (v: string) => v.padStart(2, '0');
    const parsed = new Date(`${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${mi}:${s ?? '00'}+09:00`);
    if (!Number.isNaN(parsed.getTime()) && parsed <= now && roundForPurchase(parsed) === round) {
      return { iso: parsed.toISOString(), estimated: false };
    }
  }
  if (round >= roundForPurchase(now)) return { iso: now.toISOString(), estimated: false };
  const noonOfDrawDay = new Date(drawTime(round).getTime() - (8 * 60 + 35) * 60_000);
  return { iso: noonOfDrawDay.toISOString(), estimated: true };
}
