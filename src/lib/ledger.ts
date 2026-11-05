/**
 * 가계부 집계 — DB 의 get_ledger_stats() 와 같은 모양·같은 반올림 규칙.
 * Neon 모드에서는 get_ledger_stats() 결과를 쓰고, 데모 모드와 테스트에서는 이 함수를 씁니다.
 */
import type { Ticket } from '@/lib/repo/types';

export interface LedgerSummary {
  total_spent: number;
  total_won: number;
  profit: number;
  /** (당첨액 - 구매액) / 구매액 x 100, 소수 1자리 */
  roi: number | null;
  ticket_count: number;
  win_ticket_count: number;
  /** KST 'YYYY-MM-DDTHH:MM:SS' */
  first_purchase: string | null;
  last_purchase: string | null;
  /** 첫 구매부터 지금까지(최소 1주) 주 평균 구매액 */
  weekly_avg_spent: number | null;
  /** 구매한 날 사이 평균 간격(일) */
  purchase_cycle_days: number | null;
}

export interface LedgerMonth {
  month: string; // 'YYYY-MM'
  spent: number;
  won: number;
  tickets: number;
}

export interface LedgerHeatCell {
  dow: number; // 0=일 … 6=토
  slot: number; // 0:0~4시 1:4~8시 … 5:20~24시
  count: number;
  amount: number;
}

export interface LedgerStats {
  summary: LedgerSummary;
  this_month_spent: number;
  monthly: LedgerMonth[];
  heatmap: LedgerHeatCell[];
}

type LedgerTicket = Pick<Ticket, 'amount' | 'win_amount' | 'purchase_date'>;

const KST = 9 * 3_600_000;
const DAY = 86_400_000;
const WEEK = 7 * DAY;

/** Postgres numeric round(): 0.5 는 0 에서 먼 쪽으로 */
export function roundHalfAway(value: number, digits = 0): number {
  const f = 10 ** digits;
  const v = Math.abs(value) * f;
  // 부동소수 오차 보정 (예: 1.005)
  const r = Math.floor(v + 0.5 + 1e-9);
  return (Math.sign(value) * r) / f;
}

const pad = (n: number) => String(n).padStart(2, '0');

function kstFields(ms: number) {
  const d = new Date(ms + KST);
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth() + 1,
    d: d.getUTCDate(),
    dow: d.getUTCDay(),
    h: d.getUTCHours(),
    iso: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`,
    dayIndex: Math.floor((ms + KST) / DAY),
  };
}

export function computeLedgerStats(tickets: readonly LedgerTicket[], now: Date = new Date()): LedgerStats {
  const rows = tickets.map((t) => ({ ...t, ms: new Date(t.purchase_date).getTime() }));
  const nowF = kstFields(now.getTime());

  let spent = 0;
  let won = 0;
  let winTickets = 0;
  let first = Infinity;
  let last = -Infinity;
  let thisMonth = 0;
  const months = new Map<string, LedgerMonth>();
  const heat = new Map<string, LedgerHeatCell>();
  const days = new Set<number>();

  for (const r of rows) {
    const f = kstFields(r.ms);
    spent += r.amount;
    won += r.win_amount;
    if (r.win_amount > 0) winTickets += 1;
    first = Math.min(first, r.ms);
    last = Math.max(last, r.ms);
    if (f.y === nowF.y && f.m === nowF.m) thisMonth += r.amount;

    const key = `${f.y}-${pad(f.m)}`;
    const m = months.get(key) ?? { month: key, spent: 0, won: 0, tickets: 0 };
    m.spent += r.amount;
    m.won += r.win_amount;
    m.tickets += 1;
    months.set(key, m);

    const slot = Math.floor(f.h / 4);
    const hk = `${f.dow}-${slot}`;
    const c = heat.get(hk) ?? { dow: f.dow, slot, count: 0, amount: 0 };
    c.count += 1;
    c.amount += r.amount;
    heat.set(hk, c);

    days.add(f.dayIndex);
  }

  const sortedDays = [...days].sort((a, b) => a - b);
  const gaps = sortedDays.slice(1).map((d, i) => d - sortedDays[i]);
  const count = rows.length;
  const weeks = count ? Math.max(1, Math.ceil((now.getTime() - first) / WEEK)) : 1;

  return {
    summary: {
      total_spent: spent,
      total_won: won,
      profit: won - spent,
      roi: spent > 0 ? roundHalfAway(((won - spent) * 100) / spent, 1) : null,
      ticket_count: count,
      win_ticket_count: winTickets,
      first_purchase: count ? kstFields(first).iso : null,
      last_purchase: count ? kstFields(last).iso : null,
      weekly_avg_spent: count ? roundHalfAway(spent / weeks) : null,
      purchase_cycle_days: gaps.length ? roundHalfAway(gaps.reduce((a, b) => a + b, 0) / gaps.length, 1) : null,
    },
    this_month_spent: thisMonth,
    monthly: [...months.values()].sort((a, b) => b.month.localeCompare(a.month)).slice(0, 12).reverse(),
    heatmap: [...heat.values()].sort((a, b) => a.dow - b.dow || a.slot - b.slot),
  };
}

/** KST 기준 이번 달 구매액 */
export function monthSpent(tickets: readonly LedgerTicket[], now: Date = new Date()): number {
  const n = kstFields(now.getTime());
  return tickets.reduce((sum, t) => {
    const f = kstFields(new Date(t.purchase_date).getTime());
    return f.y === n.y && f.m === n.m ? sum + t.amount : sum;
  }, 0);
}

/** 예산 상태: 80% 이상 주의, 100% 이상 초과 */
export type BudgetLevel = 'none' | 'ok' | 'warning' | 'over';
export function budgetLevel(spent: number, budget: number | null | undefined): BudgetLevel {
  if (!budget || budget <= 0) return 'none';
  const ratio = spent / budget;
  if (ratio >= 1) return 'over';
  if (ratio >= 0.8) return 'warning';
  return 'ok';
}
