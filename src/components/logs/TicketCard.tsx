'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff, Store, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { LottoBall } from '@/components/logs/LottoBall';
import { cn } from '@/lib/cn';
import { formatDateTimeKST, formatWon } from '@/lib/format';
import { GAME_LABELS } from '@/lib/lotto/constants';
import { countMatches, gameResult, RANK_LABEL, ticketResult } from '@/lib/lotto/prize';
import { gameLook, highlightMode } from '@/lib/lotto/reveal';
import type { Ticket, WinningDraw } from '@/lib/repo';

export type TicketStatus = 'pending' | 'waiting' | 'sealed' | 'opened';

function StatusChip({ status, ticket, draw }: { status: TicketStatus; ticket: Ticket; draw: WinningDraw | null }) {
  if (status === 'pending') return <span className="chip">추첨 전</span>;
  if (status === 'waiting') return <span className="chip">결과 대기</span>;
  if (status === 'sealed') return <span className="chip bg-chewy/15 text-chewy-deep">미개봉</span>;
  const best = draw ? ticketResult(ticket.games, draw).bestRank : null;
  return best ? (
    <span className="chip bg-gold/20 font-bold text-gold-deep">{RANK_LABEL[best]} 당첨</span>
  ) : (
    <span className="chip">낙첨</span>
  );
}

function RowBadge({
  game,
  draw,
  revealedCount,
  resultMode,
}: {
  game: number[];
  draw: WinningDraw | null;
  revealedCount: number;
  resultMode: boolean;
}) {
  if (!draw) return <span className="w-[76px]" />;
  const done = revealedCount >= 6 || resultMode;
  let content: React.ReactNode = null;
  let key = 'none';
  if (done) {
    const r = gameResult(game, draw);
    key = `done-${r.rank ?? 'x'}`;
    content = r.rank ? (
      <span className="num inline-flex flex-col items-end rounded-xl bg-gold px-2 py-1 text-right leading-tight text-white">
        <b className="text-[13px]">{RANK_LABEL[r.rank]}!</b>
        <span className="text-[10px] font-bold">{r.prize === null ? '금액 집계 중' : formatWon(r.prize)}</span>
      </span>
    ) : (
      <span className="rounded-xl bg-ink-700 px-2 py-1 text-xs text-fog-400">{r.matches}개 · 꽝</span>
    );
  } else if (revealedCount > 0) {
    const m = countMatches(game.slice(0, revealedCount), draw.numbers);
    key = `partial-${m}`;
    content = <span className="num text-xs font-bold text-gold-deep">{m}개 일치…</span>;
  }
  return (
    <span className="flex w-[76px] justify-end">
      <AnimatePresence mode="popLayout">
        {content && (
          <motion.span
            key={key}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

export function TicketCard({
  ticket,
  draw,
  status,
  reveal,
  selected,
  suspense,
  shakeAll = false,
  flipDelayBase = 0,
  onDelete,
}: {
  ticket: Ticket;
  draw: WinningDraw | null;
  status: TicketStatus;
  /** 게임별 공개된 공 개수 (0~6) */
  reveal: number[];
  selected: ReadonlySet<number>;
  /** 두근두근 흔들 공 */
  suspense: { game: number; index: number } | null;
  /** '한번에 짠!' 직전: 가려진 공 전부 두근두근 */
  shakeAll?: boolean;
  /** '한번에 짠!' 순차 뒤집기 시작 지연(초) */
  flipDelayBase?: number;
  onDelete?: () => void;
}) {
  const [peekPending, setPeekPending] = useState(false);
  const resultMode = highlightMode(draw, selected) === 'result';
  const total = draw && (status === 'opened' || resultMode) ? ticketResult(ticket.games, draw) : null;

  return (
    <article className="card p-4">
      <header className="mb-3 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-bold">
            <Store className="h-4 w-4 shrink-0 text-fog-400" />
            <span className="truncate">{ticket.store_name ?? (ticket.store_code ? `판매점 ${ticket.store_code}` : '판매점 미등록')}</span>
          </p>
          <p className="num mt-0.5 text-xs text-fog-400">
            {formatDateTimeKST(ticket.purchase_date)} · {ticket.games.length}게임 · {formatWon(ticket.amount)}
          </p>
        </div>
        <StatusChip status={status} ticket={ticket} draw={draw} />
        {status === 'pending' && (
          <button
            className="rounded-lg p-1 text-fog-400 hover:bg-ink-700"
            onClick={() => setPeekPending((p) => !p)}
            aria-label={peekPending ? '번호 가리기' : '번호 미리 보기'}
          >
            {peekPending ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
        {onDelete && (
          <button className="rounded-lg p-1 text-fog-500 hover:bg-ink-700 hover:text-fog" onClick={onDelete} aria-label="티켓 삭제">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </header>

      <ul className="space-y-2.5">
        {ticket.games.map((game, g) => {
          const look = gameLook(game, draw, selected);
          const count = status === 'pending' ? (peekPending ? 6 : 0) : (reveal[g] ?? 0);
          return (
            <motion.li
              key={g}
              id={`row-${ticket.id}-${g}`}
              className="flex items-center gap-2 scroll-my-32"
              animate={{ opacity: look.dim ? 0.38 : 1 }}
              transition={{ duration: 0.25 }}
            >
              <span className="w-4 text-center text-xs font-bold text-fog-400">{GAME_LABELS[g]}</span>
              <div className="flex flex-1 gap-1">
                {game.map((n, i) => (
                  <LottoBall
                    key={i}
                    n={n}
                    revealed={i < count || look.balls[i].peek}
                    glow={look.balls[i].glow}
                    suspense={(shakeAll && i >= count) || (suspense?.game === g && suspense.index === i)}
                    delay={flipDelayBase ? flipDelayBase + (g * 6 + i) * 0.03 : 0}
                  />
                ))}
              </div>
              <RowBadge game={game} draw={draw} revealedCount={count} resultMode={resultMode} />
            </motion.li>
          );
        })}
      </ul>

      {total && (
        <p className="num mt-3 border-t border-ink-600 pt-3 text-right text-xs text-fog-300">
          당첨금 <b className={cn('text-sm', total.total > 0 ? 'text-gold-deep' : 'text-fog')}>{formatWon(total.total)}</b>
          {total.hasUnknownPrize && ' + 집계 중'}
          {total.total > 0 && (
            <>
              {' · '}실수령액 <b className="text-sm text-gold-deep">{formatWon(total.net)}</b>
            </>
          )}
        </p>
      )}
    </article>
  );
}
