import { DISCLAIMER, ODDS_NOTICE } from '@/lib/lotto/constants';
import { cn } from '@/lib/cn';

/** 법적 고지 — 추천/품질 점수가 보이는 모든 화면에 노출 */
export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={cn('text-center text-[11px] leading-relaxed text-fog-500', className)}>
      {DISCLAIMER}.
      <br />
      {ODDS_NOTICE}.
    </p>
  );
}
