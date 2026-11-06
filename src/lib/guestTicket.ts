import { GAME_PRICE } from '@/lib/lotto/constants';
import { ticketResult } from '@/lib/lotto/prize';
import type { NewTicket, Ticket, WinningDraw } from '@/lib/repo/types';

/** 로그인하지 않은 사용자의 임시 티켓 (메모리에만 있고 서버·기기에 저장하지 않음) */
export function makeGuestTicket(input: NewTicket, draw: WinningDraw | undefined, now = new Date()): Ticket {
  const amount = input.games.length * GAME_PRICE;
  const win = draw ? ticketResult(input.games, draw).total : 0;
  const iso = now.toISOString();
  return {
    id: `guest-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    user_id: 'guest',
    round: input.round,
    purchase_date: input.purchase_date ?? iso,
    store_code: input.store_code || null,
    store_name: input.store_name || null,
    amount,
    games: input.games.map((g) => [...g].sort((a, b) => a - b)),
    win_amount: win,
    profit: win - amount,
    qr_raw: input.qr_raw ?? null,
    opened_at: null,
    settled_at: draw ? iso : null,
    created_at: iso,
  };
}
