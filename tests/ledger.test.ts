import { describe, expect, it } from 'vitest';
import { budgetLevel, computeLedgerStats, monthSpent, roundHalfAway } from '@/lib/ledger';

// DB get_ledger_stats() 를 로컬 Postgres 16 에서 실행한 결과와 같은 입력/출력
const tickets = [
  { amount: 3000, win_amount: 50_055_000, purchase_date: '2026-10-22T19:30:00+09:00' },
  { amount: 2000, win_amount: 0, purchase_date: '2026-10-31T10:00:00+09:00' },
  { amount: 1000, win_amount: 0, purchase_date: '2026-11-04T18:00:00+09:00' },
];
const now = new Date('2026-11-04T17:30:00+09:00');

describe('가계부 집계 (SQL get_ledger_stats 와 동일)', () => {
  it('Postgres 결과와 일치', () => {
    expect(computeLedgerStats(tickets, now)).toEqual({
      heatmap: [
        { dow: 3, slot: 4, count: 1, amount: 1000 },
        { dow: 4, slot: 4, count: 1, amount: 3000 },
        { dow: 6, slot: 2, count: 1, amount: 2000 },
      ],
      monthly: [
        { won: 50_055_000, month: '2026-10', spent: 5000, tickets: 2 },
        { won: 0, month: '2026-11', spent: 1000, tickets: 1 },
      ],
      summary: {
        roi: 834150.0,
        profit: 50_049_000,
        total_won: 50_055_000,
        total_spent: 6000,
        ticket_count: 3,
        last_purchase: '2026-11-04T18:00:00',
        first_purchase: '2026-10-22T19:30:00',
        weekly_avg_spent: 3000,
        win_ticket_count: 1,
        purchase_cycle_days: 6.5,
      },
      this_month_spent: 1000,
    });
  });

  it('티켓이 없으면 0/null', () => {
    const s = computeLedgerStats([], now);
    expect(s.summary.total_spent).toBe(0);
    expect(s.summary.roi).toBeNull();
    expect(s.summary.weekly_avg_spent).toBeNull();
    expect(s.summary.purchase_cycle_days).toBeNull();
    expect(s.monthly).toEqual([]);
  });

  it('Postgres 와 같은 반올림 (0.5 는 0 에서 먼 쪽)', () => {
    expect(roundHalfAway(2.25, 1)).toBe(2.3);
    expect(roundHalfAway(-2.25, 1)).toBe(-2.3);
    expect(roundHalfAway(1.005, 2)).toBe(1.01);
    expect(roundHalfAway(-66.666, 1)).toBe(-66.7);
  });
});

describe('월 예산', () => {
  it('이번 달 구매액 (KST 기준)', () => {
    expect(monthSpent(tickets, now)).toBe(1000);
    // 10/31 23:30 KST 는 10월
    expect(monthSpent([{ amount: 5000, win_amount: 0, purchase_date: '2026-10-31T14:30:00Z' }], now)).toBe(0);
  });

  it('80% 이상 주의, 100% 이상 초과', () => {
    expect(budgetLevel(7_900, 10_000)).toBe('ok');
    expect(budgetLevel(8_000, 10_000)).toBe('warning');
    expect(budgetLevel(10_000, 10_000)).toBe('over');
    expect(budgetLevel(5_000, null)).toBe('none');
  });
});
