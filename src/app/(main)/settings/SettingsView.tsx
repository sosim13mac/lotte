'use client';

import { Cake, Crown, LogOut, MapPin, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Disclaimer } from '@/components/Disclaimer';
import { Ball } from '@/components/lotto/Ball';
import { FavoriteButton } from '@/components/map/StoreCard';
import { useGeofenceToggle } from '@/components/map/useGeofenceToggle';
import { PageHeader } from '@/components/PageHeader';
import { BudgetCard } from '@/components/stats/BudgetCard';
import { Switch } from '@/components/Switch';
import { IS_DEMO } from '@/lib/env';
import { enablePush, PUSH_CONFIGURED } from '@/lib/push';
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
  const favorites = useAppStore((s) => s.favorites);
  const showToast = useAppStore((s) => s.showToast);
  const geofence = useGeofenceToggle();
  const [pushBusy, setPushBusy] = useState(false);

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

  /** 푸시 알림 토글: 켤 때 FCM 토큰 등록 → 설정 저장 */
  async function togglePush(key: 'notify_favorite_win' | 'notify_draw_result', next: boolean) {
    setPushBusy(true);
    try {
      if (next) {
        const r = await enablePush();
        if (!r.ok) {
          showToast(r.message ?? '푸시를 켜지 못했어요', 'warning');
          return;
        }
        if (r.message) showToast(r.message);
      }
      await saveProfile({ [key]: next });
    } finally {
      setPushBusy(false);
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

      <div className="mt-4">
        <BudgetCard />
      </div>

      <section className="card mt-4 divide-y divide-white/5 py-2">
        <h2 className="section-title pb-2 pt-1">알림</h2>
        <Switch
          label="지나가는 길 명당 알림"
          description="명당 500m 안에 들어서면 알려드려요 (앱이 열려 있는 동안 위치 확인)"
          checked={geofence.active}
          disabled={geofence.busy}
          onChange={() => void geofence.toggle()}
        />
        <Switch
          label="단골점 당첨 푸시"
          description="내 단골점에서 1·2등이 나오면 알려드려요"
          checked={profile?.notify_favorite_win ?? true}
          disabled={pushBusy}
          onChange={(v) => void togglePush('notify_favorite_win', v)}
        />
        <Switch
          label="내 회차 결과 푸시"
          description="토요일 추첨 후 결과가 나오면 알려드려요 (번호는 앱에서 쫄깃하게 공개)"
          checked={profile?.notify_draw_result ?? true}
          disabled={pushBusy}
          onChange={(v) => void togglePush('notify_draw_result', v)}
        />
        {!PUSH_CONFIGURED && !IS_DEMO && (
          <p className="pt-3 text-xs text-fog-500">FCM 설정(NEXT_PUBLIC_FIREBASE_*)이 없어 푸시는 아직 꺼져 있어요.</p>
        )}
      </section>

      <section className="card mt-4">
        <h2 className="section-title">내 단골점</h2>
        {favorites.length ? (
          <ul className="mt-2">
            {favorites.map((f) => (
              <li key={f.code} className="flex items-center gap-3 py-2">
                <span className={f.is_hot ? 'text-gold' : 'text-fog-500'} aria-label={f.is_hot ? '명당' : undefined}>
                  <Crown className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{f.name}</p>
                  <p className="truncate text-[11px] text-fog-500">{f.address}</p>
                </div>
                <FavoriteButton store={f} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-fog-400">아직 단골점이 없어요.</p>
        )}
        <Link href="/map" className="btn-ghost btn-sm mt-3 w-full">
          <MapPin className="h-4 w-4" /> 명당 지도에서 찾기
        </Link>
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
