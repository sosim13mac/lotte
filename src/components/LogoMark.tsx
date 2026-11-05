import Image from 'next/image';
import { cn } from '@/lib/cn';

/** 로또당 캐릭터 앱 로고 (public/brand/app-logo-*.png) */
export function LogoMark({ size = 96, className, priority = false }: { size?: number; className?: string; priority?: boolean }) {
  return (
    <Image
      src={size > 128 ? '/brand/app-logo-512.png' : '/brand/app-logo-256.png'}
      alt="로또당"
      width={size}
      height={size}
      priority={priority}
      className={cn('rounded-[22.5%] shadow-lg', className)}
    />
  );
}
