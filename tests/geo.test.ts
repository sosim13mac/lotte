import { describe, expect, it } from 'vitest';
import { boundsAround, distanceMeters, formatDistance, geofenceStep, storeOpenState, type GeofenceState } from '@/lib/geo';

const kst = (s: string) => new Date(`${s}+09:00`);
const hongdae = { lat: 37.5546, lng: 126.9229 };

describe('거리', () => {
  it('홍대입구 ↔ 합정 약 1km', () => {
    const d = distanceMeters(hongdae, { lat: 37.5496, lng: 126.9139 });
    expect(d).toBeGreaterThan(900);
    expect(d).toBeLessThan(1000);
  });
  it('범위', () => {
    const b = boundsAround(hongdae, 1000);
    expect(distanceMeters(hongdae, { lat: b.neLat, lng: hongdae.lng })).toBeCloseTo(1000, -1);
  });
  it('표시', () => {
    expect(formatDistance(347)).toBe('350m');
    expect(formatDistance(1530)).toBe('1.5km');
  });
});

describe('영업중', () => {
  const store = { open_time: '09:00:00', close_time: '22:00:00' };
  it('영업시간 안 + 로또 판매 시간', () => {
    expect(storeOpenState(store, kst('2026-11-04T12:00:00'))).toBe('open');
    expect(storeOpenState(store, kst('2026-11-04T23:00:00'))).toBe('closed');
  });
  it('토요일 20시 이후는 로또 판매 마감', () => {
    expect(storeOpenState({ open_time: '00:00', close_time: '00:00' }, kst('2026-10-31T20:10:00'))).toBe('closed');
  });
  it('24시간 / 자정 넘김 / 정보 없음', () => {
    expect(storeOpenState({ open_time: '00:00', close_time: '00:00' }, kst('2026-11-04T07:00:00'))).toBe('open');
    expect(storeOpenState({ open_time: '18:00', close_time: '02:00' }, kst('2026-11-04T23:30:00'))).toBe('open');
    expect(storeOpenState({}, kst('2026-11-04T12:00:00'))).toBe('unknown');
  });
});

describe('지오펜스 (500m 진입 알림)', () => {
  const hot = [
    { code: '1100101', name: '행운편의점 홍대점', ...hongdae },
    { code: '1100109', name: '네잎클로버 공덕점', lat: 37.5446, lng: 126.9516 },
  ];
  const empty: GeofenceState = { inside: [], lastNotified: {} };
  const t0 = 1_800_000_000_000;

  it('반경 밖 → 안으로 들어오면 1번 알림', () => {
    const far = { lat: 37.566, lng: 126.92 }; // 약 1.3km
    const s1 = geofenceStep(empty, far, hot, t0);
    expect(s1.entered).toEqual([]);
    const near = { lat: 37.5535, lng: 126.9229 }; // 약 120m
    const s2 = geofenceStep(s1.state, near, hot, t0 + 60_000);
    expect(s2.entered.map((e) => e.code)).toEqual(['1100101']);
    // 계속 안에 있으면 다시 알리지 않음
    const s3 = geofenceStep(s2.state, { lat: 37.5538, lng: 126.923 }, hot, t0 + 120_000);
    expect(s3.entered).toEqual([]);
  });

  it('나갔다 바로 다시 들어와도 12시간 쿨다운', () => {
    const near = { lat: 37.5535, lng: 126.9229 };
    const a = geofenceStep(empty, near, hot, t0);
    const out = geofenceStep(a.state, { lat: 37.57, lng: 126.92 }, hot, t0 + 60_000);
    expect(out.state.inside).toEqual([]);
    expect(geofenceStep(out.state, near, hot, t0 + 3_600_000).entered).toEqual([]);
    expect(geofenceStep(out.state, near, hot, t0 + 13 * 3_600_000).entered).toHaveLength(1);
  });

  it('경계(500~600m)에서는 이미 안에 있던 곳을 유지 (알림 반복 방지)', () => {
    const near = { lat: 37.5535, lng: 126.9229 };
    const a = geofenceStep(empty, near, hot, t0);
    const edge = { lat: 37.5546 + 0.0049, lng: 126.9229 }; // 약 545m
    expect(geofenceStep(a.state, edge, hot, t0 + 1000).state.inside).toContain('1100101');
    expect(geofenceStep(empty, edge, hot, t0).state.inside).toEqual([]);
  });
});
