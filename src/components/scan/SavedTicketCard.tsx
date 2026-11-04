'use client';

import { CircleCheck, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { GameRow } from '@/components/scan/GameRow';
import { formatDateTimeKST, formatWon } from '@/lib/format';
import type { Ticket } from '@/lib/repo';

export function SavedTicketCard({
  ticket,
  auto,
  estimatedDate,
  onAgain,
  children,
}: {
  ticket: Ticket;
  auto: boolean;
  estimatedDate?: boolean;
  onAgain: () => void;
  /** 게임별 부가 정보 (3단계: 품질 점수) */
  children?: (game: number[], index: number) => React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CircleCheck className="h-6 w-6 text-gold" />
        <p className="font-display text-lg">티켓 등록 완료!</p>
        {auto && <span className="chip ml-auto text-gold">사진 자동 인식</span>}
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-ink-700/60 py-2.5">
          <dt className="text-[11px] text-fog-400">회차</dt>
          <dd className="num font-bold">{ticket.round}회</dd>
        </div>
        <div className="rounded-2xl bg-ink-700/60 py-2.5">
          <dt className="text-[11px] text-fog-400">금액</dt>
          <dd className="num font-bold">{formatWon(ticket.amount)}</dd>
        </div>
        <div className="rounded-2xl bg-ink-700/60 py-2.5">
          <dt className="text-[11px] text-fog-400">판매점</dt>
          <dd className="num truncate px-1 font-bold">{ticket.store_code ?? '-'}</dd>
        </div>
      </dl>
      <p className="text-xs text-fog-400">
        {ticket.store_name ? `${ticket.store_name} · ` : ''}
        {formatDateTimeKST(ticket.purchase_date)}
        {estimatedDate ? ' (추첨일 기준 추정)' : ''}
      </p>

      <ul className="space-y-2">
        {ticket.games.map((g, i) => (
          <li key={i} className="rounded-2xl bg-ink-700/40 p-3">
            <GameRow index={i} game={g} />
            {children?.(g, i)}
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <button className="btn-ghost flex-1" onClick={onAgain}>
          한 장 더 등록
        </button>
        <Link href="/logs" className="btn-gold flex-1">
          티켓로그 <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
