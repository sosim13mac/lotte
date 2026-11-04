'use client';

import { Shuffle, X } from 'lucide-react';
import { BALL_TONE_CLASS } from '@/components/lotto/Ball';
import { cn } from '@/lib/cn';
import { ballTone, LOTTO_MAX, LOTTO_PICK } from '@/lib/lotto/constants';
import { defaultRng, pickNumbers } from '@/lib/random';

/** 로또 용지처럼 7칸 격자로 1~45 선택 */
export function NumberPicker({
  value,
  onChange,
  max = LOTTO_PICK,
}: {
  value: number[];
  onChange: (next: number[]) => void;
  max?: number;
}) {
  const selected = new Set(value);
  const full = value.length >= max;

  const toggle = (n: number) => {
    if (selected.has(n)) onChange(value.filter((x) => x !== n));
    else if (!full) onChange([...value, n].sort((a, b) => a - b));
  };

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="번호 선택">
        {Array.from({ length: LOTTO_MAX }, (_, i) => i + 1).map((n) => {
          const on = selected.has(n);
          return (
            <button
              key={n}
              type="button"
              onClick={() => toggle(n)}
              aria-pressed={on}
              disabled={!on && full}
              className={cn(
                'num h-9 rounded-xl text-sm font-bold transition active:scale-95',
                on ? BALL_TONE_CLASS[ballTone(n)] : 'bg-ink-700 text-fog-300 hover:bg-ink-600',
                !on && full && 'opacity-40',
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={full}
          onClick={() => onChange(pickNumbers(defaultRng(), max, LOTTO_MAX, value))}
        >
          <Shuffle className="h-4 w-4" /> 나머지 자동
        </button>
        <button type="button" className="btn-ghost btn-sm" disabled={!value.length} onClick={() => onChange([])}>
          <X className="h-4 w-4" /> 지우기
        </button>
        <span className={cn('num ml-auto text-sm', full ? 'text-gold-deep' : 'text-fog-400')}>
          {value.length}/{max}
        </span>
      </div>
    </div>
  );
}
