'use client';

import { CircleCheck, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { GameRow } from '@/components/scan/GameRow';
import { formatDateTimeKST, formatWon } from '@/lib/format';
import { RANK_LABEL, ticketResult } from '@/lib/lotto/prize';
import type { Ticket } from '@/lib/repo';
import { useAppStore } from '@/store/useAppStore';

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
  // 게스트는 티켓이 저장되지 않으므로 이 자리에서 바로 당첨 여부를 보여줍니다
  const guest = useAppStore((s) => s.status) === 'guest';
  const draw = useAppStore((s) => s.draws[ticket.round]);
  const result = guest && draw ? ticketResult(ticket.games, draw) : null;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CircleCheck className="h-6 w-6 text-gold-deep" />
        <p className="font-display text-lg">{guest ? '당첨 확인' : '티켓 등록 완료!'}</p>
        {auto && <span className="chip ml-auto text-gold-deep">사진 자동 인식</span>}
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

      {guest && (
        <p className="rounded-2xl bg-ink-700/60 px-4 py-3 text-center text-sm">
          {result ? (
            result.total > 0 ? (
              <>
                🎉 당첨! 세전 <b className="num">{formatWon(result.total)}</b> · 실수령 <b className="num">{formatWon(result.net)}</b>
                {result.hasUnknownPrize && <span className="block text-xs text-fog-400">일부 등수의 당첨금은 집계 전이에요</span>}
              </>
            ) : (
              '아쉽게도 이번 회차에는 당첨된 게임이 없어요'
            )
          ) : (
            `${ticket.round}회 추첨 결과가 아직 없어요. 추첨 후 다시 확인해 주세요`
          )}
        </p>
      )}

      <ul className="space-y-2">
        {ticket.games.map((g, i) => (
          <li key={i} className="rounded-2xl bg-ink-700/40 p-3">
            <GameRow index={i} game={g} />
            {result?.games[i]?.rank && (
              <p className="mt-1 pl-6 text-xs font-bold text-gold-deep">{RANK_LABEL[result.games[i].rank!]} 당첨</p>
            )}
            {children?.(g, i)}
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <button className="btn-ghost flex-1" onClick={onAgain}>
          한 장 더 등록
        </button>
        {guest ? (
          <Link href="/login" className="btn-gold flex-1">
            로그인하고 기록 저장 <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <Link href="/logs" className="btn-gold flex-1">
            티켓로그 <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
