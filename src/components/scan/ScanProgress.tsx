import { Check, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ScanStage } from '@/lib/scan/scanTicket';

const STEPS: Array<{ stage: Exclude<ScanStage, 'done'>; label: string }> = [
  { stage: 'loading', label: '사진 불러오기' },
  { stage: 'qr', label: 'QR 찾는 중 (상단 40%)' },
  { stage: 'ocr', label: '판매점 코드 읽는 중 (하단 30%)' },
];

export function ScanProgress({ stage, progress }: { stage: ScanStage; progress?: number }) {
  const current = STEPS.findIndex((s) => s.stage === stage);
  return (
    <ol className="space-y-3" aria-live="polite">
      {STEPS.map((s, i) => {
        const done = stage === 'done' || i < current;
        const active = i === current;
        return (
          <li key={s.stage} className="flex items-center gap-3">
            <span
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full',
                done ? 'bg-gold text-ink' : active ? 'bg-gold/15 text-gold' : 'bg-ink-700 text-fog-500',
              )}
            >
              {done ? <Check className="h-4 w-4" /> : active ? <LoaderCircle className="h-4 w-4 animate-spin" /> : i + 1}
            </span>
            <div className="flex-1">
              <p className={cn('text-sm', active ? 'text-fog' : done ? 'text-fog-300' : 'text-fog-500')}>{s.label}</p>
              {active && s.stage === 'ocr' && typeof progress === 'number' && progress > 0 && (
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-ink-700">
                  <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
