'use client';

import { CircleCheck, CircleMinus, Info, Sparkles } from 'lucide-react';
import type { QualityNote, QualityResult } from '@/lib/lotto/quality';
import { cn } from '@/lib/cn';

const PARTS = [
  { key: 'balance', label: '밸런스', weight: '40%', hint: '홀짝 3:3 · 합계 140~170' },
  { key: 'rarity', label: '희소성', weight: '40%', hint: '생일 숫자·인기 패턴 회피' },
  { key: 'dupAvoid', label: '중복회피', weight: '20%', hint: '최근 20회 1등 번호와 겹침' },
] as const;

/** 같은 색 계열의 밝은 트랙 위에 채워지는 미터 */
function Meter({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-gold/15"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-label={label}
    >
      <div className="h-full rounded-full bg-gold transition-[width] duration-700" style={{ width: `${value}%` }} />
    </div>
  );
}

function NoteIcon({ tone }: { tone: QualityNote['tone'] }) {
  if (tone === 'plus') return <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-label="장점" />;
  if (tone === 'minus') return <CircleMinus className="mt-0.5 h-4 w-4 shrink-0 text-fog-400" aria-label="감점" />;
  return <Info className="mt-0.5 h-4 w-4 shrink-0 text-fog-400" aria-label="참고" />;
}

/** 품질 점수 리포트 — '확률'이 아니라 '품질 점수'로만 표기 */
export function QualityReport({ result, compact = false }: { result: QualityResult; compact?: boolean }) {
  return (
    <div className={cn('space-y-4', compact && 'space-y-3')}>
      <div className="flex items-end gap-3">
        <div>
          <p className="text-xs text-fog-400">품질 점수</p>
          <p className="font-sans text-5xl font-black leading-none tracking-tight text-fog">
            {result.score}
            <span className="ml-1 text-base font-medium text-fog-400">/100</span>
          </p>
        </div>
        <p className="mb-1 text-sm font-medium text-fog-300">{result.label}</p>
      </div>

      <dl className="space-y-2.5">
        {PARTS.map((p) => (
          <div key={p.key}>
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <dt className="text-fog-300">
                {p.label} <span className="text-fog-500">{p.weight}</span>
                {!compact && <span className="ml-1.5 text-fog-500">· {p.hint}</span>}
              </dt>
              <dd className="num font-bold text-fog">{result.breakdown[p.key]}</dd>
            </div>
            <Meter value={result.breakdown[p.key]} label={`${p.label} ${result.breakdown[p.key]}점`} />
          </div>
        ))}
      </dl>

      {!compact && (
        <ul className="space-y-1.5">
          {result.notes.map((n) => (
            <li key={n.text} className="flex gap-2 text-[13px] text-fog-300">
              <NoteIcon tone={n.tone} />
              {n.text}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2 rounded-2xl bg-ink-700/70 p-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
        <p className="text-[13px] leading-relaxed text-fog">
          <span className="mr-1 font-bold text-gold-soft">AI 코멘트</span>
          {result.comment}
        </p>
      </div>
    </div>
  );
}
