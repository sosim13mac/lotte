'use client';

import { useEffect } from 'react';
import { formatWon, kstParts } from '@/lib/format';
import { budgetLevel, monthSpent } from '@/lib/ledger';
import { showLocalNotification } from '@/lib/notify';
import { useAppStore } from '@/store/useAppStore';

/** 이번 달 구매액이 월 예산의 80%(주의) / 100%(초과)를 넘으면 한 달에 한 번씩 알림 */
export function BudgetWatcher() {
  const tickets = useAppStore((s) => s.tickets);
  const budget = useAppStore((s) => s.profile?.monthly_budget ?? null);
  const showToast = useAppStore((s) => s.showToast);

  useEffect(() => {
    if (!budget) return;
    const spent = monthSpent(tickets);
    const level = budgetLevel(spent, budget);
    if (level !== 'warning' && level !== 'over') return;
    const { year, month } = kstParts(new Date());
    const key = `zzolgit:budget-alert:${year}-${month}:${level}`;
    try {
      if (window.localStorage.getItem(key)) return;
      window.localStorage.setItem(key, '1');
    } catch {
      // 저장소를 못 쓰면 매번 알림 대신 이번 세션만
    }
    const pct = Math.round((spent / budget) * 100);
    const text =
      level === 'over'
        ? `이번 달 로또 예산을 넘었어요 (${formatWon(spent)} / ${formatWon(budget)}, ${pct}%)`
        : `이번 달 로또 예산의 ${pct}%를 썼어요 (${formatWon(spent)} / ${formatWon(budget)})`;
    showToast(text, 'warning');
    void showLocalNotification('쫄깃로또 예산 알림', text, '/stats', 'budget');
  }, [tickets, budget, showToast]);

  return null;
}
