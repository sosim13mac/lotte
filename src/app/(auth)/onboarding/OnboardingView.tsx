'use client';

import { Cake } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Ball } from '@/components/lotto/Ball';
import { Logo } from '@/components/Logo';
import { Splash } from '@/components/Splash';
import { ageFrom, toKSTDateString } from '@/lib/format';
import { birthdayNumber } from '@/lib/lotto/birthday';
import { MIN_AGE } from '@/lib/lotto/constants';
import { useAppStore } from '@/store/useAppStore';

export function OnboardingView({ next }: { next: string }) {
  const router = useRouter();
  const status = useAppStore((s) => s.status);
  const profile = useAppStore((s) => s.profile);
  const bootstrap = useAppStore((s) => s.bootstrap);
  const saveProfile = useAppStore((s) => s.saveProfile);

  const [birth, setBirth] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (status === 'unauthenticated' || status === 'guest') router.replace('/login');
    if (status === 'ready' && profile?.birth_date) router.replace(next);
  }, [status, profile, next, router]);

  const today = toKSTDateString(new Date());
  const lucky = useMemo(() => birthdayNumber(birth), [birth]);
  const age = birth ? ageFrom(birth) : null;
  const tooYoung = age !== null && age < MIN_AGE;
  const invalid = Boolean(birth) && (birth > today || birth < '1900-01-01');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!birth || tooYoung || invalid) return;
    setBusy(true);
    setError(null);
    try {
      await saveProfile({ birth_date: birth });
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장하지 못했어요');
      setBusy(false);
    }
  }

  if (status !== 'ready' || profile?.birth_date) return <Splash />;

  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 pb-8">
      <div className="pt-10">
        <Logo className="text-2xl" />
        <h1 className="mt-6 font-display text-[28px] leading-snug">
          생년월일을
          <br />
          알려주세요
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-fog-300">
          생일수 <span className="text-fog">(년+월+일) % 45 + 1</span> 를 계산해 추천 번호의 &lsquo;이유&rsquo;로
          붙여드려요. 그 외 용도로는 쓰지 않아요.
        </p>
      </div>

      <form onSubmit={submit} className="mt-8 flex flex-1 flex-col">
        <label htmlFor="birth" className="label">
          생년월일
        </label>
        <input
          id="birth"
          type="date"
          className="input"
          value={birth}
          min="1900-01-01"
          max={today}
          required
          onChange={(e) => setBirth(e.target.value)}
        />

        <div className="card mt-6 flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-gold-deep">
            <Cake className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <p className="text-sm text-fog-300">내 생일수</p>
            <p className="text-[13px] text-fog-500">
              {lucky ? `${birth.replaceAll('-', '.')} → ${lucky}` : '생년월일을 입력하면 바로 계산돼요'}
            </p>
          </div>
          <Ball n={lucky} hidden={!lucky} size="lg" />
        </div>

        {tooYoung && (
          <p role="alert" className="mt-4 rounded-2xl bg-gain/10 px-4 py-3 text-sm text-gain">
            만 {MIN_AGE}세 미만은 복권을 구매할 수 없어 이용이 제한돼요.
          </p>
        )}
        {invalid && <p className="mt-4 text-sm text-gain">올바른 날짜를 입력해 주세요.</p>}
        {error && <p className="mt-4 text-sm text-gain">{error}</p>}

        <div className="flex-1" />
        <button type="submit" className="btn-gold mt-8 h-14 w-full" disabled={!birth || tooYoung || invalid || busy}>
          {busy ? '저장 중…' : '로또당 시작하기'}
        </button>
      </form>
    </main>
  );
}
