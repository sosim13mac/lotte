'use client';

import { Clock } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { formatWon } from '@/lib/format';
import { isLottoOnSale, latestDrawnRound, msUntilNextDraw } from '@/lib/lotto/round';
import { useAppStore } from '@/store/useAppStore';

function split(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 다음 추첨 카운트다운 + 이번 회차 내 티켓 요약 */
export function NextDrawCard() {
  const tickets = useAppStore((s) => s.tickets);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const round = latestDrawnRound(now) + 1;
  const left = split(msUntilNextDraw(now));
  const onSale = isLottoOnSale(now);
  const mine = useMemo(() => tickets.filter((t) => t.round === round), [tickets, round]);
  const spent = mine.reduce((sum, t) => sum + t.amount, 0);

  return (
    <section className="card relative overflow-hidden">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/10 blur-2xl" />
      <div className="flex items-center justify-between">
        <span className="chip">
          <Clock className="h-3.5 w-3.5" />
          {round}회 추첨까지
        </span>
        <span className={onSale ? 'text-xs text-gold' : 'text-xs text-fog-500'}>
          {onSale ? '지금 구매 가능' : '판매 시간 아님 (토 20:00 ~ 일 06:00 · 매일 0~6시)'}
        </span>
      </div>
      <p className="num mt-4 font-display text-[40px] leading-none tracking-tight">
        {left.d > 0 && <span className="mr-2 text-gold">D-{left.d}</span>}
        {pad(left.h)}:{pad(left.m)}:{pad(left.s)}
      </p>
      <p className="mt-2 text-xs text-fog-400">매주 토요일 20:35 추첨 · 판매 마감 20:00</p>
      <Link
        href="/logs"
        className="mt-5 flex items-center justify-between rounded-2xl bg-ink-700 px-4 py-3 text-sm transition hover:bg-ink-600"
      >
        <span className="text-fog-300">이번 회차 내 티켓</span>
        <span className="num font-bold">
          {mine.length}장 · {formatWon(spent)}
        </span>
      </Link>
    </section>
  );
}
