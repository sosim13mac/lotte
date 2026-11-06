/**
 * 번호 추천 히스토리: 뽑은 번호를 이 기기(localStorage)에 저장해 다시 뽑아도 지난 번호를 볼 수 있게 합니다.
 * 로그인 여부와 무관하게 동작하며 서버로 보내지 않습니다.
 */
export const HISTORY_KEY = 'lottedang:reco-history:v1';
export const HISTORY_MAX = 30;

export interface HistoryGame {
  numbers: number[];
  /** 추천 근거 라벨 (예: 생년월일 기반) */
  label: string;
}

export interface HistoryEntry {
  id: string;
  /** ISO 시각 */
  at: string;
  games: HistoryGame[];
}

const isGame = (g: unknown): g is HistoryGame =>
  typeof g === 'object' &&
  g !== null &&
  Array.isArray((g as HistoryGame).numbers) &&
  (g as HistoryGame).numbers.length === 6 &&
  (g as HistoryGame).numbers.every((n) => Number.isInteger(n) && n >= 1 && n <= 45) &&
  typeof (g as HistoryGame).label === 'string';

/** 저장 형식이 깨졌거나 변조된 항목은 걸러냅니다 */
export function parseHistory(raw: string | null): HistoryEntry[] {
  if (!raw) return [];
  try {
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (e): e is HistoryEntry =>
          typeof e === 'object' &&
          e !== null &&
          typeof (e as HistoryEntry).id === 'string' &&
          typeof (e as HistoryEntry).at === 'string' &&
          Array.isArray((e as HistoryEntry).games) &&
          (e as HistoryEntry).games.length > 0 &&
          (e as HistoryEntry).games.every(isGame),
      )
      .slice(0, HISTORY_MAX);
  } catch {
    return [];
  }
}

/** 새 기록을 맨 앞에 추가 (최대 HISTORY_MAX 개, 오래된 것부터 버림) */
export function addEntry(list: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  return [entry, ...list.filter((e) => e.id !== entry.id)].slice(0, HISTORY_MAX);
}

export function loadHistory(): HistoryEntry[] {
  try {
    return parseHistory(window.localStorage.getItem(HISTORY_KEY));
  } catch {
    return [];
  }
}

export function saveHistory(list: HistoryEntry[]) {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    // 저장소 접근 불가(프라이빗 모드 등) → 이번 화면에서만 유지
  }
}
