'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { BudgetCard } from '@/components/stats/BudgetCard';
import { LedgerTable } from '@/components/stats/LedgerTable';
import { MonthlyChart } from '@/components/stats/MonthlyChart';
import { StatTile } from '@/components/stats/StatTile';
import { WeekdayHeatmap } from '@/components/stats/WeekdayHeatmap';
import { cn } from '@/lib/cn';
import { formatSignedWon, formatWon } from '@/lib/format';
import type { LedgerStats } from '@/lib/ledger';
import { getRepo } from '@/lib/repo';
import { useAppStore } from '@/store/useAppStore';

export function StatsView() {
  const tickets = useAppStore((s) => s.tickets);
  const [stats, setStats] = useState<LedgerStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 티켓이 바뀌면 다시 집계 (이전 화면은 유지 — 깜빡임 없음)
  const fingerprint = `${tickets.length}:${tickets.reduce((s, t) => s + t.amount + t.win_amount, 0)}`;
  useEffect(() => {
    let cancelled = false;
    setRefreshing(true);
    getRepo()
      .getLedgerStats()
      .then((s) => !cancelled && (setStats(s), setError(null)))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : '집계를 불러오지 못했어요'))
      .finally(() => !cancelled && setRefreshing(false));
    return () => {
      cancelled = true;
    };
  }, [fingerprint]);

  const s = stats?.summary;
  const profit = s?.profit ?? 0;

  return (
    <>
      <PageHeader title="가계부" subtitle="티켓을 등록하면 자동으로 집계돼요" />
      {error && <p className="mb-3 rounded-2xl bg-gain/10 px-4 py-3 text-sm text-gain">{error}</p>}

      <div className={cn('space-y-4 transition-opacity', refreshing && stats && 'opacity-70')}>
        <section className="grid grid-cols-2 gap-2.5" aria-label="요약 지표">
          <StatTile label="총 구매액" value={formatWon(s?.total_spent ?? 0)} sub={`티켓 ${s?.ticket_count ?? 0}장`} />
          <StatTile label="총 당첨액" value={formatWon(s?.total_won ?? 0)} sub={`당첨 티켓 ${s?.win_ticket_count ?? 0}장`} />
          <StatTile
            label="손익"
            value={formatSignedWon(profit)}
            icon={
              profit > 0 ? (
                <TrendingUp className="h-5 w-5 text-gain" aria-label="이익" />
              ) : profit < 0 ? (
                <TrendingDown className="h-5 w-5 text-loss" aria-label="손실" />
              ) : null
            }
          />
          <StatTile label="ROI" value={s?.roi === null || s?.roi === undefined ? '-' : `${s.roi > 0 ? '+' : ''}${s.roi}%`} sub="(당첨액-구매액) ÷ 구매액" />
          <StatTile label="주 평균 구매액" value={s?.weekly_avg_spent ? formatWon(s.weekly_avg_spent) : '-'} sub="첫 구매부터 지금까지" />
          <StatTile
            label="구매 주기"
            value={s?.purchase_cycle_days ? `${s.purchase_cycle_days}일마다` : '-'}
            sub="구매한 날 사이 평균 간격"
          />
        </section>

        <BudgetCard />
        <MonthlyChart monthly={stats?.monthly ?? []} />
        <WeekdayHeatmap cells={stats?.heatmap ?? []} />
        <LedgerTable tickets={tickets} />
      </div>
    </>
  );
}
