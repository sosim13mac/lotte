'use client';

import { Table2, ChartColumn } from 'lucide-react';
import { useState } from 'react';

/** 차트 컨테이너: 제목 + '표로 보기' 토글 (모든 차트의 접근성 쌍둥이) */
export function ChartCard({
  title,
  subtitle,
  legend,
  chart,
  table,
}: {
  title: string;
  subtitle?: string;
  legend?: React.ReactNode;
  chart: React.ReactNode;
  table: React.ReactNode;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <figure className="card">
      <div className="flex items-start justify-between gap-2">
        <figcaption>
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-fog-300">{subtitle}</p>}
        </figcaption>
        <button className="btn-ghost btn-sm shrink-0" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>
          {asTable ? <ChartColumn className="h-4 w-4" /> : <Table2 className="h-4 w-4" />}
          {asTable ? '차트' : '표로 보기'}
        </button>
      </div>
      {legend && !asTable && <div className="mt-3">{legend}</div>}
      <div className="mt-3">{asTable ? table : chart}</div>
    </figure>
  );
}

export function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-fog-300">
      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} aria-hidden />
      {label}
    </span>
  );
}

/** 축 눈금용 축약: 0 / 5천 / 1만 / 2.5만 / 1억 */
export function compactWon(n: number): string {
  if (n === 0) return '0';
  if (n >= 100_000_000) return `${+(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `${+(n / 10_000).toFixed(1)}만`;
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}천`;
  return String(n);
}

/** 1, 2, 2.5, 5, 10 x 10^k 중 v 이상인 가장 작은 값 */
export function niceMax(v: number): number {
  if (v <= 0) return 10_000;
  const mag = 10 ** Math.floor(Math.log10(v));
  for (const step of [1, 2, 2.5, 5, 10]) if (step * mag >= v) return step * mag;
  return 10 * mag;
}
