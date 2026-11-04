'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { BudgetWatcher } from '@/components/BudgetWatcher';
import { GeofenceWatcher } from '@/components/GeofenceWatcher';
import { Splash } from '@/components/Splash';
import { Toaster } from '@/components/Toaster';
import { IS_DEMO } from '@/lib/env';
import { latestDrawnRound } from '@/lib/lotto/round';
import { listenNativePushToken } from '@/lib/push';
import { useAppStore } from '@/store/useAppStore';

/** 로그인/온보딩 가드 + 데이터 부트스트랩 + 하단 탭 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const profile = useAppStore((s) => s.profile);
  const tickets = useAppStore((s) => s.tickets);
  const draws = useAppStore((s) => s.draws);
  const bootstrap = useAppStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // Flutter 앱이 보내는 FCM 토큰 자동 등록
  useEffect(() => (status === 'ready' ? listenNativePushToken() : undefined), [status]);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    else if (status === 'ready' && !profile?.birth_date) router.replace('/onboarding');
  }, [status, profile, router]);

  // 추첨이 끝났는데 아직 안 열어본 티켓 수 → 티켓로그 탭 배지
  const sealed = useMemo(() => {
    const latest = latestDrawnRound();
    return tickets.filter((t) => !t.opened_at && t.round <= latest && draws[t.round]).length;
  }, [tickets, draws]);

  if (status === 'error') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="font-display text-xl">데이터를 불러오지 못했어요</p>
        <p className="text-sm text-fog-300">{error}</p>
        <button className="btn-gold" onClick={() => void bootstrap({ force: true })}>
          다시 시도
        </button>
      </div>
    );
  }

  if (status !== 'ready' || !profile?.birth_date) return <Splash />;

  return (
    <>
      {IS_DEMO && (
        <div className="pt-safe bg-chewy/15 text-center text-[11px] font-medium text-chewy-soft">
          <div className="py-1.5">데모 모드 · 샘플 데이터로 동작 중 (Supabase 미설정)</div>
        </div>
      )}
      <main className="mx-auto min-h-dvh max-w-[480px] overflow-x-clip px-4 pb-[calc(96px+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <BottomNav badges={{ '/logs': sealed }} />
      <Toaster />
      <BudgetWatcher />
      <GeofenceWatcher />
    </>
  );
}
