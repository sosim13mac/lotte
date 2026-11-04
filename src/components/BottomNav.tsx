'use client';

import { ChartColumn, House, MapPin, Settings, Ticket } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/cn';

const TABS = [
  { href: '/', label: '홈', Icon: House },
  { href: '/logs', label: '티켓로그', Icon: Ticket },
  { href: '/map', label: '명당지도', Icon: MapPin },
  { href: '/stats', label: '가계부', Icon: ChartColumn },
  { href: '/settings', label: '설정', Icon: Settings },
] as const;

export function BottomNav({ badges }: { badges?: Partial<Record<string, number>> }) {
  const pathname = usePathname();
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-ink-600 bg-ink-800/90 backdrop-blur-xl lg:bg-ink-800 lg:inset-y-0 lg:right-auto lg:w-56 lg:border-r lg:border-t-0 lg:pb-0">
      <Logo className="hidden px-7 pt-8 text-[30px] lg:block" />
      <ul className="mx-auto grid max-w-[480px] grid-cols-5 md:max-w-xl lg:flex lg:max-w-none lg:flex-col lg:gap-1 lg:p-4 lg:pt-6">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          const badge = badges?.[href];
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors lg:h-12 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-2xl lg:px-4 lg:text-sm',
                  active ? 'text-gold-deep lg:bg-[#DDF5EB]' : 'text-fog-400 hover:text-fog lg:hover:bg-ink-700',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 1.8} />
                {label}
                {badge ? (
                  <span className="num absolute right-[22%] top-2 lg:right-4 lg:top-1/2 lg:-translate-y-1/2 min-w-[18px] rounded-full bg-chewy px-1 text-center text-[10px] font-bold leading-[18px] text-deep">
                    {badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
