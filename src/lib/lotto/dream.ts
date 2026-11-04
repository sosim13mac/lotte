import type { DreamEntry } from '@/lib/repo/types';

/**
 * 자유 입력("황금 돼지꿈 꿨어요")에서 꿈 키워드 찾기.
 * 입력에 포함된 키워드 중 가장 긴 것을 고릅니다 ('물고기' 가 '물' 보다 우선).
 */
export function matchDream(input: string | null | undefined, entries: readonly DreamEntry[]): DreamEntry | null {
  const text = (input ?? '').replace(/\s+/g, '');
  if (!text) return null;
  let best: DreamEntry | null = null;
  for (const e of entries) {
    if (text.includes(e.keyword) && (!best || e.keyword.length > best.keyword.length)) best = e;
  }
  return best;
}
