'use client';

import { Bell, CircleCheck, OctagonAlert, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatWon, kstParts } from '@/lib/format';
import { budgetLevel, monthSpent } from '@/lib/ledger';
import { ensureNotificationPermission, notificationsSupported } from '@/lib/notify';
import { useAppStore } from '@/store/useAppStore';

const MAX = 100_000;
const STEP = 5_000;

const LEVEL = {
  none: { color: 'var(--viz-series-1)', Icon: CircleCheck, text: '예산을 정하면 80%에서 알려드려요' },
  ok: { color: 'var(--viz-series-1)', Icon: CircleCheck, text: '예산 안에서 즐기는 중' },
  warning: { color: 'var(--status-warning)', Icon: TriangleAlert, text: '예산의 80%를 넘었어요' },
  over: { color: 'var(--status-critical)', Icon: OctagonAlert, text: '이번 달 예산을 초과했어요' },
} as const;

/** 월 예산 슬라이더 + 이번 달 사용률 미터 (80% 이상 주의, 100% 이상 초과) */
export function BudgetCard() {
  const tickets = useAppStore((s) => s.tickets);
  const saved = useAppStore((s) => s.profile?.monthly_budget ?? 0);
  const saveProfile = useAppStore((s) => s.saveProfile);
  const [budget, setBudget] = useState(saved ?? 0);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setBudget(saved ?? 0), [saved]);
  useEffect(() => {
    setPermission(notificationsSupported() ? Notification.permission : 'unsupported');
  }, []);

  function change(v: number) {
    setBudget(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void saveProfile({ monthly_budget: v > 0 ? v : null }), 600);
  }

  const spent = monthSpent(tickets);
  const level = budgetLevel(spent, budget);
  const ratio = budget > 0 ? spent / budget : 0;
  const { color, Icon, text } = LEVEL[level];
  const { month } = kstParts(new Date());

  return (
    <section className="card">
      <div className="flex items-baseline justify-between">
        <h2 className="section-title">월 예산</h2>
        <p className="num text-lg font-bold">{budget > 0 ? formatWon(budget) : '미설정'}</p>
      </div>

      <input
        type="range"
        min={0}
        max={MAX}
        step={STEP}
        value={budget}
        onChange={(e) => change(Number(e.target.value))}
        className="mt-4 w-full accent-[#FFC94A]"
        aria-label="월 예산"
        aria-valuetext={budget > 0 ? formatWon(budget) : '미설정'}
      />
      <div className="num flex justify-between text-[10px] text-fog-500">
        <span>0</span>
        <span>5만</span>
        <span>10만</span>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between text-xs">
          <span className="text-fog-300">{month}월 사용</span>
          <span className="num text-fog">
            <b>{formatWon(spent)}</b>
            {budget > 0 && <span className="text-fog-400"> / {formatWon(budget)} ({Math.round(ratio * 100)}%)</span>}
          </span>
        </div>
        <div
          className="relative h-2.5 overflow-hidden rounded-full"
          style={{ background: `color-mix(in srgb, ${color} 22%, transparent)` }}
          role="meter"
          aria-valuemin={0}
          aria-valuemax={budget || 1}
          aria-valuenow={spent}
          aria-label="이번 달 예산 사용률"
        >
          <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, ratio * 100)}%`, background: color }} />
          {budget > 0 && <span className="absolute inset-y-0 left-[80%] w-0.5 bg-ink-800" aria-hidden />}
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-fog-300">
          <Icon className="h-4 w-4 shrink-0" style={{ color }} aria-hidden />
          {text}
        </p>
      </div>

      {budget > 0 && permission === 'default' && (
        <button
          className="btn-ghost btn-sm mt-3 w-full"
          onClick={async () => setPermission((await ensureNotificationPermission()) ? 'granted' : Notification.permission)}
        >
          <Bell className="h-4 w-4" /> 80% 넘으면 휴대폰 알림 받기
        </button>
      )}
    </section>
  );
}
