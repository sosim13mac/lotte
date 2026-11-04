'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { formatSignedWon, kstParts } from '@/lib/format';
import type { Ticket } from '@/lib/repo';

const PAGE = 20;
const pad = (n: number) => String(n).padStart(2, '0');

/** 날짜 · 회차 · 구매점 · 구매액 · 당첨액 · 손익 + [당첨만] 필터 */
export function LedgerTable({ tickets }: { tickets: Ticket[] }) {
  const [winsOnly, setWinsOnly] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const sorted = useMemo(() => [...tickets].sort((a, b) => b.purchase_date.localeCompare(a.purchase_date)), [tickets]);
  const wins = sorted.filter((t) => t.win_amount > 0);
  const rows = (winsOnly ? wins : sorted).slice(0, limit);
  const total = winsOnly ? wins.length : sorted.length;

  return (
    <section className="card">
      <div className="flex items-center justify-between gap-2">
        <h2 className="section-title">구매 내역</h2>
        <div className="flex gap-1.5" role="group" aria-label="필터">
          {[
            [false, `전체 ${sorted.length}`],
            [true, `당첨만 ${wins.length}`],
          ].map(([value, label]) => (
            <button
              key={String(value)}
              className={cn('chip', winsOnly === value && 'bg-gold text-deep')}
              aria-pressed={winsOnly === value}
              onClick={() => {
                setWinsOnly(value as boolean);
                setLimit(PAGE);
              }}
            >
              {label as string}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <table className="num w-full table-fixed text-[11px]">
          <colgroup>
            <col className="w-[34px]" />
            <col className="w-[32px]" />
            <col />
            <col className="w-[42px]" />
            <col className="w-[48px]" />
            <col className="w-[50px]" />
          </colgroup>
          <thead className="text-fog-400">
            <tr>
              <th className="py-2 text-left font-medium">날짜</th>
              <th className="text-left font-medium">회차</th>
              <th className="text-left font-medium">구매점</th>
              <th className="text-right font-medium">구매액</th>
              <th className="text-right font-medium">당첨액</th>
              <th className="text-right font-medium">손익</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const p = kstParts(t.purchase_date);
              const settled = Boolean(t.settled_at);
              return (
                <tr key={t.id} className="border-t border-ink-600">
                  <td className="py-2 text-fog-300">
                    {pad(p.month)}.{pad(p.day)}
                  </td>
                  <td>{t.round}</td>
                  <td className="truncate pr-1 text-fog-300" title={t.store_name ?? t.store_code ?? undefined}>
                    {t.store_name ?? t.store_code ?? '-'}
                  </td>
                  <td className="text-right">{t.amount.toLocaleString('ko-KR')}</td>
                  <td className={cn('text-right', t.win_amount > 0 && 'font-bold text-gold-deep')}>
                    {settled ? t.win_amount.toLocaleString('ko-KR') : '대기'}
                  </td>
                  <td className={cn('text-right', t.profit > 0 ? 'text-gain' : t.profit < 0 ? 'text-loss' : 'text-fog-300')}>
                    {settled ? formatSignedWon(t.profit).replace('원', '') : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!rows.length && <p className="py-6 text-center text-sm text-fog-400">{winsOnly ? '아직 당첨 내역이 없어요' : '등록한 티켓이 없어요'}</p>}
      {total > limit && (
        <button className="btn-ghost btn-sm mt-3 w-full" onClick={() => setLimit((l) => l + PAGE)}>
          더 보기 ({total - limit})
        </button>
      )}
      <p className="mt-3 text-[11px] text-fog-500">단위: 원 · 토요일 추첨 후 당첨액이 자동으로 반영돼요</p>
    </section>
  );
}
