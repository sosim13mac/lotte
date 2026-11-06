'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** 게스트 안내: 둘러보기는 되지만 기록은 저장되지 않는다는 점과 로그인 진입점 */
export function GuestBanner() {
  const pathname = usePathname();
  const next = pathname && pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : '';
  return (
    <div className="pt-safe bg-gold/10 lg:ml-56">
      <div className="mx-auto flex max-w-[480px] items-center gap-3 px-4 py-2 text-[12px] md:max-w-3xl lg:max-w-none lg:px-10">
        <p className="flex-1 text-fog-300">로그인 없이 둘러보는 중이에요. 기록은 저장되지 않아요.</p>
        <Link href={`/login${next}`} className="shrink-0 rounded-full bg-gold px-3 py-1 text-[12px] font-bold text-white">
          로그인
        </Link>
      </div>
    </div>
  );
}
