'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';

export interface RoundChip {
  round: number;
  badge: string;
  tone: 'pending' | 'sealed' | 'win' | 'none';
}

const TONE: Record<RoundChip['tone'], string> = {
  pending: 'text-fog-400',
  sealed: 'text-chewy-soft',
  win: 'text-gold',
  none: 'text-fog-500',
};

export function RoundChips({ chips, active, onSelect }: { chips: RoundChip[]; active: number; onSelect: (r: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[aria-current="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [active]);

  return (
    <div ref={ref} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="회차 선택">
      {chips.map((c) => {
        const on = c.round === active;
        return (
          <button
            key={c.round}
            role="tab"
            aria-selected={on}
            aria-current={on}
            onClick={() => onSelect(c.round)}
            className={cn(
              'flex shrink-0 flex-col items-start rounded-2xl border px-3 py-2 text-left transition',
              on ? 'border-gold/60 bg-gold/10' : 'border-white/5 bg-ink-800 hover:bg-ink-700',
            )}
          >
            <span className={cn('num text-sm font-bold', on ? 'text-fog' : 'text-fog-300')}>{c.round}회</span>
            <span className={cn('text-[11px]', TONE[c.tone])}>{c.badge}</span>
          </button>
        );
      })}
    </div>
  );
}
