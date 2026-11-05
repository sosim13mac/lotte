'use client';

import { Camera, ChartColumn, MapPin, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Disclaimer } from '@/components/Disclaimer';
import { Logo } from '@/components/Logo';
import { LogoMark } from '@/components/LogoMark';
import { authClient } from '@/lib/authClient';
import { GOOGLE_LOGIN, IS_DEMO } from '@/lib/env';
import { isNativeApp, onNativeMessage, postToNative } from '@/lib/nativeBridge';
import { getRepo } from '@/lib/repo';
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

  // Flutter 래핑 앱: 네이티브 구글 로그인 결과(ID 토큰)를 받아 세션 생성
  useEffect(() => {
    if (!isNativeApp()) return;
    return onNativeMessage(async (msg) => {
      if (msg.type === 'google-id-token') {
        const { error: e } = await authClient.signIn.social({
          provider: 'google',
          idToken: { token: msg.idToken, nonce: msg.nonce },
        });
        if (e) {
          setError(e.message ?? '로그인에 실패했어요');
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

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function enterDemo() {
    setBusy(true);
    await getRepo().updateProfile({});
    useAppStore.setState({ status: 'idle' });
    router.replace(next);
  }

  async function signInGoogle() {
    setBusy(true);
    setError(null);
    try {
      if (postToNative({ type: 'google-sign-in' })) return; // 앱이 결과를 보내줄 때까지 대기
      const { error: e } = await authClient.signIn.social({
        provider: 'google',
        callbackURL: `/auth/callback?next=${encodeURIComponent(next)}`,
      });
      if (e) throw new Error(e.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : '로그인에 실패했어요');
      setBusy(false);
    }
  }

  async function submitEmail(ev: React.FormEvent) {
    ev.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res =
        mode === 'signup'
          ? await authClient.signUp.email({ email, password, name: email.split('@')[0] || '회원' })
          : await authClient.signIn.email({ email, password });
      if (res.error) throw new Error(res.error.message || '요청에 실패했어요');
      useAppStore.setState({ status: 'idle' });
      window.location.assign(`/auth/callback?next=${encodeURIComponent(next)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '로그인에 실패했어요');
      setBusy(false);
    }
  }

  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 pb-8">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <LogoMark size={160} priority className="animate-floaty mb-6" />
        <Logo className="text-5xl" />
        <p className="mt-3 text-[15px] text-fog-300">
          추천보다 재미있게,
          <br />내 로또 생활을 쫄깃하게 관리해요
        </p>

        <ul className="mt-10 grid w-full grid-cols-2 gap-2 text-left">
          {FEATURES.map(({ Icon, text }) => (
            <li key={text} className="flex items-center gap-2 rounded-2xl bg-ink-800 px-3 py-3 text-[13px] text-fog-300">
              <Icon className="h-4 w-4 shrink-0 text-gold-deep" />
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
        {IS_DEMO ? (
          <button
            onClick={enterDemo}
            disabled={busy}
            className="btn h-14 w-full border border-ink-500 bg-white text-[16px] text-[#1f1f1f] hover:bg-ink-700"
          >
            데모로 둘러보기
          </button>
        ) : (
          <>
            <form onSubmit={submitEmail} className="space-y-2">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일"
                className="h-12 w-full rounded-2xl border border-ink-500 bg-ink-800 px-4 text-[15px] outline-none focus:border-gold"
              />
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 (8자 이상)"
                className="h-12 w-full rounded-2xl border border-ink-500 bg-ink-800 px-4 text-[15px] outline-none focus:border-gold"
              />
              <button type="submit" disabled={busy} className="btn-gold h-14 w-full text-[16px]">
                {busy ? '처리 중…' : mode === 'signup' ? '회원가입' : '로그인'}
              </button>
            </form>
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError(null);
              }}
              className="w-full text-center text-[13px] text-fog-300 underline"
            >
              {mode === 'login' ? '처음이세요? 회원가입' : '이미 계정이 있어요 · 로그인'}
            </button>
            {GOOGLE_LOGIN && (
              <button
                onClick={signInGoogle}
                disabled={busy}
                className="btn h-14 w-full border border-ink-500 bg-white text-[16px] text-[#1f1f1f] hover:bg-ink-700"
              >
                <GoogleIcon />
                Google로 시작하기
              </button>
            )}
          </>
        )}
        <p className="text-center text-[11px] text-fog-500">
          만 19세 이상만 이용할 수 있어요 ·{' '}
          <Link href="/privacy" className="underline">
            개인정보 처리방침
          </Link>
        </p>
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
