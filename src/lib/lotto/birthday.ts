/**
 * 생일수 = (년 + 월 + 일) % 45 + 1
 * 예) 1992-08-15 → (1992 + 8 + 15) % 45 + 1 = 36
 */
export function birthdayNumber(birthDate: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return ((y + mo + d) % 45) + 1;
}
