import { authClient } from '@/lib/authClient';
import type { LedgerStats } from '@/lib/ledger';
import { normalizeGames } from './normalize';
import { DuplicateTicketError, type DrawCoverage, type DrawStatsSummary, type DreamEntry, type Inquiry, type InquiryList, type Profile, type Repo, type Store, type Ticket, type WinningDraw } from './types';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

async function call<T>(op: string, args: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch('/api/repo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op, ...args }),
  });
  const json = (await res.json().catch(() => ({}))) as { data?: T; error?: string; code?: string };
  if (!res.ok) throw new ApiError(res.status, json.error ?? '요청에 실패했어요', json.code);
  return json.data as T;
}

type TicketRow = Omit<Ticket, 'games'> & { games: unknown };
const toTicket = (row: TicketRow): Ticket => ({ ...row, games: normalizeGames(row.games as Parameters<typeof normalizeGames>[0]) });

/** Neon(Postgres) 저장소: 브라우저 → /api/repo → 서버(사용자 본인 데이터만) */
export function createNeonRepo(): Repo {
  return {
    kind: 'neon',

    async getProfile() {
      try {
        return await call<Profile>('getProfile');
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    updateProfile: (patch) => call<Profile>('updateProfile', { patch }),
    async listTickets() {
      return (await call<TicketRow[]>('listTickets')).map(toTicket);
    },
    async insertTicket(input) {
      try {
        return toTicket(await call<TicketRow>('insertTicket', { input }));
      } catch (e) {
        if (e instanceof ApiError && e.code === 'duplicate') throw new DuplicateTicketError();
        throw e;
      }
    },
    async updateTicket(id, patch) {
      await call('updateTicket', { id, patch });
    },
    async deleteTicket(id) {
      await call('deleteTicket', { id });
    },
    listDraws: (opts = {}) => call<WinningDraw[]>('listDraws', { ...opts }),
    listDreamMap: () => call<DreamEntry[]>('listDreamMap'),
    getDrawCoverage: () => call<DrawCoverage>('getDrawCoverage'),
    listInquiries: (opts = {}) => call<InquiryList>('listInquiries', { all: Boolean(opts.all) }),
    createInquiry: (input) => call<Inquiry>('createInquiry', { input }),
    async deleteInquiry(id) {
      await call('deleteInquiry', { id });
    },
    replyInquiry: (id, reply) => call<Inquiry>('replyInquiry', { id, reply }),
    getDrawStats: () => call<DrawStatsSummary | null>('getDrawStats'),
    getLedgerStats: () => call<LedgerStats>('getLedgerStats'),
    findStore: (code) => call<Store | null>('findStore', { code }),
    listStores: (query = {}) => call<Store[]>('listStores', { query }),
    listFavoriteStores: () => call<Store[]>('listFavoriteStores'),
    async setFavoriteStore(code, on) {
      await call('setFavoriteStore', { code, on });
    },
    async registerPushToken(token, platform) {
      await call('registerPushToken', { token, platform });
    },
    async unregisterPushToken(token) {
      await call('unregisterPushToken', { token });
    },
    async signOut() {
      await authClient.signOut();
    },
  };
}
