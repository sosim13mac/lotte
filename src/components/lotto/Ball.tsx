import { ballTone, type BallTone } from '@/lib/lotto/constants';
import { cn } from '@/lib/cn';

export const BALL_TONE_CLASS: Record<BallTone, string> = {
  y: 'bg-ball-y text-deep',
  b: 'bg-ball-b text-deep',
  r: 'bg-ball-r text-deep',
  g: 'bg-ball-g text-deep',
  n: 'bg-ball-n text-deep',
};

export const BALL_SIZE_CLASS = {
  xs: 'h-6 w-6 text-[11px]',
  sm: 'h-8 w-8 text-[13px]',
  md: 'h-10 w-10 text-[15px]',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-14 w-14 text-xl',
} as const;

export type BallSize = keyof typeof BALL_SIZE_CLASS;

/** 공 표면 하이라이트 (입체감) */
export const BALL_SHINE = 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.6), rgba(255,255,255,0) 45%)';

interface BallProps {
  n?: number | null;
  size?: BallSize;
  hidden?: boolean;
  dim?: boolean;
  className?: string;
}

/** 정적인 로또 공 (애니메이션 버전은 logs 화면의 LottoBall) */
export function Ball({ n, size = 'md', hidden = false, dim = false, className }: BallProps) {
  const showNumber = !hidden && typeof n === 'number';
  return (
    <span
      className={cn(
        'num inline-flex shrink-0 select-none items-center justify-center rounded-full font-black shadow-[inset_0_-3px_0_rgba(0,0,0,0.18)]',
        BALL_SIZE_CLASS[size],
        showNumber ? BALL_TONE_CLASS[ballTone(n)] : 'bg-ink-600 text-fog-300',
        dim && 'opacity-35',
        className,
      )}
      style={{ backgroundImage: BALL_SHINE }}
      aria-label={showNumber ? `${n}번` : '가려진 번호'}
    >
      {showNumber ? n : '?'}
    </span>
  );
}
