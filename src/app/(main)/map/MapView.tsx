'use client';

import { Crown, LocateFixed, Radar } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KakaoStoreMap } from '@/components/map/KakaoStoreMap';
import { FavoriteButton, openLabel, StoreCard } from '@/components/map/StoreCard';
import { StoreRadar } from '@/components/map/StoreRadar';
import { getPosition, useGeofenceToggle } from '@/components/map/useGeofenceToggle';
import { PageHeader } from '@/components/PageHeader';
import { cn } from '@/lib/cn';
import { boundsAround, distanceMeters, formatDistance, type Bounds, type LatLng } from '@/lib/geo';
import { KAKAO_JS_KEY } from '@/lib/kakaoMap';
import { getRepo, type DrawCoverage, type Store } from '@/lib/repo';
import { useAppStore } from '@/store/useAppStore';

type Filter = 'all' | 'hot' | 'open';
const FILTERS: Array<[Filter, string]> = [
  ['all', '전체'],
  ['hot', '명당만'],
  ['open', '영업중'],
];

/** 홍대입구역 (위치 권한이 없을 때 기본 중심) */
const DEFAULT_CENTER: LatLng = { lat: 37.5563, lng: 126.9236 };

export function MapView() {
  const showToast = useAppStore((s) => s.showToast);
  const geofence = useGeofenceToggle();
  const [filter, setFilter] = useState<Filter>('all');
  const [center, setCenter] = useState<LatLng>(DEFAULT_CENTER);
  const [viewCenter, setViewCenter] = useState<LatLng>(DEFAULT_CENTER);
  const [me, setMe] = useState<LatLng | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [selected, setSelected] = useState<Store | null>(null);
  const [mode, setMode] = useState<'kakao' | 'radar'>(KAKAO_JS_KEY ? 'kakao' : 'radar');
  const [loading, setLoading] = useState(false);
  const [coverage, setCoverage] = useState<DrawCoverage | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getRepo()
      .getDrawCoverage()
      .then(setCoverage)
      .catch(() => {});
  }, []);

  const load = useCallback((bounds: Bounds) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        setStores(await getRepo().listStores({ bounds }));
      } catch {
        // 이전 목록 유지
      } finally {
        setLoading(false);
      }
    }, 250);
  }, []);

  // 이미 위치 권한이 있으면 내 위치에서 시작
  useEffect(() => {
    navigator.permissions
      ?.query({ name: 'geolocation' as PermissionName })
      .then((p) => {
        if (p.state === 'granted') void locate(false);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 간이 지도 모드: 중심 주변 1.5km
  useEffect(() => {
    if (mode === 'radar') {
      setViewCenter(center);
      load(boundsAround(center, 1600));
    }
  }, [mode, center, load]);

  async function locate(announce = true) {
    try {
      const pos = await getPosition();
      const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setMe(here);
      setCenter(here);
    } catch {
      if (announce) showToast('위치 권한이 필요해요', 'warning');
    }
  }

  const from = me ?? viewCenter;
  const now = useMemo(() => new Date(), []);
  const filtered = useMemo(
    () =>
      stores
        .filter((s) => (filter === 'hot' ? s.is_hot : filter === 'open' ? openLabel(s, now).state !== 'closed' : true))
        .map((s) => ({ s, d: s.lat !== null && s.lng !== null ? distanceMeters(from, { lat: s.lat, lng: s.lng }) : Infinity }))
        .sort((a, b) => a.d - b.d),
    [stores, filter, from, now],
  );
  const hotCount = stores.filter((s) => s.is_hot).length;

  return (
    <>
      <PageHeader title="명당 지도" subtitle="주변 로또 판매점과 1등 배출점" />

      <div className="lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-4">
      <button
        type="button"
        role="switch"
        aria-checked={geofence.active}
        disabled={geofence.busy}
        onClick={() => void geofence.toggle()}
        className={cn(
          'mb-3 flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition lg:col-start-2 lg:row-start-1',
          geofence.active ? 'border-gold/40 bg-gold/10' : 'border-ink-600 bg-ink-800',
        )}
      >
        <Radar className={cn('h-5 w-5 shrink-0', geofence.active ? 'text-gold-deep' : 'text-fog-400')} />
        <span className="flex-1">
          <span className="block text-sm font-bold">지나가는 길 명당 알림</span>
          <span className="block text-[11px] text-fog-400">명당 500m 안에 들어서면 알려드려요</span>
        </span>
        <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', geofence.active ? 'bg-gold' : 'bg-ink-600')}>
          <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform', geofence.active ? 'translate-x-6' : 'translate-x-1')} />
        </span>
      </button>

      <div className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
      <div className="mb-3 flex items-center gap-2" role="group" aria-label="필터">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            className={cn('chip px-4 py-1.5 text-sm', filter === key && 'bg-gold font-bold text-deep')}
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
          >
            {key === 'hot' && <Crown className="h-3.5 w-3.5" />}
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-fog-400">{loading ? '불러오는 중…' : `명당 ${hotCount}곳`}</span>
      </div>

      <div className="relative h-[46vh] min-h-[300px] overflow-hidden lg:h-[calc(100dvh-260px)] lg:min-h-[480px] rounded-3xl border border-ink-600 bg-ink-800">
        {mode === 'kakao' ? (
          <KakaoStoreMap
            center={center}
            me={me}
            stores={filtered.map((f) => f.s)}
            selectedCode={selected?.code ?? null}
            onSelect={setSelected}
            onBoundsChange={(b, c) => {
              setViewCenter(c);
              load(b);
            }}
            onError={(msg) => {
              showToast(`${msg} — 간이 지도로 보여드릴게요`, 'warning');
              setMode('radar');
            }}
          />
        ) : (
          <StoreRadar center={viewCenter} me={me} stores={filtered.map((f) => f.s)} selectedCode={selected?.code ?? null} onSelect={setSelected} />
        )}
        <button
          className="absolute bottom-3 right-3 z-20 flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-800/90 text-fog shadow-card backdrop-blur hover:bg-ink-700"
          onClick={() => void locate()}
          aria-label="내 위치로 이동"
        >
          <LocateFixed className="h-5 w-5" />
        </button>
      </div>

      {selected && (
        <div className="mt-3">
          <StoreCard store={selected} from={me} coverage={coverage} onClose={() => setSelected(null)} />
        </div>
      )}
      </div>

      <section className="card mt-3 p-2 lg:col-start-2 lg:row-start-2 lg:mt-0">
        <h2 className="px-3 pb-1 pt-2 text-sm font-bold text-fog-300">
          {me ? '내 주변' : '지도 중심 주변'} {filtered.length}곳
        </h2>
        <ul>
          {filtered.slice(0, 30).map(({ s, d }) => {
            const open = openLabel(s, now);
            return (
              <li key={s.code}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelected(s);
                    if (s.lat !== null && s.lng !== null) setCenter({ lat: s.lat, lng: s.lng });
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && setSelected(s)}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-ink-700/60',
                    selected?.code === s.code && 'bg-ink-700/60',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                      s.is_hot ? 'bg-gold text-deep' : 'bg-ink-700 text-fog-400',
                    )}
                    aria-label={s.is_hot ? '명당' : undefined}
                  >
                    <Crown className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="num truncate text-[11px] text-fog-400">
                      1등 {s.first_win_count} · 2등 {s.second_win_count} · {open.text}
                    </p>
                  </div>
                  <span className="num shrink-0 text-xs text-fog-300">{Number.isFinite(d) ? formatDistance(d) : '-'}</span>
                  <FavoriteButton store={s} />
                </div>
              </li>
            );
          })}
        </ul>
        {!filtered.length && <p className="py-8 text-center text-sm text-fog-400">조건에 맞는 판매점이 없어요</p>}
      </section>
      <p className="mt-3 text-center text-[11px] text-fog-500 lg:col-span-2">
        판매점·배출 기록은 매주 추첨 후 동행복권 1·2등 배출점 정보로 갱신돼요. 명당 = 1등 2회↑ 또는 2등 5회↑
        {coverage && coverage.count > 0 && (
          <>
            <br />
            1·2등 횟수는 저장된 {coverage.count}개 회차({coverage.from}~{coverage.to}회) 안에서만 센 값이며 역대 전체 기록이 아니에요
          </>
        )}
      </p>
      </div>
    </>
  );
}
