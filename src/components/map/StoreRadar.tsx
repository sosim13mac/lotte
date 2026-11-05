'use client';

import { CROWN_PIN, STORE_PIN } from '@/components/map/pins';
import type { LatLng } from '@/lib/geo';
import { GEOFENCE_RADIUS } from '@/lib/geo';
import type { Store } from '@/lib/repo';

const RANGE = 1500; // 중심에서 ±1.5km

/** 카카오맵 키가 없을 때 쓰는 간이 지도 (북쪽이 위, 단위 m) */
export function StoreRadar({
  center,
  me,
  stores,
  selectedCode,
  onSelect,
}: {
  center: LatLng;
  me: LatLng | null;
  stores: Store[];
  selectedCode: string | null;
  onSelect: (s: Store) => void;
}) {
  const toXY = (p: LatLng) => ({
    x: (p.lng - center.lng) * 111_320 * Math.cos((center.lat * Math.PI) / 180),
    y: -(p.lat - center.lat) * 110_540,
  });
  const visible = stores.filter((s) => s.lat !== null && s.lng !== null);
  const meXY = me ? toXY(me) : null;

  return (
    <div className="relative h-full w-full bg-[radial-gradient(circle_at_center,#FFFFFF,#DCE9FF)]">
      <svg viewBox={`${-RANGE} ${-RANGE} ${RANGE * 2} ${RANGE * 2}`} className="h-full w-full" role="img" aria-label="주변 판매점 간이 지도">
        <circle r={1000} fill="none" stroke="#B7CFF5" strokeWidth={6} />
        <circle r={GEOFENCE_RADIUS} fill="rgba(31,99,224,0.06)" stroke="rgba(31,99,224,0.5)" strokeWidth={6} />
        <line x1={-RANGE} x2={RANGE} y1={0} y2={0} stroke="#B7CFF5" strokeWidth={4} />
        <line y1={-RANGE} y2={RANGE} x1={0} x2={0} stroke="#B7CFF5" strokeWidth={4} />
        <text x={0} y={-GEOFENCE_RADIUS - 30} textAnchor="middle" className="fill-gold-soft" fontSize={70}>
          500m
        </text>
        <text x={0} y={-1000 - 30} textAnchor="middle" className="fill-fog-500" fontSize={70}>
          1km
        </text>
        {meXY && <circle cx={meXY.x} cy={meXY.y} r={45} fill="#3987e5" stroke="#fff" strokeWidth={16} />}
      </svg>
      {visible.map((s) => {
        const { x, y } = toXY({ lat: s.lat!, lng: s.lng! });
        if (Math.abs(x) > RANGE || Math.abs(y) > RANGE) return null;
        return (
          <button
            key={s.code}
            type="button"
            className={`zz-marker absolute -translate-x-1/2 -translate-y-full${s.code === selectedCode ? ' zz-selected' : ''}`}
            style={{ left: `${((x + RANGE) / (RANGE * 2)) * 100}%`, top: `${((y + RANGE) / (RANGE * 2)) * 100}%`, zIndex: s.code === selectedCode ? 10 : s.is_hot ? 3 : 2 }}
            aria-label={`${s.name}${s.is_hot ? ' (명당)' : ''}`}
            onClick={() => onSelect(s)}
          >
            <span className="zz-pinwrap">
              <span className="zz-pin" dangerouslySetInnerHTML={{ __html: s.is_hot ? CROWN_PIN : STORE_PIN }} />
              <span className={`zz-label${s.is_hot ? ' zz-label-hot' : ''}`}>{s.name}</span>
            </span>
          </button>
        );
      })}
      <p className="absolute bottom-2 left-3 text-[10px] text-fog-500">간이 지도 · 카카오맵 키를 설정하면 실제 지도가 보여요</p>
    </div>
  );
}
