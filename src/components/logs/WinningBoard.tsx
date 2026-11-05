'use client';

import { motion } from 'framer-motion';
import { Check, RotateCcw } from 'lucide-react';
import { BALL_SHINE, BALL_TONE_CLASS } from '@/components/lotto/Ball';
import { cn } from '@/lib/cn';
import { formatDateKST } from '@/lib/format';
import { ballTone } from '@/lib/lotto/constants';
import type { HighlightMode } from '@/lib/lotto/reveal';
import type { WinningDraw } from '@/lib/repo';

function BoardBall({
  n,
  selected,
  bonus,
  onToggle,
}: {
  n: number;
  selected: boolean;
  bonus?: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      aria-label={`${bonus ? '보너스 ' : ''}${n}번 ${selected ? '선택 해제' : '선택'}`}
      whileTap={{ scale: 0.9 }}
      animate={{ y: selected ? -6 : 0, scale: selected ? 1.06 : 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
      className={cn(
        'num relative flex aspect-square w-full max-w-[52px] items-center justify-center rounded-full text-[clamp(15px,4.6vw,20px)] font-black shadow-[inset_0_-4px_0_rgba(0,0,0,0.2)]',
        BALL_TONE_CLASS[ballTone(n)],
        selected && 'ring-[3px] ring-gold ring-offset-2 ring-offset-ink-800',
      )}
      style={{ backgroundImage: BALL_SHINE }}
    >
      {n}
      {selected && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-white">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
    </motion.button>
  );
}

/** 상단 당첨번호 6개 + 보너스. 공을 누르면 내 티켓에서 같은 번호가 빛납니다. */
export function WinningBoard({
  round,
  draw,
  selected,
  onToggle,
  onSelectAll,
  onClear,
  mode,
  matchingGames,
  pendingText,
}: {
  round: number;
  draw: WinningDraw | null;
  selected: ReadonlySet<number>;
  onToggle: (n: number) => void;
  onSelectAll: () => void;
  onClear: () => void;
  mode: HighlightMode;
  /** filter 모드에서 선택 번호를 모두 가진 게임 수 */
  matchingGames: number;
  pendingText?: string;
}) {
  return (
    <section className="card relative">
      <div className="flex items-baseline justify-between">
        <h2 className="section-title">{round}회 당첨번호</h2>
        {draw && <span className="text-xs text-fog-400">{formatDateKST(`${draw.draw_date}T12:00:00+09:00`)}</span>}
      </div>

      {draw ? (
        <>
          <p className="mt-1 text-sm text-fog-300">공을 눌러 내 번호를 찾아보세요</p>
          <div className="mt-5 flex items-center justify-between gap-1">
            {draw.numbers.map((n) => (
              <div key={n} className="flex flex-1 justify-center">
                <BoardBall n={n} selected={selected.has(n)} onToggle={() => onToggle(n)} />
              </div>
            ))}
            <span className="px-0.5 text-lg text-fog-500">+</span>
            <div className="flex flex-1 flex-col items-center">
              <BoardBall n={draw.bonus} bonus selected={selected.has(draw.bonus)} onToggle={() => onToggle(draw.bonus)} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button className="btn-ghost btn-sm" onClick={onSelectAll}>
              6개 모두
            </button>
            <button className="btn-ghost btn-sm" onClick={onClear} disabled={selected.size === 0}>
              <RotateCcw className="h-3.5 w-3.5" /> 초기화
            </button>
            <p className="num ml-auto text-right text-xs text-fog-300" aria-live="polite">
              {mode === 'none' && '선택 0개'}
              {mode === 'filter' && (
                <>
                  선택 {selected.size}개 · 모두 가진 게임 <b className="text-fog">{matchingGames}</b>
                </>
              )}
              {mode === 'result' && <b className="text-gold-deep">결과 하이라이트</b>}
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="mt-5 flex items-center justify-between gap-1" aria-hidden>
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="flex flex-1 justify-center">
                <span
                  className="flex aspect-square w-full max-w-[52px] items-center justify-center rounded-full bg-ink-600 font-black text-fog-400"
                  style={{ backgroundImage: BALL_SHINE }}
                >
                  ?
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-sm text-fog-300">{pendingText}</p>
        </>
      )}
    </section>
  );
}
