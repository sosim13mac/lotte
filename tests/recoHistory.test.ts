import { describe, expect, it } from 'vitest';
import { addEntry, HISTORY_MAX, parseHistory, type HistoryEntry } from '@/lib/lotto/recoHistory';

const entry = (id: string): HistoryEntry => ({ id, at: '2026-01-01T00:00:00Z', games: [{ numbers: [1, 2, 3, 4, 5, 6], label: '균형 조합' }] });

describe('recoHistory', () => {
  it('새 기록을 맨 앞에 넣고 최대 개수를 넘으면 오래된 것을 버린다', () => {
    let list: HistoryEntry[] = [];
    for (let i = 0; i < HISTORY_MAX + 5; i++) list = addEntry(list, entry(`e${i}`));
    expect(list).toHaveLength(HISTORY_MAX);
    expect(list[0].id).toBe(`e${HISTORY_MAX + 4}`);
  });
  it('깨진 저장값은 빈 목록으로 처리한다', () => {
    expect(parseHistory(null)).toEqual([]);
    expect(parseHistory('{oops')).toEqual([]);
    expect(parseHistory('{"a":1}')).toEqual([]);
  });
  it('형식이 맞지 않는 항목(범위 밖 번호 등)은 걸러낸다', () => {
    const bad = { ...entry('x'), games: [{ numbers: [1, 2, 3, 4, 5, 99], label: 'a' }] };
    expect(parseHistory(JSON.stringify([entry('ok'), bad])).map((e) => e.id)).toEqual(['ok']);
  });
});
