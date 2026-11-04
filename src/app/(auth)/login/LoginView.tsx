'use client';

import { Camera, ChartColumn, MapPin, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Disclaimer } from '@/components/Disclaimer';
import { Ball } from '@/components/lotto/Ball';
import { Logo } from '@/components/Logo';
import { IS_DEMO } from '@/lib/env';
import { isNativeApp, onNativeMessage, postToNative } from '@/lib/nativeBridge';
import { getRepo } from '@/lib/repo';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { useAppStore } from '@/store/useAppStore';

const FEATURES = [
  { Icon: Camera, text: '사진 한 장 자동 등록' },
  { Icon: Sparkles, text: '한 줄씩 쫄깃 오픈' },
  { Icon: ChartColumn, text: '자동 로또 가계부' },
  { Icon: MapPin, text: '주변 명당 지도' },
];

export function LoginView({ next, hasError }: { next: string; hasError: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(hasError ? '로그인에 실패했어요. 다시 시도해 주세요.' : null);

  // Flutter 래핑 앱: 네이티브 구글 로그인 결과(ID 토큰)를 받아 Supabase 세션 생성
  useEffect(() => {
    if (!isNativeApp()) return;
    return onNativeMessage(async (msg) => {
      if (msg.type === 'google-id-token') {
        const { error: e } = await getBrowserSupabase().auth.signInWithIdToken({
          provider: 'google',
          token: msg.idToken,
          nonce: msg.nonce,
        });
        if (e) {
          setError(e.message);
          setBusy(false);
          return;
        }
        useAppStore.setState({ status: 'idle' });
        router.replace(next);
      } else if (msg.type === 'google-sign-in-error') {
        setError(msg.message);
        setBusy(false);
      }
    });
  }, [next, router]);

  async function signIn() {
    setBusy(true);
    setError(null);
    try {
      if (IS_DEMO) {
        await getRepo().updateProfile({});
        useAppStore.setState({ status: 'idle' });
        router.replace(next);
        return;
      }
      if (postToNative({ type: 'google-sign-in' })) return; // 앱이 결과를 보내줄 때까지 대기

      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error: e } = await getBrowserSupabase().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, queryParams: { prompt: 'select_account' } },
      });
      if (e) throw e;
    } catch (e) {
      setError(e instanceof Error ? e.message : '로그인에 실패했어요');
      setBusy(false);
    }
  }

  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 pb-8">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-8 flex gap-2">
          {[7, 12, 19, 28, 33, 42].map((n, i) => (
            <span key={n} className="animate-floaty" style={{ animationDelay: `${i * 0.15}s` }}>
              <Ball n={i % 2 === 0 ? n : null} hidden={i % 2 === 1} size="md" />
            </span>
          ))}
        </div>
        <Logo className="text-5xl" />
        <p className="mt-3 text-[15px] text-fog-300">
          추천보다 재미있게,
          <br />내 로또 생활을 쫄깃하게 관리해요
        </p>

        <ul className="mt-10 grid w-full grid-cols-2 gap-2 text-left">
          {FEATURES.map(({ Icon, text }) => (
            <li key={text} className="flex items-center gap-2 rounded-2xl bg-ink-800 px-3 py-3 text-[13px] text-fog-300">
              <Icon className="h-4 w-4 shrink-0 text-gold" />
              {text}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        {error && (
          <p role="alert" className="rounded-2xl bg-gain/10 px-4 py-3 text-center text-sm text-gain">
            {error}
          </p>
        )}
        <button
          onClick={signIn}
          disabled={busy}
          className="btn h-14 w-full bg-white text-[16px] text-[#1f1f1f] hover:bg-white/90"
        >
          {IS_DEMO ? (
            '데모로 둘러보기'
          ) : (
            <>
              <GoogleIcon />
              {busy ? '구글로 이동 중…' : 'Google로 시작하기'}
            </>
          )}
        </button>
        <p className="text-center text-[11px] text-fog-500">만 19세 이상만 이용할 수 있어요</p>
        <Disclaimer />
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
