'use client';

import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { NumberPicker } from '@/components/lotto/NumberPicker';
import { GameRow } from '@/components/scan/GameRow';
import { cn } from '@/lib/cn';
import { formatWon } from '@/lib/format';
import { GAME_PRICE, LOTTO_PICK, MAX_GAMES_PER_TICKET } from '@/lib/lotto/constants';
import { latestDrawnRound, roundForPurchase } from '@/lib/lotto/round';
import { DuplicateTicketError, getRepo, type Ticket } from '@/lib/repo';
import { useAppStore } from '@/store/useAppStore';

export interface TicketDraft {
  round?: number;
  purchaseDate?: string; // ISO
  storeCode?: string | null;
  storeName?: string | null;
  games?: number[][];
  qrRaw?: string | null;
}

export type FallbackReason = 'manual' | 'qr' | 'store';

const NOTICE: Record<FallbackReason, string | null> = {
  manual: null,
  qr: 'QR을 찾지 못했어요. 사진이 흐리거나 잘렸을 수 있어요. 번호를 직접 입력해 주세요.',
  store: 'QR은 읽었는데 판매점 코드를 못 찾았어요. 직접 입력하거나 비워두고 저장할 수 있어요.',
};

/** ISO → datetime-local 값 (기기 로컬 시간) */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 수동 입력 (스캔 실패 시 fallback) */
export function ManualTicketForm({
  draft,
  reason = 'manual',
  onSaved,
  onCancel,
}: {
  draft?: TicketDraft;
  reason?: FallbackReason;
  onSaved: (ticket: Ticket) => void;
  onCancel?: () => void;
}) {
  const addTicket = useAppStore((s) => s.addTicket);
  const [purchase, setPurchase] = useState(() => toLocalInput(draft?.purchaseDate ?? new Date().toISOString()));
  const [round, setRound] = useState<number>(() => draft?.round ?? roundForPurchase(new Date()));
  const [roundTouched, setRoundTouched] = useState(Boolean(draft?.round));
  const [storeCode, setStoreCode] = useState(draft?.storeCode ?? '');
  const [storeName, setStoreName] = useState(draft?.storeName ?? '');
  const [games, setGames] = useState<number[][]>(() => (draft?.games?.length ? draft.games : [[]]));
  const [active, setActive] = useState<number | null>(draft?.games?.length ? null : 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 구매 시각을 바꾸면 회차 자동 계산 (직접 고친 적이 없을 때)
  useEffect(() => {
    if (!roundTouched && purchase) setRound(roundForPurchase(new Date(purchase)));
  }, [purchase, roundTouched]);

  // 판매점 코드 7자리 입력 시 명당 DB 에서 이름 채우기
  useEffect(() => {
    if (!/^\d{7}$/.test(storeCode) || storeName) return;
    let cancelled = false;
    getRepo()
      .findStore(storeCode)
      .then((s) => !cancelled && s && setStoreName(s.name))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [storeCode, storeName]);

  const complete = games.filter((g) => g.length === LOTTO_PICK);
  const incomplete = games.some((g) => g.length > 0 && g.length < LOTTO_PICK);
  const storeCodeInvalid = storeCode !== '' && !/^\d{7}$/.test(storeCode);
  const maxRound = latestDrawnRound() + 1;
  const roundInvalid = !Number.isInteger(round) || round < 1 || round > maxRound;
  const canSave = complete.length > 0 && !incomplete && !storeCodeInvalid && !roundInvalid && !busy;

  const summary = useMemo(() => `${complete.length}게임 · ${formatWon(complete.length * GAME_PRICE)}`, [complete.length]);

  function updateGame(i: number, next: number[]) {
    setGames((gs) => gs.map((g, j) => (j === i ? next : g)));
    if (next.length === LOTTO_PICK) setActive(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setBusy(true);
    setError(null);
    try {
      const ticket = await addTicket({
        round,
        purchase_date: new Date(purchase).toISOString(),
        store_code: storeCode || null,
        store_name: storeName.trim() || null,
        games: complete,
        qr_raw: draft?.qrRaw ?? null,
      });
      onSaved(ticket);
    } catch (err) {
      setError(err instanceof DuplicateTicketError ? err.message : err instanceof Error ? err.message : '저장하지 못했어요');
      setBusy(false);
    }
  }

  const notice = NOTICE[reason];

  return (
    <form onSubmit={save} className="space-y-4">
      {notice && <p className="rounded-2xl bg-gold/10 px-4 py-3 text-sm text-gold-soft">{notice}</p>}

      <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-2">
        <div>
          <label className="label" htmlFor="purchase">
            구매 일시
          </label>
          <input
            id="purchase"
            type="datetime-local"
            className="input min-w-0 px-3"
            value={purchase}
            onChange={(e) => setPurchase(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="round">
            회차
          </label>
          <input
            id="round"
            type="number"
            inputMode="numeric"
            className={cn('input num', roundInvalid && 'ring-2 ring-gain/70')}
            value={Number.isFinite(round) ? round : ''}
            min={1}
            max={maxRound}
            onChange={(e) => {
              setRoundTouched(true);
              setRound(Number(e.target.value));
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-2">
        <div>
          <label className="label" htmlFor="storeCode">
            판매점 코드
          </label>
          <input
            id="storeCode"
            inputMode="numeric"
            placeholder="7자리"
            maxLength={7}
            className={cn('input num', storeCodeInvalid && 'ring-2 ring-gain/70')}
            value={storeCode}
            autoFocus={reason === 'store'}
            onChange={(e) => setStoreCode(e.target.value.replace(/\D/g, ''))}
          />
        </div>
        <div>
          <label className="label" htmlFor="storeName">
            판매점 이름 <span className="text-fog-500">(선택)</span>
          </label>
          <input
            id="storeName"
            className="input"
            placeholder="예: 홍대 행운편의점"
            maxLength={100}
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
          />
        </div>
      </div>

      <div>
        <p className="label">게임 번호</p>
        <ul className="space-y-2">
          {games.map((g, i) => (
            <li key={i} className="rounded-2xl bg-ink-700/60 p-3">
              <GameRow
                index={i}
                game={g}
                right={
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-fog-300 hover:bg-ink-600"
                      onClick={() => setActive(active === i ? null : i)}
                      aria-label={`${i + 1}번째 게임 ${active === i ? '접기' : '편집'}`}
                    >
                      {active === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {games.length > 1 && (
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-fog-400 hover:bg-ink-600"
                        onClick={() => {
                          setGames((gs) => gs.filter((_, j) => j !== i));
                          setActive(null);
                        }}
                        aria-label={`${i + 1}번째 게임 삭제`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                }
              />
              {active === i && (
                <div className="mt-3">
                  <NumberPicker value={g} onChange={(next) => updateGame(i, next)} />
                </div>
              )}
            </li>
          ))}
        </ul>
        {games.length < MAX_GAMES_PER_TICKET && (
          <button
            type="button"
            className="btn-ghost btn-sm mt-2 w-full"
            onClick={() => {
              setGames((gs) => [...gs, []]);
              setActive(games.length);
            }}
          >
            <Plus className="h-4 w-4" /> 게임 추가
          </button>
        )}
      </div>

      {error && <p className="text-sm text-gain">{error}</p>}

      <div className="flex gap-2">
        {onCancel && (
          <button type="button" className="btn-ghost flex-1" onClick={onCancel}>
            취소
          </button>
        )}
        <button type="submit" className="btn-gold flex-[2]" disabled={!canSave}>
          {busy ? '저장 중…' : `티켓 저장 (${summary})`}
        </button>
      </div>
    </form>
  );
}
