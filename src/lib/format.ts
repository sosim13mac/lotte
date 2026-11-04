const KST_OFFSET = 9 * 60 * 60_000;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function formatWon(n: number): string {
  return `${Math.round(n).toLocaleString('ko-KR')}원`;
}

export function formatSignedWon(n: number): string {
  if (n === 0) return '0원';
  return `${n > 0 ? '+' : '-'}${Math.abs(Math.round(n)).toLocaleString('ko-KR')}원`;
}

/** 큰 금액 축약: 12,340,000 → 1,234만원 */
export function formatWonShort(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}억원`;
  if (abs >= 10_000) return `${sign}${Math.round(abs / 10_000).toLocaleString('ko-KR')}만원`;
  return `${sign}${abs.toLocaleString('ko-KR')}원`;
}

/** KST 기준 Date 의 각 필드 */
export function kstParts(input: Date | string | number) {
  const d = new Date(new Date(input).getTime() + KST_OFFSET);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    weekday: d.getUTCDay(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 2026.10.31(토) */
export function formatDateKST(input: Date | string | number): string {
  const p = kstParts(input);
  return `${p.year}.${pad(p.month)}.${pad(p.day)}(${WEEKDAYS[p.weekday]})`;
}

/** 10.31(토) 18:21 */
export function formatDateTimeKST(input: Date | string | number): string {
  const p = kstParts(input);
  return `${pad(p.month)}.${pad(p.day)}(${WEEKDAYS[p.weekday]}) ${pad(p.hour)}:${pad(p.minute)}`;
}

/** 'YYYY-MM-DD' (KST) */
export function toKSTDateString(input: Date | string | number): string {
  const p = kstParts(input);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function weekdayKo(index: number): string {
  return WEEKDAYS[index] ?? '';
}

/** 'YYYY-MM-DD' 생년월일로 만 나이 */
export function ageFrom(birthDate: string, now: Date = new Date()): number {
  const [y, m, d] = birthDate.split('-').map(Number);
  const t = kstParts(now);
  let age = t.year - y;
  if (t.month < m || (t.month === m && t.day < d)) age -= 1;
  return age;
}
