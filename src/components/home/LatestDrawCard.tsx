'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Ball } from '@/components/lotto/Ball';
import { formatDateKST } from '@/lib/format';
import { useAppStore } from '@/store/useAppStore';

export function LatestDrawCard() {
  const recentRounds = useAppStore((s) => s.recentRounds);
  const draws = useAppStore((s) => s.draws);
  const draw = recentRounds.length ? draws[recentRounds[0]] : undefined;

  if (!draw) {
    return (
      <section className="card text-sm text-fog-300">
        아직 당첨번호 데이터가 없어요. 토요일 추첨 후 자동으로 채워져요.
      </section>
    );
  }

  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <h2 className="section-title">{draw.round}회 당첨번호</h2>
        <span className="text-xs text-fog-400">{formatDateKST(`${draw.draw_date}T12:00:00+09:00`)}</span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-1">
        {draw.numbers.map((n) => (
          <Ball key={n} n={n} size="md" />
        ))}
        <span className="text-fog-500">+</span>
        <Ball n={draw.bonus} size="md" />
      </div>
      <Link href="/logs" className="mt-4 flex items-center justify-end gap-1 text-sm font-medium text-gold">
        내 티켓과 맞춰보기 <ChevronRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
