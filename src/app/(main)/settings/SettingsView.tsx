'use client';

import { Cake, LogOut, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Disclaimer } from '@/components/Disclaimer';
import { Ball } from '@/components/lotto/Ball';
import { PageHeader } from '@/components/PageHeader';
import { IS_DEMO } from '@/lib/env';
import { ageFrom, toKSTDateString } from '@/lib/format';
import { birthdayNumber } from '@/lib/lotto/birthday';
import { MIN_AGE } from '@/lib/lotto/constants';
import { resetDemoData } from '@/lib/repo/demoRepo';
import { useAppStore } from '@/store/useAppStore';

export function SettingsView() {
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const saveProfile = useAppStore((s) => s.saveProfile);
  const signOut = useAppStore((s) => s.signOut);
  const bootstrap = useAppStore((s) => s.bootstrap);

  const [birth, setBirth] = useState(profile?.birth_date ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const lucky = birthdayNumber(birth);
  const tooYoung = birth ? ageFrom(birth) < MIN_AGE : false;
  const changed = birth !== (profile?.birth_date ?? '');

  async function saveBirth() {
    if (!birth || tooYoung) return;
    setSaving(true);
    try {
      await saveProfile({ birth_date: birth });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await signOut();
    router.replace('/login');
  }

  return (
    <>
      <PageHeader title="설정" />

      <section className="card space-y-4">
        <div>
          <p className="text-xs text-fog-400">로그인 계정</p>
          <p className="mt-1 font-medium">{profile?.email ?? '-'}</p>
          <p className="mt-0.5 text-xs text-fog-500">Google 계정으로 로그인</p>
        </div>

        <div>
          <label htmlFor="birth" className="label">
            생년월일
          </label>
          <div className="flex gap-2">
            <input
              id="birth"
              type="date"
              className="input"
              value={birth}
              min="1900-01-01"
              max={toKSTDateString(new Date())}
              onChange={(e) => setBirth(e.target.value)}
            />
            <button className="btn-ghost shrink-0" disabled={!changed || saving || tooYoung} onClick={saveBirth}>
              {saved ? '저장됨' : '저장'}
            </button>
          </div>
          <p className="mt-2 flex items-center gap-2 text-sm text-fog-300">
            <Cake className="h-4 w-4 text-gold" /> 내 생일수 <Ball n={lucky} hidden={!lucky} size="xs" />
          </p>
          {tooYoung && <p className="mt-1 text-sm text-gain">만 {MIN_AGE}세 이상만 이용할 수 있어요.</p>}
        </div>
      </section>

      <section className="mt-4 space-y-2">
        {IS_DEMO && (
          <button
            className="btn-ghost w-full"
            onClick={async () => {
              resetDemoData();
              await bootstrap({ force: true });
            }}
          >
            <RotateCcw className="h-4 w-4" /> 데모 데이터 초기화
          </button>
        )}
        <button className="btn-ghost w-full text-gain" onClick={logout}>
          <LogOut className="h-4 w-4" /> {IS_DEMO ? '데모 종료' : '구글 로그아웃'}
        </button>
      </section>

      <Disclaimer className="mt-8" />
      <p className="mt-2 text-center text-[11px] text-fog-500">쫄깃로또 v0.1.0</p>
    </>
  );
}
