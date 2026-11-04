'use client';

import { Crown, Heart, Navigation, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { distanceMeters, formatDistance, storeOpenState, type LatLng } from '@/lib/geo';
import type { Store } from '@/lib/repo';
import { useAppStore } from '@/store/useAppStore';

const OPEN_LABEL = { open: '영업중', closed: '영업 종료', unknown: '판매중 · 시간 미확인' } as const;

export function openLabel(store: Store, now = new Date()) {
  const state = storeOpenState(store, now);
  const hours =
    store.open_time && store.close_time
      ? store.open_time === store.close_time
        ? '24시간'
        : `${store.open_time.slice(0, 5)}~${store.close_time.slice(0, 5)}`
      : null;
  return { state, text: hours ? `${OPEN_LABEL[state]} · ${hours}` : OPEN_LABEL[state] };
}

export function FavoriteButton({ store, className }: { store: Store; className?: string }) {
  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const on = favorites.some((f) => f.code === store.code);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void toggleFavorite(store);
      }}
      aria-pressed={on}
      aria-label={on ? `${store.name} 단골 해제` : `${store.name} 단골 등록`}
      className={cn('rounded-full p-2 transition hover:bg-ink-700', className)}
    >
      <Heart className={cn('h-5 w-5', on ? 'fill-chewy text-chewy' : 'text-fog-400')} />
    </button>
  );
}

/** 선택한 판매점 상세 */
export function StoreCard({ store, from, onClose }: { store: Store; from: LatLng | null; onClose: () => void }) {
  const open = openLabel(store);
  const dist = from && store.lat !== null && store.lng !== null ? distanceMeters(from, { lat: store.lat, lng: store.lng }) : null;
  const route =
    store.lat !== null && store.lng !== null
      ? `https://map.kakao.com/link/to/${encodeURIComponent(store.name)},${store.lat},${store.lng}`
      : `https://map.kakao.com/?q=${encodeURIComponent(store.address ?? store.name)}`;

  return (
    <section className={cn('card relative', store.is_hot && 'border-gold/40')}>
      <button className="absolute right-3 top-3 rounded-full p-1.5 text-fog-400 hover:bg-ink-700" onClick={onClose} aria-label="닫기">
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
            store.is_hot ? 'bg-gold text-ink' : 'bg-ink-700 text-fog-300',
          )}
        >
          <Crown className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          {store.is_hot && <p className="text-[11px] font-bold text-gold">명당</p>}
          <p className="truncate font-bold">{store.name}</p>
          <p className="mt-0.5 text-xs text-fog-400">{store.address}</p>
        </div>
      </div>
      <dl className="num mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-2xl bg-ink-700/60 py-2">
          <dt className="text-fog-400">1등</dt>
          <dd className="text-base font-bold">{store.first_win_count}회</dd>
        </div>
        <div className="rounded-2xl bg-ink-700/60 py-2">
          <dt className="text-fog-400">2등</dt>
          <dd className="text-base font-bold">{store.second_win_count}회</dd>
        </div>
        <div className="rounded-2xl bg-ink-700/60 py-2">
          <dt className="text-fog-400">거리</dt>
          <dd className="text-base font-bold">{dist === null ? '-' : formatDistance(dist)}</dd>
        </div>
      </dl>
      <p className={cn('mt-3 text-xs', open.state === 'closed' ? 'text-fog-500' : 'text-fog-300')}>{open.text}</p>
      <div className="mt-3 flex gap-2">
        <a href={route} target="_blank" rel="noopener noreferrer" className="btn-ghost flex-1">
          <Navigation className="h-4 w-4" /> 길찾기
        </a>
        <div className="btn-ghost flex-1 p-0">
          <FavoriteButton store={store} className="w-full rounded-2xl" />
        </div>
      </div>
    </section>
  );
}
