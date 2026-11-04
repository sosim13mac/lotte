'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';

const COLORS = ['#FFC94A', '#FBC400', '#69C8F2', '#FF7272', '#B0D840', '#FF5C8A', '#FFFFFF'];

/** 당첨 축하 파티클. burst 값이 바뀔 때마다 다시 터집니다. */
export function Confetti({ burst }: { burst: number }) {
  const reduce = useReducedMotion();
  const particles = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => {
        const angle = (Math.PI * 2 * i) / 36 + Math.random() * 0.4;
        const dist = 90 + Math.random() * 140;
        return {
          id: `${burst}-${i}`,
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist * 0.7 - 40,
          color: COLORS[i % COLORS.length],
          size: 5 + Math.random() * 6,
          round: i % 3 !== 0,
          rotate: Math.random() * 540 - 270,
        };
      }),
    [burst],
  );

  if (!burst || reduce) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center overflow-hidden" aria-hidden>
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-[38%]"
          style={{
            width: p.size,
            height: p.round ? p.size : p.size * 0.45,
            background: p.color,
            borderRadius: p.round ? 999 : 2,
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 160], opacity: [1, 1, 0], rotate: p.rotate, scale: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut', times: [0, 0.45, 1] }}
        />
      ))}
    </div>
  );
}
