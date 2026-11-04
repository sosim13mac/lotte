'use client';

import { useEffect, useRef } from 'react';
import { markerElement, meElement } from '@/components/map/pins';
import type { Bounds, LatLng } from '@/lib/geo';
import { loadKakaoMaps } from '@/lib/kakaoMap';
import type { Store } from '@/lib/repo';

/** 카카오맵 + 판매점 마커 (is_hot 은 금색 왕관) */
export function KakaoStoreMap({
  center,
  me,
  stores,
  selectedCode,
  onSelect,
  onBoundsChange,
  onError,
}: {
  center: LatLng;
  me: LatLng | null;
  stores: Store[];
  selectedCode: string | null;
  onSelect: (s: Store) => void;
  onBoundsChange: (b: Bounds, center: LatLng) => void;
  onError: (message: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const overlays = useRef<kakao.maps.CustomOverlay[]>([]);
  const meOverlay = useRef<kakao.maps.CustomOverlay | null>(null);
  const handlers = useRef({ onSelect, onBoundsChange, onError });
  handlers.current = { onSelect, onBoundsChange, onError };

  useEffect(() => {
    let cancelled = false;
    loadKakaoMaps()
      .then((maps) => {
        if (cancelled || !box.current) return;
        const map = new maps.Map(box.current, { center: new maps.LatLng(center.lat, center.lng), level: 5 });
        mapRef.current = map;
        const report = () => {
          const b = map.getBounds();
          const sw = b.getSouthWest();
          const ne = b.getNorthEast();
          const c = map.getCenter();
          handlers.current.onBoundsChange(
            { swLat: sw.getLat(), swLng: sw.getLng(), neLat: ne.getLat(), neLng: ne.getLng() },
            { lat: c.getLat(), lng: c.getLng() },
          );
        };
        maps.event.addListener(map, 'idle', report);
        report();
      })
      .catch((e: Error) => handlers.current.onError(e.message));
    return () => {
      cancelled = true;
    };
    // 지도는 한 번만 생성
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (map && window.kakao) map.panTo(new window.kakao.maps.LatLng(center.lat, center.lng));
  }, [center]);

  useEffect(() => {
    const map = mapRef.current;
    const maps = window.kakao?.maps;
    if (!map || !maps) return;
    overlays.current.forEach((o) => o.setMap(null));
    overlays.current = stores
      .filter((s) => s.lat !== null && s.lng !== null)
      .map(
        (s) =>
          new maps.CustomOverlay({
            map,
            position: new maps.LatLng(s.lat!, s.lng!),
            content: markerElement(s, s.code === selectedCode, () => handlers.current.onSelect(s)),
            yAnchor: 1,
            zIndex: s.code === selectedCode ? 10 : s.is_hot ? 3 : 2,
            clickable: true,
          }),
      );
  }, [stores, selectedCode]);

  useEffect(() => {
    const map = mapRef.current;
    const maps = window.kakao?.maps;
    meOverlay.current?.setMap(null);
    if (!map || !maps || !me) return;
    meOverlay.current = new maps.CustomOverlay({ map, position: new maps.LatLng(me.lat, me.lng), content: meElement(), zIndex: 20 });
  }, [me]);

  return <div ref={box} className="h-full w-full" role="application" aria-label="판매점 지도" />;
}
