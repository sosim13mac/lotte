'use client';

import { useState } from 'react';
import { ChartCard } from '@/components/stats/ChartCard';
import { formatWon } from '@/lib/format';
import type { LedgerHeatCell } from '@/lib/ledger';

const DAYS = [1, 2, 3, 4, 5, 6, 0]; // 월 ~ 일
const DAY_LABEL = ['일', '월', '화', '수', '목', '금', '토'];
const SLOTS = ['0~4시', '4~8시', '8~12시', '12~16시', '16~20시', '20~24시'];
const SLOT_SHORT = ['0', '4', '8', '12', '16', '20'];
const RAMP = ['var(--viz-seq-0)', 'var(--viz-seq-1)', 'var(--viz-seq-2)', 'var(--viz-seq-3)', 'var(--viz-seq-4)', 'var(--viz-seq-5)'];

/** 요일 x 시간대 구매 횟수 히트맵 (순차 한 색) */
export function WeekdayHeatmap({ cells }: { cells: LedgerHeatCell[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const byKey = new Map(cells.map((c) => [`${c.dow}-${c.slot}`, c]));
  const max = Math.max(0, ...cells.map((c) => c.count));
  const peak = cells.reduce<LedgerHeatCell | null>((best, c) => (!best || c.count > best.count ? c : best), null);
  const bin = (count: number) => (count <= 0 || max === 0 ? 0 : Math.max(1, Math.ceil((count / max) * 5)));
  const hovered = hover ? byKey.get(hover) : null;
  const [hoverDow, hoverSlot] = hover ? hover.split('-').map(Number) : [null, null];

  const chart = (
    <div>
      <div className="grid grid-cols-[24px_repeat(6,minmax(0,1fr))] gap-[2px]" role="grid" aria-label="요일별 시간대 구매 횟수">
        <span />
        {SLOT_SHORT.map((s) => (
          <span key={s} className="num pb-1 text-center text-[10px] text-fog-400">
            {s}시
          </span>
        ))}
        {DAYS.map((dow) => (
          <div key={dow} className="contents" role="row">
            <span className="flex items-center text-[11px] text-fog-300">{DAY_LABEL[dow]}</span>
            {SLOTS.map((_, slot) => {
              const key = `${dow}-${slot}`;
              const c = byKey.get(key);
              const count = c?.count ?? 0;
              const isPeak = peak && peak.count > 0 && peak.dow === dow && peak.slot === slot;
              return (
                <button
                  key={key}
                  type="button"
                  role="gridcell"
                  className="aspect-[1.6] rounded-[4px] outline-none ring-fog/70 transition focus-visible:ring-2"
                  style={{
                    background: RAMP[bin(count)],
                    boxShadow: hover === key || isPeak ? 'inset 0 0 0 2px rgba(244,245,255,0.85)' : undefined,
                  }}
                  aria-label={`${DAY_LABEL[dow]}요일 ${SLOTS[slot]} ${count}회`}
                  onPointerEnter={() => setHover(key)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(key)}
                  onBlur={() => setHover(null)}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-fog-400">
        <p className="min-h-[16px]" aria-live="polite">
          {hover !== null && hoverDow !== null && hoverSlot !== null ? (
            <>
              <b className="text-fog">
                {DAY_LABEL[hoverDow]} {SLOTS[hoverSlot]}
              </b>{' '}
              · {hovered?.count ?? 0}회 · {formatWon(hovered?.amount ?? 0)}
            </>
          ) : peak && peak.count > 0 ? (
            <>
              주로 <b className="text-fog">{DAY_LABEL[peak.dow]}요일 {SLOTS[peak.slot]}</b>에 사요 ({peak.count}회)
            </>
          ) : (
            '아직 데이터가 없어요'
          )}
        </p>
        <span className="flex shrink-0 items-center gap-1" aria-label="색이 밝을수록 구매 횟수가 많음">
          적음
          {RAMP.slice(1).map((c) => (
            <span key={c} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: c }} />
          ))}
          많음
        </span>
      </div>
    </div>
  );

  const table = (
    <table className="num w-full text-xs">
      <thead className="text-fog-400">
        <tr>
          <th className="py-1.5 text-left font-medium">요일</th>
          {SLOT_SHORT.map((s) => (
            <th key={s} className="text-right font-medium">
              {s}시~
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {DAYS.map((dow) => (
          <tr key={dow} className="border-t border-white/5">
            <td className="py-1.5">{DAY_LABEL[dow]}</td>
            {SLOTS.map((_, slot) => (
              <td key={slot} className="text-right">
                {byKey.get(`${dow}-${slot}`)?.count ?? 0}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return <ChartCard title="요일 히트맵" subtitle="언제 주로 사는지 (구매 횟수)" chart={chart} table={table} />;
}
