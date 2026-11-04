'use client';

import { useState } from 'react';
import { ensureNotificationPermission } from '@/lib/notify';
import { useAppStore } from '@/store/useAppStore';

export function getPosition(timeout = 15_000): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) reject(new Error('이 기기는 위치를 지원하지 않아요'));
    else navigator.geolocation.getCurrentPosition(resolve, reject, { timeout, maximumAge: 60_000 });
  });
}

/** '지나가는 길 명당 알림' 켜기/끄기 (사용자 탭 → 위치·알림 권한 요청) */
export function useGeofenceToggle() {
  const on = useAppStore((s) => s.geofenceOn);
  const profile = useAppStore((s) => s.profile);
  const setGeofenceOn = useAppStore((s) => s.setGeofenceOn);
  const saveProfile = useAppStore((s) => s.saveProfile);
  const showToast = useAppStore((s) => s.showToast);
  const [busy, setBusy] = useState(false);
  const active = on && profile?.notify_geofence !== false;

  async function toggle() {
    if (busy) return;
    if (active) {
      setGeofenceOn(false);
      showToast('지나가는 길 알림을 껐어요');
      return;
    }
    setBusy(true);
    try {
      await getPosition();
      await ensureNotificationPermission();
      setGeofenceOn(true);
      if (profile?.notify_geofence === false) await saveProfile({ notify_geofence: true });
      showToast('명당 500m 안에 들어서면 알려드릴게요 (앱이 열려 있는 동안)');
    } catch {
      showToast('위치 권한이 필요해요. 브라우저 설정에서 허용해 주세요', 'warning');
    } finally {
      setBusy(false);
    }
  }

  return { active, busy, toggle };
}
