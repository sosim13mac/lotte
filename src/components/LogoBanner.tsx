import Image from 'next/image';
import { cn } from '@/lib/cn';

/** 로고 시트 9번: 캐릭터 + 로또당 가로형 배너 (public/brand/logo-banner.png) */
export function LogoBanner({ height = 44, className, priority = false }: { height?: number; className?: string; priority?: boolean }) {
  const ratio = 669 / 263;
  return (
    <Image
      src="/brand/logo-banner.png"
      alt="로또당"
      width={Math.round(height * ratio)}
      height={height}
      priority={priority}
      className={cn('w-auto', className)}
      style={{ height }}
    />
  );
}
