'use client';

import { useMemo, useState } from 'react';
import { ChartCard, compactWon, LegendItem, niceMax } from '@/components/stats/ChartCard';
import { formatSignedWon, formatWon, kstParts } from '@/lib/format';
import type { LedgerMonth } from '@/lib/ledger';

const W = 320;
const H = 150; // 그림 영역
const TOP = 8;
const AXIS = 22; // x축 라벨 영역 (컨테이너 높이에 포함)
const LEFT = 34;
const BAR = 12; // 막대 두께 (<= 24px)
const GAP = 2; // 막대 사이 표면 간격

/** 위쪽만 4px 둥근 막대 (기준선 쪽은 각짐) */
function barPath(x: number, y: number, w: number, h: number) {
  if (h <= 0) return '';
  const r = Math.min(4, h, w / 2);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

function lastMonths(count: number, now = new Date()) {
  const { year, month } = kstParts(now);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1 - (count - 1 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  });
}

const monthLabel = (m: string) => `${Number(m.slice(5))}월`;

/** 최근 6개월 구매액 vs 당첨액 (묶은 세로 막대) */
export function MonthlyChart({ monthly }: { monthly: LedgerMonth[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const data = useMemo(() => {
    const byMonth = new Map(monthly.map((m) => [m.month, m]));
    return lastMonths(6).map((month) => byMonth.get(month) ?? { month, spent: 0, won: 0, tickets: 0 });
  }, [monthly]);

  const max = niceMax(Math.max(...data.map((d) => Math.max(d.spent, d.won))));
  const plotW = W - LEFT;
  const groupW = plotW / data.length;
  const y = (v: number) => TOP + H - (v / max) * H;
  const ticks = [0, max / 2, max];

  const chart = (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${TOP + H + AXIS}`} className="block w-full" role="img" aria-label="월별 구매액과 당첨액">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={LEFT} x2={W} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" strokeWidth={1} />
            <text x={LEFT - 6} y={y(t) + 3} textAnchor="end" className="num fill-fog-400 text-[9px]">
              {compactWon(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = LEFT + groupW * i + groupW / 2;
          const x1 = cx - BAR - GAP / 2;
          const x2 = cx + GAP / 2;
          const active = hover === i;
          return (
            <g key={d.month}>
              {active && <rect x={LEFT + groupW * i + 2} y={TOP} width={groupW - 4} height={H} rx={6} fill="#ffffff" opacity={0.04} />}
              <path d={barPath(x1, y(d.spent), BAR, TOP + H - y(d.spent))} fill="var(--viz-series-1)" />
              <path d={barPath(x2, y(d.won), BAR, TOP + H - y(d.won))} fill="var(--viz-series-2)" />
              <text x={cx} y={TOP + H + 15} textAnchor="middle" className="fill-fog-400 text-[10px]">
                {monthLabel(d.month)}
              </text>
              {/* 막대보다 큰 히트 영역 */}
              <rect
                x={LEFT + groupW * i}
                y={0}
                width={groupW}
                height={TOP + H + AXIS}
                fill="transparent"
                tabIndex={0}
                aria-label={`${monthLabel(d.month)} 구매 ${formatWon(d.spent)}, 당첨 ${formatWon(d.won)}`}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="cursor-pointer outline-none"
              />
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 w-36 -translate-x-1/2 rounded-xl border border-white/10 bg-ink-700 px-3 py-2 text-xs shadow-card"
          style={{ left: `${((LEFT + groupW * hover + groupW / 2) / W) * 100}%` }}
          role="tooltip"
        >
          <p className="mb-1 text-fog-400">{monthLabel(data[hover].month)}</p>
          {[
            ['구매', data[hover].spent, 'var(--viz-series-1)'],
            ['당첨', data[hover].won, 'var(--viz-series-2)'],
          ].map(([label, value, color]) => (
            <p key={label as string} className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded" style={{ background: color as string }} aria-hidden />
              <b className="num text-fog">{formatWon(value as number)}</b>
              <span className="text-fog-400">{label as string}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );

  const table = (
    <table className="num w-full text-xs">
      <thead className="text-fog-400">
        <tr>
          <th className="py-1.5 text-left font-medium">월</th>
          <th className="text-right font-medium">구매액</th>
          <th className="text-right font-medium">당첨액</th>
          <th className="text-right font-medium">손익</th>
        </tr>
      </thead>
      <tbody>
        {data.map((d) => (
          <tr key={d.month} className="border-t border-white/5">
            <td className="py-1.5">{d.month}</td>
            <td className="text-right">{formatWon(d.spent)}</td>
            <td className="text-right">{formatWon(d.won)}</td>
            <td className="text-right">{formatSignedWon(d.won - d.spent)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <ChartCard
      title="월별 구매 · 당첨"
      subtitle="최근 6개월"
      legend={
        <div className="flex gap-4">
          <LegendItem color="var(--viz-series-1)" label="구매액" />
          <LegendItem color="var(--viz-series-2)" label="당첨액" />
        </div>
      }
      chart={chart}
      table={table}
    />
  );
}
