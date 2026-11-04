'use client';

import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Disclaimer } from '@/components/Disclaimer';
import { NumberPicker } from '@/components/lotto/NumberPicker';
import { QualityReport } from '@/components/quality/QualityReport';
import { cn } from '@/lib/cn';
import { evaluateQuality } from '@/lib/lotto/quality';
import { selectRecentWinningNumbers, useAppStore } from '@/store/useAppStore';

/** 사진 없이 번호 6개만 골라 품질 평가 */
export function QuickQualityCard() {
  const draws = useAppStore((s) => s.draws);
  const recentRounds = useAppStore((s) => s.recentRounds);
  const [open, setOpen] = useState(false);
  const [game, setGame] = useState<number[]>([]);

  const result = useMemo(
    () => (game.length === 6 ? evaluateQuality(game, selectRecentWinningNumbers({ draws, recentRounds })) : null),
    [game, draws, recentRounds],
  );

  return (
    <section className="card">
      <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <div>
          <h2 className="section-title">번호만 품질 평가</h2>
          <p className="mt-1 text-sm text-fog-300">사진 없이 6개를 골라 밸런스·희소성을 확인해요.</p>
        </div>
        <ChevronDown className={cn('h-5 w-5 shrink-0 text-fog-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <NumberPicker value={game} onChange={setGame} />
          {result ? (
            <>
              <QualityReport result={result} />
              <Disclaimer />
            </>
          ) : (
            <p className="text-center text-sm text-fog-500">번호 6개를 고르면 품질 점수가 나와요</p>
          )}
        </div>
      )}
    </section>
  );
}
