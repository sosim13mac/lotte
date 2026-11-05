'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Eye, PartyPopper, Plus, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Confetti } from '@/components/logs/Confetti';
import { RoundChips, type RoundChip } from '@/components/logs/RoundChips';
import { TicketCard, type TicketStatus } from '@/components/logs/TicketCard';
import { WinningBoard } from '@/components/logs/WinningBoard';
import { PageHeader } from '@/components/PageHeader';
import { formatDateKST, formatSignedWon, formatWon } from '@/lib/format';
import { GAME_LABELS } from '@/lib/lotto/constants';
import { RANK_LABEL, rankOf, ticketResult, type Rank } from '@/lib/lotto/prize';
import { gameContainsAll, highlightMode, nextSealedRow } from '@/lib/lotto/reveal';
import { drawDate, latestDrawnRound, msUntilNextDraw } from '@/lib/lotto/round';
import type { Ticket, WinningDraw } from '@/lib/repo';
import { useAppStore } from '@/store/useAppStore';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // 미지원 기기
  }
}

function summarize(tickets: Ticket[], draw: WinningDraw) {
  const ranks: Partial<Record<Rank, number>> = {};
  let won = 0;
  let net = 0;
  let unknown = false;
  let best: Rank | null = null;
  for (const t of tickets) {
    const r = ticketResult(t.games, draw);
    won += r.total;
    net += r.net;
    unknown ||= r.hasUnknownPrize;
    r.games.forEach((g) => {
      if (!g.rank) return;
      ranks[g.rank] = (ranks[g.rank] ?? 0) + 1;
      if (best === null || g.rank < best) best = g.rank;
    });
  }
  const spent = tickets.reduce((s, t) => s + t.amount, 0);
  return { ranks, won, net, spent, unknown, best: best as Rank | null };
}

function pendingLabel(round: number, latest: number): string {
  if (round === latest + 1) {
    const ms = msUntilNextDraw();
    const d = Math.floor(ms / 86_400_000);
    const h = Math.floor((ms % 86_400_000) / 3_600_000);
    return `토요일 20:35 추첨 · ${d > 0 ? `D-${d} ` : ''}${h}시간 남음`;
  }
  if (round <= latest) return '추첨 결과를 불러오는 중이에요 (토요일 추첨 후 자동 반영)';
  return `${formatDateKST(`${drawDate(round)}T12:00:00+09:00`)} 추첨 예정`;
}

export function LogsView() {
  const tickets = useAppStore((s) => s.tickets);
  const draws = useAppStore((s) => s.draws);
  const recentRounds = useAppStore((s) => s.recentRounds);
  const patchTicket = useAppStore((s) => s.patchTicket);
  const removeTicket = useAppStore((s) => s.removeTicket);

  const latest = latestDrawnRound();
  const latestKnown = recentRounds[0] ?? null;

  const [round, setRound] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [reveal, setReveal] = useState<Record<string, number[]>>({});
  const [suspense, setSuspense] = useState<{ ticketId: string; game: number; index: number } | null>(null);
  const [shakeAll, setShakeAll] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const [running, setRunning] = useState(false);
  const [burst, setBurst] = useState(0);
  const [announce, setAnnounce] = useState('');
  const runId = useRef(0);
  const persisted = useRef(new Set<string>());

  const isOpened = (t: Ticket) => Boolean(t.opened_at) || Boolean(reveal[t.id]?.every((c) => c >= 6));

  // 회차 칩: 티켓이 있는 회차 + 최신 당첨 회차
  const chips = useMemo<RoundChip[]>(() => {
    const rounds = new Set(tickets.map((t) => t.round));
    if (latestKnown) rounds.add(latestKnown);
    return [...rounds]
      .sort((a, b) => b - a)
      .map((r) => {
        const ts = tickets.filter((t) => t.round === r);
        const draw = draws[r];
        if (!draw) return { round: r, badge: r > latest ? '추첨 전' : '결과 대기', tone: 'pending' as const };
        if (!ts.length) return { round: r, badge: '티켓 없음', tone: 'none' as const };
        const sealed = ts.filter((t) => !t.opened_at).length;
        if (sealed) return { round: r, badge: `미개봉 ${sealed}`, tone: 'sealed' as const };
        const best = summarize(ts, draw).best;
        return best ? { round: r, badge: `${RANK_LABEL[best]} 당첨`, tone: 'win' as const } : { round: r, badge: '낙첨', tone: 'none' as const };
      });
  }, [tickets, draws, latestKnown, latest]);

  // 기본 회차: 결과가 나왔는데 안 열어본 티켓이 있는 최근 회차 → 없으면 최신 당첨 회차
  const defaultRound = useMemo(() => {
    const sealed = tickets.filter((t) => !t.opened_at && draws[t.round]).map((t) => t.round);
    if (sealed.length) return Math.max(...sealed);
    return latestKnown ?? chips[0]?.round ?? latest;
  }, [tickets, draws, latestKnown, chips, latest]);

  const active = round ?? defaultRound;
  const draw = draws[active] ?? null;
  const roundTickets = useMemo(
    () => tickets.filter((t) => t.round === active).sort((a, b) => a.purchase_date.localeCompare(b.purchase_date)),
    [tickets, active],
  );

  // 회차가 바뀌면 진행 중인 연출 중단 + 선택 초기화
  useEffect(() => {
    runId.current += 1;
    setSelected(new Set());
    setSuspense(null);
    setShakeAll(false);
    setFlipping(false);
    setRunning(false);
  }, [active]);

  // 티켓별 공개 상태 초기화 (열어본 티켓은 전부 공개)
  useEffect(() => {
    setReveal((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const t of roundTickets) {
        if (!next[t.id] || next[t.id].length !== t.games.length) {
          next[t.id] = t.games.map(() => (t.opened_at ? 6 : 0));
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [roundTickets]);

  // 모두 공개된 티켓은 opened_at 저장 (기기 간 동기화)
  useEffect(() => {
    if (!draw) return;
    for (const t of roundTickets) {
      if (!t.opened_at && reveal[t.id]?.every((c) => c >= 6) && !persisted.current.has(t.id)) {
        persisted.current.add(t.id);
        patchTicket(t.id, { opened_at: new Date().toISOString() }).catch(() => persisted.current.delete(t.id));
      }
    }
  }, [reveal, roundTickets, draw, patchTicket]);

  const statusOf = (t: Ticket): TicketStatus => {
    if (!draws[t.round]) return t.round > latest ? 'pending' : 'waiting';
    return isOpened(t) ? 'opened' : 'sealed';
  };
  const sealedIds = roundTickets.filter((t) => statusOf(t) === 'sealed').map((t) => t.id);
  const hasSealed = sealedIds.length > 0;
  const mode = highlightMode(draw, selected);
  const matchingGames =
    mode === 'filter' ? roundTickets.reduce((n, t) => n + t.games.filter((g) => gameContainsAll(g, selected)).length, 0) : 0;
  const summary = useMemo(() => (draw ? summarize(roundTickets, draw) : null), [roundTickets, draw]);
  const allOpened = roundTickets.length > 0 && roundTickets.every((t) => statusOf(t) === 'opened');
  const next = nextSealedRow(sealedIds, reveal);

  // 6개 모두 선택 → 결과 하이라이트 (당첨이면 축하)
  const prevMode = useRef(mode);
  useEffect(() => {
    if (mode === 'result' && prevMode.current !== 'result' && summary && summary.won > 0) {
      setBurst((b) => b + 1);
      vibrate([40, 60, 40]);
    }
    prevMode.current = mode;
  }, [mode, summary]);

  function toggle(n: number) {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(n)) s.delete(n);
      else s.add(n);
      return s;
    });
    vibrate(10);
  }

  /** 가려진 줄을 한꺼번에 뒤집기 (순차 지연) */
  async function flipAll(id: number) {
    setFlipping(true);
    setReveal((prev) => {
      const nextReveal = { ...prev };
      for (const tid of sealedIds) nextReveal[tid] = (nextReveal[tid] ?? []).map(() => 6);
      return nextReveal;
    });
    await sleep(900 + sealedIds.length * 300);
    if (id !== runId.current) return;
    setFlipping(false);
  }

  /** [한번에 짠!] */
  async function openAll() {
    if (!draw || !hasSealed || running) return;
    const id = ++runId.current;
    setRunning(true);
    setShakeAll(true);
    vibrate([15, 40, 15, 40, 15]);
    await sleep(850);
    if (id !== runId.current) return;
    setShakeAll(false);
    await flipAll(id);
    if (id !== runId.current) return;
    setRunning(false);
    if (summary && summary.won > 0) {
      setBurst((b) => b + 1);
      vibrate([40, 60, 40]);
    }
    setAnnounce(summary && summary.won > 0 ? `당첨! 총 ${formatWon(summary.won)}` : '이번 회차는 낙첨이에요');
  }

  /** [한줄씩 쫄깃 오픈] — 한 번 누를 때마다 한 줄, 공 하나씩. 2개 이상 맞으면 다음 공은 두근두근 */
  async function openNextRow() {
    if (!draw || running || !next) return;
    const id = ++runId.current;
    const ticket = roundTickets.find((t) => t.id === next.ticketId);
    if (!ticket) return;
    const g = next.game;
    const game = ticket.games[g];
    setRunning(true);
    document.getElementById(`row-${ticket.id}-${g}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(380);

    let matches = 0;
    const start = reveal[ticket.id]?.[g] ?? 0;
    for (let i = 0; i < start; i += 1) if (draw.numbers.includes(game[i])) matches += 1;

    for (let i = start; i < 6; i += 1) {
      if (id !== runId.current) return;
      if (matches >= 2) {
        // 다음 공에 등수가 걸려 있음 → 두근두근
        setSuspense({ ticketId: ticket.id, game: g, index: i });
        vibrate([8, 90, 8, 90, 8]);
        await sleep(1100);
        if (id !== runId.current) return;
        setSuspense(null);
      } else {
        await sleep(i === start ? 150 : 430);
      }
      setReveal((prev) => ({ ...prev, [ticket.id]: (prev[ticket.id] ?? []).map((c, k) => (k === g ? i + 1 : c)) }));
      if (draw.numbers.includes(game[i])) {
        matches += 1;
        vibrate(25);
      }
    }
    await sleep(450);
    if (id !== runId.current) return;
    const rank = rankOf(game, draw);
    if (rank) {
      setBurst((b) => b + 1);
      vibrate([40, 60, 40]);
    }
    setAnnounce(`${GAME_LABELS[g]}줄 ${matches}개 일치${rank ? `, ${RANK_LABEL[rank]} 당첨` : ''}`);
    setRunning(false);
  }

  async function revealRest() {
    const id = ++runId.current;
    await flipAll(id);
  }

  async function deleteTicket(t: Ticket) {
    if (!window.confirm(`${t.round}회 티켓(${t.games.length}게임)을 삭제할까요?`)) return;
    await removeTicket(t.id);
  }

  // 한 줄씩 버튼 문구: 처음엔 '한줄씩 쫄깃 오픈', 시작하면 '다음 줄' 안내
  const lineStarted = sealedIds.some((tid) => (reveal[tid] ?? []).some((c) => c > 0));
  const lineLabel = (() => {
    if (running) return '쫄깃 오픈 중…';
    if (!next || !lineStarted) return '한줄씩 쫄깃 오픈';
    const prefix = sealedIds.length > 1 ? `티켓${sealedIds.indexOf(next.ticketId) + 1} ` : '';
    return `${prefix}${GAME_LABELS[next.game]}줄 오픈`;
  })();

  const showSummary = Boolean(draw && summary && roundTickets.length && (allOpened || mode === 'result'));

  return (
    <>
      <PageHeader
        title="티켓 로그"
        subtitle="가려진 번호를 쫄깃하게 열어봐요"
        right={
          <Link href="/?scan=1" className="btn-ghost btn-sm">
            <Plus className="h-4 w-4" /> 등록
          </Link>
        }
      />

      {chips.length > 0 && <RoundChips chips={chips} active={active} onSelect={setRound} />}

      <div className="relative mt-3 space-y-3">
        <Confetti burst={burst} />

        <WinningBoard
          round={active}
          draw={draw}
          selected={selected}
          onToggle={toggle}
          onSelectAll={() => draw && setSelected(new Set(draw.numbers))}
          onClear={() => setSelected(new Set())}
          mode={mode}
          matchingGames={matchingGames}
          pendingText={pendingLabel(active, latest)}
        />

        <AnimatePresence>
          {showSummary && summary && (
            <motion.section
              key={`summary-${active}`}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              className={
                summary.won > 0
                  ? 'card border-gold/40 bg-gradient-to-br from-gold/20 via-ink-800 to-ink-800'
                  : 'card'
              }
            >
              {summary.won > 0 || summary.best ? (
                <>
                  <p className="flex items-center gap-2 font-display text-xl text-gold-deep">
                    <PartyPopper className="h-5 w-5" /> {active}회 {summary.best ? RANK_LABEL[summary.best] : ''} 당첨!
                  </p>
                  <p className="mt-1 text-sm text-fog-300">
                    {(Object.entries(summary.ranks) as Array<[string, number]>)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([r, c]) => `${r}등 ${c}게임`)
                      .join(' · ')}
                  </p>
                </>
              ) : (
                <p className="font-display text-xl">이번 회차는 아쉽게 꽝!</p>
              )}
              <dl className="num mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-ink-900/40 py-2">
                  <dt className="text-[11px] text-fog-400">구매</dt>
                  <dd className="font-bold">{formatWon(summary.spent)}</dd>
                </div>
                <div className="rounded-2xl bg-ink-900/40 py-2">
                  <dt className="text-[11px] text-fog-400">당첨금</dt>
                  <dd className="font-bold">
                    {formatWon(summary.won)}
                    {summary.unknown ? '+' : ''}
                  </dd>
                </div>
                <div className="rounded-2xl bg-ink-900/40 py-2">
                  <dt className="text-[11px] text-fog-400">손익</dt>
                  <dd className={summary.won - summary.spent >= 0 ? 'font-bold text-gain' : 'font-bold text-loss'}>
                    {formatSignedWon(summary.won - summary.spent)}
                  </dd>
                </div>
              </dl>
              {summary.won > 0 && (
                <p className="num mt-2 rounded-2xl bg-gold/15 py-2 text-center text-sm">
                  <span className="text-xs text-fog-300">세금 떼고 실수령액 </span>
                  <b className="text-gold-deep">
                    {formatWon(summary.net)}
                    {summary.unknown ? '+' : ''}
                  </b>
                  {summary.net < summary.won && (
                    <span className="block text-[11px] text-fog-400">제세금 {formatWon(summary.won - summary.net)} 차감 (게임별 기준)</span>
                  )}
                </p>
              )}
              {hasSealed && mode === 'result' && (
                <button className="btn-ghost btn-sm mt-3 w-full" onClick={revealRest} disabled={flipping}>
                  <Eye className="h-4 w-4" /> 나머지 번호도 보기
                </button>
              )}
              {summary.won === 0 && <p className="mt-3 text-xs text-fog-400">다음 주엔 더 쫄깃하게! 결과와 상관없이 즐거운 만큼만 🙂</p>}
            </motion.section>
          )}
        </AnimatePresence>

        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
        {roundTickets.map((t, i) => (
          <TicketCard
            key={t.id}
            ticket={t}
            draw={draw}
            status={statusOf(t)}
            reveal={reveal[t.id] ?? t.games.map(() => (t.opened_at ? 6 : 0))}
            selected={selected}
            suspense={suspense?.ticketId === t.id ? suspense : null}
            shakeAll={shakeAll && sealedIds.includes(t.id)}
            flipDelayBase={flipping ? 0.01 + i * 0.25 : 0}
            onDelete={() => void deleteTicket(t)}
          />
        ))}
        </div>

        {roundTickets.length === 0 && (
          <div className="card flex flex-col items-center gap-3 py-10 text-center">
            <Sparkles className="h-8 w-8 text-gold-deep" />
            <p className="font-display text-lg">{tickets.length ? '이 회차엔 티켓이 없어요' : '아직 등록한 티켓이 없어요'}</p>
            <p className="text-sm text-fog-300">티켓 사진 한 장이면 자동으로 등록돼요.</p>
            <Link href="/?scan=1" className="btn-gold mt-1 px-6">
              티켓 등록하기
            </Link>
          </div>
        )}

        {/* 쫄깃 오픈 모드 버튼 — 하단 탭 위에 고정 */}
        {draw && hasSealed && (
          <div className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] z-20 pt-1 lg:bottom-6 lg:mx-auto lg:max-w-xl">
            <div className="grid grid-cols-2 gap-2 rounded-3xl border border-ink-500 bg-ink-800/90 p-2 shadow-card backdrop-blur-xl">
              <button className="btn-gold" onClick={openAll} disabled={running}>
                <Zap className="h-4 w-4" /> 한번에 짠!
              </button>
              <button className="btn bg-chewy text-deep hover:bg-chewy-soft" onClick={openNextRow} disabled={running || !next}>
                <Sparkles className="h-4 w-4" />
                {lineLabel}
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </>
  );
}
