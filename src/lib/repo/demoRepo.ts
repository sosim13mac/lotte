import { GAME_PRICE } from '@/lib/lotto/constants';
import { ticketResult } from '@/lib/lotto/prize';
import { latestDrawnRound } from '@/lib/lotto/round';
import { buildDemoDataset, DEMO_DREAMS, DEMO_STORES, DEMO_USER_ID, demoProfile, type DemoDataset } from './demoData';
import { DuplicateTicketError, type Profile, type Repo, type Ticket } from './types';

const STORAGE_KEY = 'zzolgit:demo:v1';

interface DemoState extends DemoDataset {
  profile: Profile;
  signedIn: boolean;
}

function readState(): DemoState {
  const latest = latestDrawnRound();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed.generatedFor === latest) return parsed;
    }
  } catch {
    // 저장소 접근 불가(프라이빗 모드 등) → 새로 생성
  }
  const fresh: DemoState = { ...buildDemoDataset(), profile: demoProfile(), signedIn: true };
  writeState(fresh);
  return fresh;
}

function writeState(state: DemoState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 무시 (메모리에서만 동작)
  }
}

export function resetDemoData() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 무시
  }
}

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

/** 로그인 없이 localStorage 로 동작하는 데모 저장소 */
export function createDemoRepo(): Repo {
  let state: DemoState | null = null;
  const get = () => (state ??= readState());
  const commit = () => state && writeState(state);

  const settle = (t: Ticket): Ticket => {
    const draw = get().draws.find((d) => d.round === t.round);
    const win = draw ? ticketResult(t.games, draw).total : 0;
    return { ...t, amount: t.games.length * GAME_PRICE, win_amount: win, profit: win - t.games.length * GAME_PRICE };
  };

  return {
    kind: 'demo',

    async getProfile() {
      await delay();
      const s = get();
      return s.signedIn ? s.profile : null;
    },

    async updateProfile(patch) {
      const s = get();
      s.profile = { ...s.profile, ...patch };
      s.signedIn = true;
      commit();
      return s.profile;
    },

    async listTickets() {
      await delay();
      return [...get().tickets].sort((a, b) => b.purchase_date.localeCompare(a.purchase_date));
    },

    async insertTicket(input) {
      const s = get();
      if (input.qr_raw && s.tickets.some((t) => t.qr_raw === input.qr_raw)) throw new DuplicateTicketError();
      const now = new Date().toISOString();
      const ticket = settle({
        id: `demo-${crypto.randomUUID?.() ?? Date.now()}`,
        user_id: DEMO_USER_ID,
        round: input.round,
        purchase_date: input.purchase_date ?? now,
        store_code: input.store_code || null,
        store_name: input.store_name || null,
        amount: 0,
        games: input.games.map((g) => [...g].sort((a, b) => a - b)),
        win_amount: 0,
        profit: 0,
        qr_raw: input.qr_raw ?? null,
        opened_at: null,
        created_at: now,
      });
      s.tickets.unshift(ticket);
      commit();
      return ticket;
    },

    async updateTicket(id, patch) {
      const s = get();
      s.tickets = s.tickets.map((t) => (t.id === id ? settle({ ...t, ...patch }) : t));
      commit();
    },

    async deleteTicket(id) {
      const s = get();
      s.tickets = s.tickets.filter((t) => t.id !== id);
      commit();
    },

    async listDraws(opts = {}) {
      const sorted = [...get().draws].sort((a, b) => b.round - a.round);
      if (opts.rounds?.length) return sorted.filter((d) => opts.rounds!.includes(d.round));
      return sorted.slice(0, opts.limit ?? 20);
    },

    async listDreamMap() {
      return DEMO_DREAMS;
    },

    async findStore(code) {
      return DEMO_STORES.find((st) => st.code === code) ?? null;
    },

    async signOut() {
      const s = get();
      s.signedIn = false;
      commit();
    },
  };
}
