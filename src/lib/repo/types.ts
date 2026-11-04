import type { Database } from '@/types/database';

type Tables = Database['public']['Tables'];

export type Profile = Tables['users']['Row'];
export type WinningDraw = Tables['winning_draws']['Row'];
export type Store = Tables['stores']['Row'];

/** tickets 행 (games 를 number[][] 로 좁힌 형태) */
export type Ticket = Omit<Tables['tickets']['Row'], 'games'> & { games: number[][] };

export interface DreamEntry {
  keyword: string;
  numbers: number[];
}

export interface NewTicket {
  round: number;
  purchase_date?: string;
  store_code?: string | null;
  store_name?: string | null;
  games: number[][];
  /** QR 원문 텍스트 (사진은 저장하지 않음) */
  qr_raw?: string | null;
}

export type ProfilePatch = Partial<Pick<Profile, 'birth_date'>>;
export type TicketPatch = Partial<
  Pick<Ticket, 'opened_at' | 'store_code' | 'store_name' | 'round' | 'games' | 'purchase_date'>
>;

export class DuplicateTicketError extends Error {
  constructor() {
    super('이미 등록된 티켓이에요');
    this.name = 'DuplicateTicketError';
  }
}

/** 데이터 접근 계층. Supabase 구현과 데모(localStorage) 구현이 같은 인터페이스를 가집니다. */
export interface Repo {
  readonly kind: 'supabase' | 'demo';
  /** 로그인하지 않았으면 null */
  getProfile(): Promise<Profile | null>;
  updateProfile(patch: ProfilePatch): Promise<Profile>;
  listTickets(): Promise<Ticket[]>;
  insertTicket(input: NewTicket): Promise<Ticket>;
  updateTicket(id: string, patch: TicketPatch): Promise<void>;
  deleteTicket(id: string): Promise<void>;
  /** rounds 를 주면 해당 회차만, 아니면 최신순 limit 개 */
  listDraws(opts?: { rounds?: number[]; limit?: number }): Promise<WinningDraw[]>;
  listDreamMap(): Promise<DreamEntry[]>;
  signOut(): Promise<void>;
}
