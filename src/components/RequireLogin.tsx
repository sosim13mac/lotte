'use client';

import { Lock } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { useAppStore } from '@/store/useAppStore';

/** 로그인해야 쓸 수 있는 화면 가드: 게스트에게는 이유와 로그인 버튼을 보여줍니다 */
export function RequireLogin({ title, reason, children }: { title: string; reason: string; children: React.ReactNode }) {
  const status = useAppStore((s) => s.status);
  const pathname = usePathname();
  if (status !== 'guest') return <>{children}</>;
  return (
    <div className="space-y-4">
      <PageHeader title={title} />
      <section className="card flex flex-col items-center gap-3 py-10 text-center">
        <Lock className="h-8 w-8 text-gold-deep" />
        <p className="font-display text-lg">로그인이 필요해요</p>
        <p className="text-sm text-fog-300">{reason}</p>
        <Link href={`/login?next=${encodeURIComponent(pathname ?? '/')}`} className="btn-gold mt-2">
          로그인 / 가입하기
        </Link>
        <Link href="/" className="text-xs text-fog-400 hover:text-fog">
          홈에서 번호 뽑기 계속하기
        </Link>
      </section>
    </div>
  );
}
