'use client';

import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { QualityReport } from '@/components/quality/QualityReport';
import { cn } from '@/lib/cn';
import { evaluateQuality } from '@/lib/lotto/quality';
import { selectRecentWinningNumbers, useAppStore } from '@/store/useAppStore';

/** 게임 한 줄 아래 붙는 '품질 nn' 버튼 → 펼치면 전체 리포트 */
export function QualityChip({ game, defaultOpen = false }: { game: number[]; defaultOpen?: boolean }) {
  const draws = useAppStore((s) => s.draws);
  const recentRounds = useAppStore((s) => s.recentRounds);
  const [open, setOpen] = useState(defaultOpen);
  const result = useMemo(
    () => evaluateQuality(game, selectRecentWinningNumbers({ draws, recentRounds })),
    [game, draws, recentRounds],
  );

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-xl px-1 py-1 text-left text-xs text-fog-300 hover:text-fog"
        aria-expanded={open}
      >
        <span className="num rounded-full bg-gold/15 px-2 py-0.5 font-bold text-gold-soft">품질 {result.score}</span>
        <span className="truncate">{result.label}</span>
        <ChevronDown className={cn('ml-auto h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-2 rounded-2xl bg-ink-800 p-3">
          <QualityReport result={result} compact />
        </div>
      )}
    </div>
  );
}
