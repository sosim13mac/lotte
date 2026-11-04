/** 위치 계산 · 영업중 판단 · 지오펜스 (순수 함수) */
import { isLottoOnSale } from '@/lib/lotto/round';

export interface LatLng {
  lat: number;
  lng: number;
}

const R = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;

/** 두 좌표 사이 거리 (m) */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10}m` : `${(m / 1000).toFixed(1)}km`;
}

export interface Bounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

/** 중심에서 반경 radius(m) 를 덮는 사각 범위 */
export function boundsAround(c: LatLng, radius: number): Bounds {
  const dLat = (radius / R) * (180 / Math.PI);
  const dLng = dLat / Math.cos(rad(c.lat));
  return { swLat: c.lat - dLat, swLng: c.lng - dLng, neLat: c.lat + dLat, neLng: c.lng + dLng };
}

const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

export type OpenState = 'open' | 'closed' | 'unknown';

/**
 * [영업중] 판단: 로또 판매 시간(토 20:00~일 06:00, 매일 0~6시 판매 없음) 이면서
 * 판매점 영업시간 안. 영업시간 정보가 없으면 로또 판매 시간만으로 판단('unknown' 이지만 영업중 필터에는 포함).
 */
export function storeOpenState(
  store: { open_time?: string | null; close_time?: string | null },
  now: Date = new Date(),
): OpenState {
  if (!isLottoOnSale(now)) return 'closed';
  if (!store.open_time || !store.close_time) return 'unknown';
  const open = toMinutes(store.open_time);
  const close = toMinutes(store.close_time);
  if (open === close) return 'open'; // 24시간
  const kst = new Date(now.getTime() + 9 * 3_600_000);
  const cur = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  const inside = open < close ? cur >= open && cur < close : cur >= open || cur < close; // 자정 넘김
  return inside ? 'open' : 'closed';
}

export interface GeofenceStore extends LatLng {
  code: string;
  name: string;
}

export interface GeofenceState {
  /** 지금 반경 안에 있는 판매점 */
  inside: string[];
  /** 판매점별 마지막 알림 시각(ms) */
  lastNotified: Record<string, number>;
}

export const GEOFENCE_RADIUS = 500;
export const GEOFENCE_COOLDOWN = 12 * 3_600_000;

/**
 * 위치가 갱신될 때마다 호출. 반경 밖 → 안으로 '진입'한 명당만 알림 (같은 곳은 12시간에 한 번).
 * 경계에서 흔들려 알림이 반복되지 않게 나갈 때는 반경 + 100m 를 기준으로 판단합니다.
 */
export function geofenceStep(
  state: GeofenceState,
  position: LatLng,
  stores: readonly GeofenceStore[],
  now: number,
  radius = GEOFENCE_RADIUS,
): { state: GeofenceState; entered: Array<GeofenceStore & { distance: number }> } {
  const wasInside = new Set(state.inside);
  const inside: string[] = [];
  const entered: Array<GeofenceStore & { distance: number }> = [];
  const lastNotified = { ...state.lastNotified };

  for (const s of stores) {
    const d = distanceMeters(position, s);
    const limit = wasInside.has(s.code) ? radius + 100 : radius;
    if (d > limit) continue;
    inside.push(s.code);
    if (wasInside.has(s.code)) continue;
    if (now - (lastNotified[s.code] ?? 0) < GEOFENCE_COOLDOWN) continue;
    lastNotified[s.code] = now;
    entered.push({ ...s, distance: d });
  }
  entered.sort((a, b) => a.distance - b.distance);
  return { state: { inside, lastNotified }, entered };
}
