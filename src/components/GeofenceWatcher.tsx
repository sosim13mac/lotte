'use client';

import { useEffect } from 'react';
import { boundsAround, distanceMeters, formatDistance, geofenceStep, type GeofenceState, type GeofenceStore, type LatLng } from '@/lib/geo';
import { showLocalNotification } from '@/lib/notify';
import { getRepo } from '@/lib/repo';
import { useAppStore } from '@/store/useAppStore';

const STATE_KEY = 'zzolgit:geofence-state';

function loadState(): GeofenceState {
  try {
    const raw = window.localStorage.getItem(STATE_KEY);
    if (raw) return JSON.parse(raw) as GeofenceState;
  } catch {
    // 무시
  }
  return { inside: [], lastNotified: {} };
}

function saveState(s: GeofenceState) {
  try {
    window.localStorage.setItem(STATE_KEY, JSON.stringify(s));
  } catch {
    // 무시
  }
}

/**
 * 지나가는 길 명당 알림: 앱이 열려 있는 동안 watchPosition 으로 위치를 보고
 * 명당(is_hot) 500m 이내에 '들어서면' 로컬 알림. (브라우저는 백그라운드 위치 추적이 안 되므로
 * 앱을 닫으면 멈춥니다 — Flutter 래핑 후에는 네이티브 지오펜싱으로 대체 가능)
 */
export function GeofenceWatcher() {
  const on = useAppStore((s) => s.geofenceOn);
  const allowed = useAppStore((s) => s.profile?.notify_geofence !== false);
  const showToast = useAppStore((s) => s.showToast);

  useEffect(() => {
    if (!on || !allowed || typeof navigator === 'undefined' || !('geolocation' in navigator)) return;
    let state = loadState();
    let hot: Array<GeofenceStore & { first: number }> = [];
    let fetchedAt: LatLng | null = null;
    let busy = false;

    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        if (busy) return;
        busy = true;
        try {
          const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          // 1.5km 이상 움직이면 주변 3km 명당 목록 갱신
          if (!fetchedAt || distanceMeters(fetchedAt, here) > 1500) {
            fetchedAt = here;
            const stores = await getRepo().listStores({ bounds: boundsAround(here, 3000), hotOnly: true });
            hot = stores
              .filter((s) => s.lat !== null && s.lng !== null)
              .map((s) => ({ code: s.code, name: s.name, lat: s.lat!, lng: s.lng!, first: s.first_win_count }));
          }
          const result = geofenceStep(state, here, hot, Date.now());
          state = result.state;
          saveState(state);
          const nearest = result.entered[0];
          if (nearest) {
            const store = hot.find((h) => h.code === nearest.code);
            const body = `${nearest.name}까지 ${formatDistance(nearest.distance)}${store?.first ? ` · 1등 ${store.first}회 배출` : ''}`;
            showToast(`👑 지나가는 길에 명당! ${body}`);
            void showLocalNotification('지나가는 길에 명당 발견 👑', body, '/map', `geo-${nearest.code}`);
          }
        } finally {
          busy = false;
        }
      },
      (err) => console.warn('[geofence]', err.message),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 30_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [on, allowed, showToast]);

  return null;
}
