import { Ball, type BallSize } from '@/components/lotto/Ball';
import { GAME_LABELS, LOTTO_PICK } from '@/lib/lotto/constants';

/** A~E 한 줄 (번호가 6개 미만이면 빈 자리는 ? 로) */
export function GameRow({ index, game, size = 'sm', right }: { index: number; game: number[]; size?: BallSize; right?: React.ReactNode }) {
  const slots = Array.from({ length: LOTTO_PICK }, (_, i) => game[i] ?? null);
  return (
    <div className="flex items-center gap-2">
      <span className="w-4 text-center text-xs font-bold text-fog-400">{GAME_LABELS[index]}</span>
      <div className="flex flex-1 gap-1">
        {slots.map((n, i) => (
          <Ball key={i} n={n} hidden={n === null} size={size} />
        ))}
      </div>
      {right}
    </div>
  );
}
