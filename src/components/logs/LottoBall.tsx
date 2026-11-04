'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { BALL_SHINE, BALL_TONE_CLASS } from '@/components/lotto/Ball';
import { cn } from '@/lib/cn';
import { ballTone } from '@/lib/lotto/constants';

const SIZE = {
  sm: 'h-8 w-8 text-[13px]',
  md: 'h-10 w-10 text-[15px]',
} as const;

const GLOW_ON = [
  '0 0 0 3px #FFC94A, 0 0 14px 3px rgba(255, 201, 74, 0.55)',
  '0 0 0 3px #FFE7A8, 0 0 24px 8px rgba(255, 201, 74, 0.85)',
  '0 0 0 3px #FFC94A, 0 0 14px 3px rgba(255, 201, 74, 0.55)',
];
const GLOW_OFF = '0 0 0 0px rgba(255, 201, 74, 0), 0 0 0px 0px rgba(255, 201, 74, 0)';

export interface LottoBallProps {
  n: number;
  /** 앞면(번호) 공개 여부 — false 면 ? 면 */
  revealed: boolean;
  /** Glow + scale 1.2 + 금색 테두리 */
  glow?: boolean;
  /** 공개 직전 두근두근 흔들림 */
  suspense?: boolean;
  /** 뒤집힘 지연(초) — '한번에 짠!' 의 순차 효과 */
  delay?: number;
  size?: keyof typeof SIZE;
}

/** 쫄깃 오픈용 로또 공: 3D 뒤집기 + 금색 글로우 */
export function LottoBall({ n, revealed, glow = false, suspense = false, delay = 0, size = 'sm' }: LottoBallProps) {
  const reduce = useReducedMotion();
  const flip = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 240, damping: 20, delay };

  return (
    <motion.span
      className={cn('relative inline-block shrink-0 [perspective:600px]', SIZE[size])}
      initial={false}
      animate={{ scale: glow ? 1.2 : 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 14 }}
      style={{ zIndex: glow ? 2 : 1 }}
      role="img"
      aria-label={revealed ? `${n}번${glow ? ', 일치' : ''}` : '가려진 번호'}
    >
      <motion.span
        className="absolute inset-0 [transform-style:preserve-3d]"
        initial={false}
        animate={
          suspense && !reduce
            ? { rotateY: 180, x: [0, -3, 3, -2, 2, 0], rotate: [0, -8, 8, -5, 5, 0] }
            : { rotateY: revealed ? 0 : 180, x: 0, rotate: 0 }
        }
        transition={
          suspense && !reduce
            ? { x: { duration: 0.5, repeat: Infinity }, rotate: { duration: 0.5, repeat: Infinity } }
            : { rotateY: flip, x: { duration: 0.15 }, rotate: { duration: 0.15 } }
        }
      >
        {/* 앞면: 번호 */}
        <motion.span
          className={cn(
            'num absolute inset-0 flex items-center justify-center rounded-full font-black [backface-visibility:hidden]',
            BALL_TONE_CLASS[ballTone(n)],
          )}
          style={{ backgroundImage: BALL_SHINE }}
          initial={false}
          animate={{ boxShadow: glow ? GLOW_ON : GLOW_OFF }}
          transition={glow && !reduce ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
        >
          {n}
        </motion.span>
        {/* 뒷면: ? */}
        <span
          className="absolute inset-0 flex items-center justify-center rounded-full bg-ink-600 font-black text-fog-300 shadow-[inset_0_-3px_0_rgba(0,0,0,0.25)] [backface-visibility:hidden] [transform:rotateY(180deg)]"
          style={{ backgroundImage: BALL_SHINE }}
        >
          ?
        </span>
      </motion.span>
    </motion.span>
  );
}
