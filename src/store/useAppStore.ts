'use client';

import { create } from 'zustand';
import {
  getRepo,
  type DreamEntry,
  type NewTicket,
  type Profile,
  type ProfilePatch,
  type Store,
  type Ticket,
  type TicketPatch,
  type WinningDraw,
  DuplicateTicketError,
} from '@/lib/repo';
import { makeGuestTicket } from '@/lib/guestTicket';

/** guest: 로그인하지 않고 둘러보는 상태 (번호 추천·당첨 확인·명당지도는 가능, 기록은 저장 안 됨) */
export type AppStatus = 'idle' | 'loading' | 'ready' | 'guest' | 'unauthenticated' | 'error';

export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'warning';
}

interface AppState {
  status: AppStatus;
  error: string | null;
  profile: Profile | null;
  tickets: Ticket[];
  /** 회차 → 당첨번호 */
  draws: Record<number, WinningDraw>;
  /** 최근 회차 번호 (내림차순, 최대 20개) — 품질 평가의 '최근 20회 1등 번호' */
  recentRounds: number[];
  dreamMap: DreamEntry[];
  /** 내 단골점 */
  favorites: Store[];
  /** 이 기기에서 '지나가는 길 명당 알림'(위치 추적)을 켰는지 */
  geofenceOn: boolean;
  toast: Toast | null;

  setGeofenceOn: (on: boolean) => void;
  showToast: (text: string, tone?: Toast['tone']) => void;
  bootstrap: (opts?: { force?: boolean }) => Promise<void>;
  refreshTickets: () => Promise<void>;
  loadDraws: (rounds: number[]) => Promise<void>;
  addTicket: (input: NewTicket) => Promise<Ticket>;
  patchTicket: (id: string, patch: TicketPatch) => Promise<void>;
  removeTicket: (id: string) => Promise<void>;
  saveProfile: (patch: ProfilePatch) => Promise<Profile>;
  toggleFavorite: (store: Store) => Promise<void>;
  signOut: () => Promise<void>;
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

const GEOFENCE_FLAG = 'zzolgit:geofence';

function readFlag(key: string): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key: string, on: boolean) {
  try {
    if (on) window.localStorage.setItem(key, '1');
    else window.localStorage.removeItem(key);
  } catch {
    // 무시
  }
}

let inflight: Promise<void> | null = null;

export const useAppStore = create<AppState>()((set, get) => ({
  status: 'idle',
  error: null,
  profile: null,
  tickets: [],
  draws: {},
  recentRounds: [],
  dreamMap: [],
  favorites: [],
  geofenceOn: readFlag(GEOFENCE_FLAG),
  toast: null,

  setGeofenceOn(on) {
    writeFlag(GEOFENCE_FLAG, on);
    set({ geofenceOn: on });
  },

  showToast(text, tone = 'info') {
    set({ toast: { id: Date.now(), text, tone } });
  },

  async bootstrap(opts) {
    const { status } = get();
    if (!opts?.force && (status === 'ready' || status === 'loading')) return inflight ?? undefined;
    set({ status: 'loading', error: null });
    inflight = (async () => {
      try {
        const repo = getRepo();
        const profile = await repo.getProfile();
        if (!profile) {
          // 게스트: 공개 데이터(당첨번호·꿈 해몽)만 불러오고 기록은 저장하지 않음
          const [recent, dreamMap] = await Promise.all([repo.listDraws({ limit: 20 }), repo.listDreamMap()]);
          const draws: Record<number, WinningDraw> = {};
          recent.forEach((d) => (draws[d.round] = d));
          set({ status: 'guest', profile: null, tickets: [], favorites: [], draws, recentRounds: recent.map((d) => d.round), dreamMap });
          return;
        }
        const [tickets, recent, dreamMap, favorites] = await Promise.all([
          repo.listTickets(),
          repo.listDraws({ limit: 20 }),
          repo.listDreamMap(),
          repo.listFavoriteStores().catch(() => [] as Store[]),
        ]);
        const draws: Record<number, WinningDraw> = {};
        recent.forEach((d) => (draws[d.round] = d));
        const missing = [...new Set(tickets.map((t) => t.round))].filter((r) => !draws[r]);
        if (missing.length) (await repo.listDraws({ rounds: missing })).forEach((d) => (draws[d.round] = d));
        set({
          status: 'ready',
          profile,
          tickets,
          draws,
          recentRounds: recent.map((d) => d.round),
          dreamMap,
          favorites,
        });
      } catch (e) {
        set({ status: 'error', error: message(e) });
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  },

  async refreshTickets() {
    const tickets = await getRepo().listTickets();
    set({ tickets });
    await get().loadDraws(tickets.map((t) => t.round));
  },

  async loadDraws(rounds) {
    const missing = [...new Set(rounds)].filter((r) => !get().draws[r]);
    if (!missing.length) return;
    const found = await getRepo().listDraws({ rounds: missing });
    if (!found.length) return;
    set((s) => {
      const draws = { ...s.draws };
      found.forEach((d) => (draws[d.round] = d));
      return { draws };
    });
  },

  async addTicket(input) {
    if (get().status === 'guest') {
      if (input.qr_raw && get().tickets.some((t) => t.qr_raw === input.qr_raw)) throw new DuplicateTicketError();
      await get().loadDraws([input.round]);
      const guestTicket = makeGuestTicket(input, get().draws[input.round]);
      set((s) => ({ tickets: [guestTicket, ...s.tickets] }));
      return guestTicket;
    }
    const ticket = await getRepo().insertTicket(input);
    set((s) => ({ tickets: [ticket, ...s.tickets] }));
    await get().loadDraws([ticket.round]);
    return ticket;
  },

  async patchTicket(id, patch) {
    // 낙관적 업데이트 (실패 시 되돌림)
    const before = get().tickets;
    set({ tickets: before.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
    if (get().status === 'guest') return; // 게스트는 메모리에서만 수정
    try {
      await getRepo().updateTicket(id, patch);
    } catch (e) {
      set({ tickets: before });
      throw e;
    }
  },

  async removeTicket(id) {
    if (get().status !== 'guest') await getRepo().deleteTicket(id);
    set((s) => ({ tickets: s.tickets.filter((t) => t.id !== id) }));
  },

  async saveProfile(patch) {
    const profile = await getRepo().updateProfile(patch);
    set({ profile });
    return profile;
  },

  async toggleFavorite(store) {
    if (get().status === 'guest') {
      get().showToast('단골점은 로그인하면 저장할 수 있어요', 'warning');
      return;
    }
    const before = get().favorites;
    const on = !before.some((f) => f.code === store.code);
    set({ favorites: on ? [store, ...before] : before.filter((f) => f.code !== store.code) });
    try {
      await getRepo().setFavoriteStore(store.code, on);
      get().showToast(on ? `${store.name}을(를) 단골점으로 등록했어요` : '단골점에서 뺐어요');
    } catch (e) {
      set({ favorites: before });
      throw e;
    }
  },

  async signOut() {
    await getRepo().signOut();
    set({ status: 'idle', profile: null, tickets: [], favorites: [], draws: {}, recentRounds: [] });
    await get().bootstrap({ force: true }); // 게스트 상태로 전환
  },
}));

/** 최근 20회 1등 번호 (품질 평가 '중복회피' 항목용) */
export function selectRecentWinningNumbers(s: Pick<AppState, 'draws' | 'recentRounds'>): number[][] {
  return s.recentRounds.map((r) => s.draws[r]?.numbers).filter((n): n is number[] => Array.isArray(n));
}
